import { Button, CheckboxGroup, Input, NumberField, Select, Switch, cn, useTheme } from "@gemologic/sheen";
import { Index, Match, Show, Switch as MatchSwitch, createMemo, createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { parseFilter } from "./filter.ts";
import { resolveTableMessages } from "./messages.ts";
import type { TableMessages } from "./messages.ts";
import {
  appendQueryChild,
  defaultQueryRule,
  moveQueryNode,
  queryBuilderFilterColumns,
  removeQueryNode,
  replaceQueryNode,
  toggleQueryNegation,
} from "./query-builder-state.ts";
import type { QueryBuilderColumn, QueryBuilderPath } from "./query-builder-state.ts";

export interface QueryBuilderProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  readonly columns: readonly QueryBuilderColumn[];
  readonly value: FilterNode;
  readonly onChange: (filter: FilterNode) => void;
  readonly label?: string;
  readonly disabled?: boolean;
}

interface NodeEditorProps {
  readonly node: FilterNode;
  readonly path: QueryBuilderPath;
  readonly columns: readonly QueryBuilderColumn[];
  readonly schema: readonly FilterColumn[];
  readonly disabled: boolean;
  readonly structural: boolean;
  readonly index: number;
  readonly siblingCount: number;
  readonly messages: TableMessages;
  readonly publish: (filter: FilterNode, announcement: string) => void;
  readonly root: () => FilterNode;
}

type GroupNode = Extract<FilterNode, { readonly kind: "and" | "or" }>;
type NotNode = Extract<FilterNode, { readonly kind: "not" }>;
type RuleNode = Exclude<FilterNode, { readonly kind: "and" | "or" | "not" }>;
type NumberNode = Extract<FilterNode, { readonly kind: "number" }>;
type DateNode = Extract<FilterNode, { readonly kind: "date" }>;
type TextNode = Extract<FilterNode, { readonly kind: "text" }>;
type EnumNode = Extract<FilterNode, { readonly kind: "enum" }>;
type NumberRangeNode = Extract<NumberNode, { readonly operator: "between" }>;
type NumberScalarNode = Exclude<NumberNode, { readonly operator: "between" }>;
type DateRangeNode = Extract<DateNode, { readonly operator: "between" }>;
type DateScalarNode = Exclude<DateNode, { readonly operator: "between" }>;

function textNode(node: RuleNode): TextNode {
  if (node.kind !== "text") throw new Error("QueryBuilder expected a text rule");
  return node;
}

function numberNode(node: RuleNode): NumberNode {
  if (node.kind !== "number") throw new Error("QueryBuilder expected a number rule");
  return node;
}

function dateNode(node: RuleNode): DateNode {
  if (node.kind !== "date") throw new Error("QueryBuilder expected a date rule");
  return node;
}

function enumNode(node: RuleNode): EnumNode {
  if (node.kind !== "enum") throw new Error("QueryBuilder expected an enum rule");
  return node;
}

function numberRangeNode(node: NumberNode): NumberRangeNode {
  if (node.operator !== "between") throw new Error("QueryBuilder expected a number range");
  return node;
}

function numberScalarNode(node: NumberNode): NumberScalarNode {
  if (node.operator === "between") throw new Error("QueryBuilder expected a scalar number rule");
  return node;
}

function dateRangeNode(node: DateNode): DateRangeNode {
  if (node.operator !== "between") throw new Error("QueryBuilder expected a date range");
  return node;
}

function dateScalarNode(node: DateNode): DateScalarNode {
  if (node.operator === "between") throw new Error("QueryBuilder expected a scalar date rule");
  return node;
}

function groupNode(node: FilterNode): GroupNode {
  if (node.kind !== "and" && node.kind !== "or") throw new Error("QueryBuilder expected a group");
  return node;
}

function notNode(node: FilterNode): NotNode {
  if (node.kind !== "not") throw new Error("QueryBuilder expected a negated rule");
  return node;
}

function ruleNode(node: FilterNode): RuleNode {
  if (node.kind === "and" || node.kind === "or" || node.kind === "not") throw new Error("QueryBuilder expected a rule");
  return node;
}

function pathKey(path: QueryBuilderPath): string {
  return path.length === 0 ? "root" : path.join("-");
}

function dateInputValue(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDateInput(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && dateInputValue(timestamp) === value ? timestamp : undefined;
}

function columnById(columns: readonly QueryBuilderColumn[], id: string): QueryBuilderColumn {
  const column = columns.find(candidate => candidate.id === id);
  if (!column) throw new Error(`QueryBuilder cannot edit missing column ${JSON.stringify(id)}`);
  return column;
}

function enumOptions(column: QueryBuilderColumn): readonly { readonly value: string; readonly label: string }[] {
  return column.type === "enum" ? column.options.map(value => ({ value, label: value })) : [];
}

function operatorOptions(column: QueryBuilderColumn, messages: TableMessages): readonly { readonly value: string; readonly label: string }[] {
  if (column.type === "text") return [
    { value: "contains", label: messages.filterContains }, { value: "eq", label: messages.filterEquals },
    { value: "startsWith", label: messages.filterStartsWith }, { value: "endsWith", label: messages.filterEndsWith },
    { value: "empty", label: messages.filterIsEmpty },
  ];
  if (column.type === "enum") return [{ value: "in", label: messages.filterIsAnyOf }, { value: "empty", label: messages.filterIsEmpty }];
  return [
    { value: "eq", label: messages.filterEquals }, { value: "lt", label: messages.filterLessThan },
    { value: "lte", label: messages.filterAtMost }, { value: "gt", label: messages.filterGreaterThan },
    { value: "gte", label: messages.filterAtLeast }, { value: "between", label: messages.filterBetween },
    { value: "empty", label: messages.filterIsEmpty },
  ];
}

function operator(node: FilterNode): string {
  if (node.kind === "and" || node.kind === "or" || node.kind === "not") return "";
  return node.kind === "empty" ? "empty" : node.operator;
}

function changeOperator(node: FilterNode, column: QueryBuilderColumn, next: string): FilterNode {
  if (next === "empty") return Object.freeze({ kind: "empty", column: column.id });
  if (column.type === "text" && (next === "eq" || next === "contains" || next === "startsWith" || next === "endsWith")) {
    return Object.freeze({ kind: "text", column: column.id, operator: next, value: node.kind === "text" ? node.value : "", caseSensitive: node.kind === "text" && node.caseSensitive });
  }
  if ((column.type === "number" || column.type === "date") && (next === "eq" || next === "lt" || next === "lte" || next === "gt" || next === "gte" || next === "between")) {
    const fallback = defaultQueryRule(column);
    const initial = node.kind === column.type ? (node.operator === "between" ? node.min : node.value)
      : fallback.kind === column.type && fallback.operator !== "between" ? fallback.value : 0;
    return next === "between" ? Object.freeze({ kind: column.type, column: column.id, operator: "between", min: initial, max: initial })
      : Object.freeze({ kind: column.type, column: column.id, operator: next, value: initial });
  }
  if (column.type === "enum" && next === "in") {
    const fallback = defaultQueryRule(column);
    const values = node.kind === "enum" ? node.values : fallback.kind === "enum" ? fallback.values : [];
    return Object.freeze({ kind: "enum", column: column.id, operator: "in", values });
  }
  throw new Error(`QueryBuilder operator ${JSON.stringify(next)} is not valid for ${column.type}`);
}

function StructuralActions(props: NodeEditorProps): JSX.Element {
  if (!props.structural) return null;
  const update = (next: FilterNode, announcement: string): void => props.publish(next, announcement);
  return <div class="sheen-query-node-actions">
    <Button size="xs" aria-label={props.messages.queryMoveBefore} disabled={props.disabled || props.index === 0}
      onClick={() => update(moveQueryNode(props.root(), props.path, -1, props.schema), props.messages.queryChanged)}>{props.messages.queryMoveBefore}</Button>
    <Button size="xs" aria-label={props.messages.queryMoveAfter} disabled={props.disabled || props.index >= props.siblingCount - 1}
      onClick={() => update(moveQueryNode(props.root(), props.path, 1, props.schema), props.messages.queryChanged)}>{props.messages.queryMoveAfter}</Button>
    <Button size="xs" disabled={props.disabled} onClick={() => update(toggleQueryNegation(props.root(), props.path, props.schema), props.messages.queryChanged)}>{props.messages.queryNegate}</Button>
    <Button size="xs" tone="danger" disabled={props.disabled} onClick={() => update(removeQueryNode(props.root(), props.path, props.schema), props.messages.queryChanged)}>{props.messages.queryRemove}</Button>
  </div>;
}

function GroupEditor(props: NodeEditorProps & { readonly node: GroupNode }): JSX.Element {
  const replace = (node: FilterNode): void => props.publish(replaceQueryNode(props.root(), props.path, node, props.schema), props.messages.queryChanged);
  const addRule = (): void => {
    const first = props.columns[0];
    if (!first) return;
    props.publish(appendQueryChild(props.root(), props.path, defaultQueryRule(first), props.schema), props.messages.queryChanged);
  };
  const addGroup = (): void => props.publish(appendQueryChild(props.root(), props.path, Object.freeze({ kind: "and", children: Object.freeze([]) }), props.schema), props.messages.queryChanged);
  return <fieldset class="sheen-query-group" data-query-path={pathKey(props.path)}>
    <legend>{props.messages.queryGroup}</legend>
    <div class="sheen-query-group-toolbar">
      <Select label={props.messages.queryMatch} value={props.node.kind} disabled={props.disabled} options={[
        { value: "and", label: props.messages.queryMatchAll }, { value: "or", label: props.messages.queryMatchAny },
      ]} onValueChange={value => {
        if (value === "and" || value === "or") replace(Object.freeze({ kind: value, children: props.node.children }));
      }} />
      <Button size="sm" disabled={props.disabled || props.columns.length === 0} onClick={addRule}>{props.messages.queryAddRule}</Button>
      <Button size="sm" disabled={props.disabled} onClick={addGroup}>{props.messages.queryAddGroup}</Button>
      <StructuralActions {...props} />
    </div>
    <Show when={props.node.children.length > 0} fallback={<p class="sheen-query-empty">{props.messages.noResults}</p>}>
      <ol class="sheen-query-children"><Index each={props.node.children}>{(child, index) => <li>
        <QueryNodeEditor {...props} node={child()} path={[...props.path, index]} structural index={index} siblingCount={props.node.children.length} />
      </li>}</Index></ol>
    </Show>
  </fieldset>;
}

function RuleEditor(props: NodeEditorProps & { readonly node: RuleNode }): JSX.Element {
  const column = createMemo(() => columnById(props.columns, props.node.column));
  const replace = (node: FilterNode): void => props.publish(replaceQueryNode(props.root(), props.path, node, props.schema), props.messages.queryChanged);
  const setOperator = (value: string | null): void => { if (value) replace(changeOperator(props.node, column(), value)); };
  return <div class="sheen-query-rule" role="group" aria-label={`${props.messages.queryRule}: ${column().label}`} data-query-path={pathKey(props.path)}>
    <div class="sheen-query-rule-fields">
      <Select label={props.messages.queryColumn} value={column().id} disabled={props.disabled} options={props.columns.map(item => ({ value: item.id, label: item.label }))}
        onValueChange={value => { const next = props.columns.find(item => item.id === value); if (next) replace(defaultQueryRule(next)); }} />
      <Select label={props.messages.filterOperator} value={operator(props.node)} disabled={props.disabled} options={operatorOptions(column(), props.messages)} onValueChange={setOperator} />
      <MatchSwitch>
        <Match when={props.node.kind === "text"}><Input label={props.messages.filterValue} value={textNode(props.node).value} disabled={props.disabled} onInput={event => replace(Object.freeze({ ...textNode(props.node), value: event.currentTarget.value }))} />
          <Switch label={props.messages.filterCaseSensitive} checked={textNode(props.node).caseSensitive} disabled={props.disabled} onCheckedChange={caseSensitive => replace(Object.freeze({ ...textNode(props.node), caseSensitive }))} /></Match>
        <Match when={props.node.kind === "number"}><MatchSwitch>
          <Match when={numberNode(props.node).operator === "between"}><NumberField label={props.messages.filterMinimum} value={numberRangeNode(numberNode(props.node)).min} disabled={props.disabled} onValueChange={min => { const current = numberRangeNode(numberNode(props.node)); if (min !== null && min <= current.max) replace(Object.freeze({ ...current, min })); }} />
            <NumberField label={props.messages.filterMaximum} value={numberRangeNode(numberNode(props.node)).max} disabled={props.disabled} onValueChange={max => { const current = numberRangeNode(numberNode(props.node)); if (max !== null && max >= current.min) replace(Object.freeze({ ...current, max })); }} /></Match>
          <Match when={numberNode(props.node).operator !== "between"}><NumberField label={props.messages.filterValue} value={numberScalarNode(numberNode(props.node)).value} disabled={props.disabled} onValueChange={value => { if (value !== null) replace(Object.freeze({ ...numberScalarNode(numberNode(props.node)), value })); }} /></Match>
        </MatchSwitch></Match>
        <Match when={props.node.kind === "date"}><MatchSwitch>
          <Match when={dateNode(props.node).operator === "between"}><Input type="date" label={props.messages.filterStartDate} value={dateInputValue(dateRangeNode(dateNode(props.node)).min)} disabled={props.disabled} onInput={event => { const current = dateRangeNode(dateNode(props.node)); const min = parseDateInput(event.currentTarget.value); if (min !== undefined && min <= current.max) replace(Object.freeze({ ...current, min })); }} />
            <Input type="date" label={props.messages.filterEndDate} value={dateInputValue(dateRangeNode(dateNode(props.node)).max)} disabled={props.disabled} onInput={event => { const current = dateRangeNode(dateNode(props.node)); const max = parseDateInput(event.currentTarget.value); if (max !== undefined && max >= current.min) replace(Object.freeze({ ...current, max })); }} /></Match>
          <Match when={dateNode(props.node).operator !== "between"}><Input type="date" label={props.messages.filterDate} value={dateInputValue(dateScalarNode(dateNode(props.node)).value)} disabled={props.disabled} onInput={event => { const value = parseDateInput(event.currentTarget.value); if (value !== undefined) replace(Object.freeze({ ...dateScalarNode(dateNode(props.node)), value })); }} /></Match>
        </MatchSwitch></Match>
        <Match when={props.node.kind === "enum"}><CheckboxGroup label={props.messages.filterValues} value={enumNode(props.node).values} disabled={props.disabled} options={enumOptions(column())}
          onValueChange={values => { if (values.length > 0) replace(Object.freeze({ ...enumNode(props.node), values: Object.freeze([...values]) })); }} /></Match>
      </MatchSwitch>
    </div>
    <StructuralActions {...props} />
  </div>;
}

function QueryNodeEditor(props: NodeEditorProps): JSX.Element {
  return <MatchSwitch>
    <Match when={props.node.kind === "not"}><section class="sheen-query-not" aria-label={props.messages.queryNegate} data-query-path={pathKey(props.path)}>
      <div class="sheen-query-not-toolbar"><strong>{props.messages.queryNegate}</strong>
        <Button size="xs" disabled={props.disabled} onClick={() => props.publish(toggleQueryNegation(props.root(), props.path, props.schema), props.messages.queryChanged)}>{props.messages.queryRemoveNegation}</Button>
        <StructuralActions {...props} />
      </div>
      <QueryNodeEditor {...props} node={notNode(props.node).child} path={[...props.path, 0]} structural={false} index={0} siblingCount={1} />
    </section></Match>
    <Match when={props.node.kind === "and" || props.node.kind === "or"}><GroupEditor {...props} node={groupNode(props.node)} /></Match>
    <Match when={props.node.kind !== "and" && props.node.kind !== "or" && props.node.kind !== "not"}><RuleEditor {...props} node={ruleNode(props.node)} /></Match>
  </MatchSwitch>;
}

export function QueryBuilder(props: QueryBuilderProps): JSX.Element {
  const [local, rest] = splitProps(props, ["columns", "value", "onChange", "label", "disabled", "class", "ref"]);
  const theme = useTheme();
  const [announcement, setAnnouncement] = createSignal("");
  const messages = createMemo(() => resolveTableMessages(theme.messages()));
  const schema = createMemo(() => queryBuilderFilterColumns(local.columns));
  const value = createMemo(() => parseFilter(local.value, schema()));
  const publish = (filter: FilterNode, message: string): void => {
    local.onChange(parseFilter(filter, schema()));
    setAnnouncement("");
    queueMicrotask(() => setAnnouncement(message));
  };
  return <section {...rest} ref={local.ref} class={cn("sheen-query-builder", local.class)} aria-label={local.label ?? messages().queryBuilder} data-disabled={local.disabled || undefined}>
    <QueryNodeEditor node={value()} path={[]} columns={local.columns} schema={schema()} disabled={local.disabled ?? false} structural={false} index={0} siblingCount={1}
      messages={messages()} publish={publish} root={value} />
    <div class="sheen-query-announcement" role="status" aria-live="polite">{announcement()}</div>
  </section>;
}
