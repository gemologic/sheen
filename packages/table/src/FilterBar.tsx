import { Button, Checkbox, CheckboxGroup, Input, Popover, Select, cn, useTheme } from "@gemologic/sheen";
import { For, Show, createEffect, createMemo, createSignal, untrack } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { readColumnDefinitions } from "./columns.ts";
import type { ColumnFilter, SheenColumns } from "./columns.ts";
import { parseFilter } from "./filter.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { appendFilterCondition, listFilterConditions, removeFilterCondition, replaceFilterCondition } from "./filter-bar-state.ts";
import type { FilterCondition, FilterConditionEntry } from "./filter-bar-state.ts";
import { resolveTableMessages } from "./messages.ts";
import type { TableMessages } from "./messages.ts";

export interface FilterBarProps<Row extends object> {
  readonly columns: SheenColumns<Row>;
  readonly value: FilterNode;
  readonly onChange: (filter: FilterNode) => void;
  readonly facets?: Readonly<Record<string, Readonly<Record<string, number>>>> | undefined;
  readonly disabled?: boolean;
  readonly class?: string;
  /** Optional package-isolated date selector. The native date fields remain the no-dependency fallback. */
  readonly dateEditor?: FilterDateEditor;
}

export interface FilterDateEditorProps {
  readonly mode: "single" | "range";
  readonly label: string;
  readonly endLabel: string;
  readonly value: string;
  readonly endValue: string;
  readonly onValueChange: (value: string, endValue: string) => void;
  readonly disabled: boolean;
}

export type FilterDateEditor = (props: FilterDateEditorProps) => JSX.Element;

interface FilterDefinition {
  readonly id: string;
  readonly header: string;
  readonly filter: ColumnFilter;
}

interface EntryRecord {
  readonly key: string;
  readonly entry: Accessor<FilterConditionEntry>;
  readonly update: (entry: FilterConditionEntry) => void;
}

function entrySignature(entry: FilterConditionEntry): string {
  return JSON.stringify({ condition: entry.condition, directNegated: entry.directNegated, inheritedNegated: entry.inheritedNegated, groups: entry.groups });
}

function entryPath(entry: FilterConditionEntry): string {
  return `${entry.condition.column}\u0000${JSON.stringify(entry.path)}`;
}

function addRecord(bucket: Map<string, EntryRecord[]>, key: string, record: EntryRecord): void {
  const records = bucket.get(key);
  if (records) records.push(record);
  else bucket.set(key, [record]);
}

function takeRecord(bucket: Map<string, EntryRecord[]>, key: string, available: Set<EntryRecord>): EntryRecord | undefined {
  const records = bucket.get(key);
  while (records?.length) {
    const record = records.shift();
    if (record && available.has(record)) return record;
  }
  return undefined;
}

type NumericOperator = "eq" | "lt" | "lte" | "gt" | "gte" | "between";
type TextOperator = "eq" | "contains" | "startsWith" | "endsWith";

function numericOperator(value: string): value is NumericOperator {
  return value === "eq" || value === "lt" || value === "lte" || value === "gt" || value === "gte" || value === "between";
}

function textOperator(value: string): value is TextOperator {
  return value === "eq" || value === "contains" || value === "startsWith" || value === "endsWith";
}

function dateInputValue(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseDateInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && dateInputValue(timestamp) === value ? timestamp : null;
}

function startValue(condition: FilterCondition): string {
  if (condition.kind === "number") return String(condition.operator === "between" ? condition.min : condition.value);
  if (condition.kind === "date") return dateInputValue(condition.operator === "between" ? condition.min : condition.value);
  return "";
}

function endValue(condition: FilterCondition): string {
  if (condition.kind === "number") return condition.operator === "between" ? String(condition.max) : "";
  if (condition.kind === "date") return condition.operator === "between" ? dateInputValue(condition.max) : "";
  return "";
}

function initialOperator(condition: FilterCondition): string {
  return condition.kind === "empty" ? "empty" : condition.operator;
}

function schemaColumn(definition: FilterDefinition): FilterColumn {
  return definition.filter.type === "enum"
    ? Object.freeze({ id: definition.id, type: "enum", options: definition.filter.options })
    : Object.freeze({ id: definition.id, type: definition.filter.type });
}

function FilterEditor(props: {
  readonly definition: FilterDefinition;
  readonly condition: FilterCondition;
  readonly initialOperator?: string | undefined;
  readonly directNegated: boolean;
  readonly inheritedNegated: boolean;
  readonly facets?: Readonly<Record<string, number>> | undefined;
  readonly disabled?: boolean | undefined;
  readonly onApply: (condition: FilterCondition, negated: boolean) => void;
  readonly dateEditor?: FilterDateEditor | undefined;
}): JSX.Element {
  const theme = useTheme();
  const messages = createMemo(() => resolveTableMessages(theme.messages()));
  const [operator, setOperator] = createSignal(props.initialOperator ?? initialOperator(props.condition));
  const [text, setText] = createSignal(props.condition.kind === "text" ? props.condition.value : "");
  const [start, setStart] = createSignal(startValue(props.condition));
  const [end, setEnd] = createSignal(endValue(props.condition));
  const [values, setValues] = createSignal<readonly string[]>(props.condition.kind === "enum" ? props.condition.values : []);
  const [caseSensitive, setCaseSensitive] = createSignal(props.condition.kind === "text" && props.condition.caseSensitive);
  const [negated, setNegated] = createSignal(props.directNegated);
  const [error, setError] = createSignal<string | null>(null);
  const numberFormatter = createMemo(() => new Intl.NumberFormat(theme.state().locale));

  function buildCondition(): FilterCondition | null {
    const currentOperator = operator();
    if (currentOperator === "empty") return Object.freeze({ kind: "empty", column: props.definition.id });
    if (props.definition.filter.type === "text") {
      if (!textOperator(currentOperator)) return null;
      return Object.freeze({ kind: "text", column: props.definition.id, operator: currentOperator, value: text(), caseSensitive: caseSensitive() });
    }
    if (props.definition.filter.type === "enum") {
      if (currentOperator !== "in" || values().length === 0) return null;
      return Object.freeze({ kind: "enum", column: props.definition.id, operator: "in", values: Object.freeze([...values()]) });
    }
    if (!numericOperator(currentOperator) || !start().trim()) return null;
    if (props.definition.filter.type === "number") {
      const first = Number(start());
      if (!Number.isFinite(first)) return null;
      if (currentOperator !== "between") return Object.freeze({ kind: "number", column: props.definition.id, operator: currentOperator, value: first });
      if (!end().trim()) return null;
      const last = Number(end());
      if (!Number.isFinite(last) || first > last) return null;
      return Object.freeze({ kind: "number", column: props.definition.id, operator: "between", min: first, max: last });
    }
    const first = parseDateInput(start());
    if (first === null) return null;
    if (currentOperator !== "between") return Object.freeze({ kind: "date", column: props.definition.id, operator: currentOperator, value: first });
    const finalDay = parseDateInput(end());
    if (finalDay === null) return null;
    const last = finalDay + 86_400_000 - 1;
    if (!Number.isFinite(last) || first > last) return null;
    return Object.freeze({ kind: "date", column: props.definition.id, operator: "between", min: first, max: last });
  }

  const textOperators = () => [
    { value: "contains", label: messages().filterContains },
    { value: "eq", label: messages().filterEquals },
    { value: "startsWith", label: messages().filterStartsWith },
    { value: "endsWith", label: messages().filterEndsWith },
    { value: "empty", label: messages().filterIsEmpty },
  ];
  const scalarOperators = () => [
    { value: "eq", label: messages().filterEquals },
    { value: "lt", label: messages().filterLessThan },
    { value: "lte", label: messages().filterAtMost },
    { value: "gt", label: messages().filterGreaterThan },
    { value: "gte", label: messages().filterAtLeast },
    { value: "between", label: messages().filterBetween },
    { value: "empty", label: messages().filterIsEmpty },
  ];
  const enumOperators = () => [
    { value: "in", label: messages().filterIsAnyOf },
    { value: "empty", label: messages().filterIsEmpty },
  ];
  const options = () => props.definition.filter.type === "text" ? textOperators() : props.definition.filter.type === "enum" ? enumOperators() : scalarOperators();
  const enumOptions = () => props.definition.filter.type === "enum" ? props.definition.filter.options.map(value => {
    const count = props.facets?.[value];
    return { value, label: count === undefined ? value : `${value} (${numberFormatter().format(count)})` };
  }) : [];

  function apply(event: SubmitEvent): void {
    event.preventDefault();
    if (props.disabled) return;
    const condition = buildCondition();
    if (!condition) {
      setError(messages().filterInvalid);
      return;
    }
    setError(null);
    props.onApply(condition, negated());
  }

  return <form class="sheen-filter-editor-form" onSubmit={apply}>
    <Select label={messages().filterOperator} options={options()} value={operator()} onValueChange={value => { if (value) { setOperator(value); setError(null); } }} disabled={props.disabled ?? false} />
    <Show when={operator() !== "empty" && props.definition.filter.type === "text"}>
      <Input label={messages().filterValue} value={text()} onInput={event => setText(event.currentTarget.value)} disabled={props.disabled ?? false} />
      <Checkbox label={messages().filterCaseSensitive} checked={caseSensitive()} onCheckedChange={setCaseSensitive} disabled={props.disabled ?? false} />
    </Show>
    <Show when={operator() !== "empty" && props.definition.filter.type === "number"}>
      <Input type="number" inputMode="decimal" label={operator() === "between" ? messages().filterMinimum : messages().filterValue} value={start()} onInput={event => setStart(event.currentTarget.value)} disabled={props.disabled ?? false} />
      <Show when={operator() === "between"}><Input type="number" inputMode="decimal" label={messages().filterMaximum} value={end()} onInput={event => setEnd(event.currentTarget.value)} disabled={props.disabled ?? false} /></Show>
    </Show>
    <Show when={operator() !== "empty" && props.definition.filter.type === "date"}>
      <Show when={props.dateEditor} fallback={<>
        <Input type="date" label={operator() === "between" ? messages().filterStartDate : messages().filterDate} value={start()} onInput={event => setStart(event.currentTarget.value)} disabled={props.disabled ?? false} />
        <Show when={operator() === "between"}><Input type="date" label={messages().filterEndDate} value={end()} onInput={event => setEnd(event.currentTarget.value)} disabled={props.disabled ?? false} /></Show>
      </>}>{editor => <Dynamic component={editor()} mode={operator() === "between" ? "range" : "single"}
        label={operator() === "between" ? messages().filterStartDate : messages().filterDate} endLabel={messages().filterEndDate}
        value={start()} endValue={end()} disabled={props.disabled ?? false}
        onValueChange={(value, endValue) => { setStart(value); setEnd(endValue); setError(null); }} />}</Show>
    </Show>
    <Show when={operator() === "in" && props.definition.filter.type === "enum"}>
      <CheckboxGroup label={messages().filterValues} options={enumOptions()} value={values()} onValueChange={setValues} disabled={props.disabled ?? false} />
    </Show>
    <Checkbox label={messages().filterNegated} {...(props.inheritedNegated ? { description: messages().filterInheritedNegation } : {})} checked={negated()} onCheckedChange={setNegated} disabled={props.disabled ?? false} />
    <Show when={error()}>{message => <p class="sheen-filter-error" role="alert">{message()}</p>}</Show>
    <Button type="submit" disabled={props.disabled}>{messages().filterApply}</Button>
  </form>;
}

function operatorLabel(operator: string, messages: TableMessages): string {
  if (operator === "empty") return messages.filterIsEmpty;
  if (operator === "eq") return messages.filterEquals;
  if (operator === "contains") return messages.filterContains;
  if (operator === "startsWith") return messages.filterStartsWith;
  if (operator === "endsWith") return messages.filterEndsWith;
  if (operator === "lt") return messages.filterLessThan;
  if (operator === "lte") return messages.filterAtMost;
  if (operator === "gt") return messages.filterGreaterThan;
  if (operator === "gte") return messages.filterAtLeast;
  if (operator === "between") return messages.filterBetween;
  return messages.filterIsAnyOf;
}

function newConditionOperator(definition: FilterDefinition): string {
  if (definition.filter.type === "text") return "contains";
  if (definition.filter.type === "enum") return "in";
  if (definition.filter.type === "date") return "between";
  return "eq";
}

function conditionSummary(entry: FilterConditionEntry, definition: FilterDefinition, locale: string, messages: TableMessages): string {
  const condition = entry.condition;
  let value = "";
  if (condition.kind === "text") value = condition.value;
  else if (condition.kind === "number") {
    const format = new Intl.NumberFormat(locale);
    value = condition.operator === "between" ? `${format.format(condition.min)}–${format.format(condition.max)}` : format.format(condition.value);
  } else if (condition.kind === "date") {
    const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
    value = condition.operator === "between" ? `${format.format(condition.min)}–${format.format(condition.max)}` : format.format(condition.value);
  } else if (condition.kind === "enum") value = new Intl.ListFormat(locale, { style: "short", type: "disjunction" }).format(condition.values);
  const operator = operatorLabel(condition.kind === "empty" ? "empty" : condition.operator, messages);
  const summary = messages.filterSummary.replace("{column}", definition.header).replace("{operator}", operator).replace("{value}", value).trim();
  const directly = entry.directNegated ? messages.filterNot.replace("{filter}", summary) : summary;
  return entry.inheritedNegated ? messages.filterInheritedNot.replace("{filter}", directly) : directly;
}

function ConditionChip(props: {
  readonly record: EntryRecord;
  readonly definition: () => FilterDefinition;
  readonly facets?: Readonly<Record<string, Readonly<Record<string, number>>>> | undefined;
  readonly disabled?: boolean | undefined;
  readonly onApply: (key: string, entry: FilterConditionEntry, condition: FilterCondition, negated: boolean) => void;
  readonly onRemove: (key: string, entry: FilterConditionEntry) => void;
  readonly removeRef: (key: string, element: HTMLButtonElement) => void;
  readonly dateEditor?: FilterDateEditor | undefined;
}): JSX.Element {
  const theme = useTheme();
  const messages = createMemo(() => resolveTableMessages(theme.messages()));
  const [open, setOpen] = createSignal(false);
  const summary = createMemo(() => conditionSummary(props.record.entry(), props.definition(), theme.state().locale, messages()));
  return <li class="sheen-filter-chip" data-disabled={props.disabled || undefined}>
    <Popover trigger={summary()} title={`${messages().filterEdit}: ${props.definition().header}`} open={open()} onOpenChange={setOpen} class="sheen-filter-editor">
      <Show when={open()}><FilterEditor definition={props.definition()} condition={props.record.entry().condition} directNegated={props.record.entry().directNegated}
        inheritedNegated={props.record.entry().inheritedNegated} facets={props.facets?.[props.definition().id]} disabled={props.disabled}
        dateEditor={props.dateEditor}
        onApply={(condition, negated) => { setOpen(false); props.onApply(props.record.key, props.record.entry(), condition, negated); }} /></Show>
    </Popover>
    <button ref={element => props.removeRef(props.record.key, element)} type="button" class="sheen-filter-remove" disabled={props.disabled}
      aria-label={`${messages().filterRemove}: ${summary()}`} onClick={() => props.onRemove(props.record.key, props.record.entry())}><span aria-hidden="true">×</span></button>
  </li>;
}

export function FilterBar<Row extends object>(props: FilterBarProps<Row>): JSX.Element {
  const theme = useTheme();
  const messages = createMemo(() => resolveTableMessages(theme.messages()));
  const definitions = readColumnDefinitions(props.columns).flatMap((column): readonly FilterDefinition[] => column.filter ? [Object.freeze({ id: column.id, header: column.header, filter: column.filter })] : []);
  if (definitions.length === 0) throw new Error("FilterBar requires at least one filterable column");
  const filterColumns = Object.freeze(definitions.map(schemaColumn));
  const definitionById = new Map(definitions.map(definition => [definition.id, definition]));
  const accepted = createMemo(() => parseFilter(props.value, filterColumns));
  let sequence = 0;
  function createEntryRecord(entry: FilterConditionEntry): EntryRecord {
    const [current, update] = createSignal(entry);
    return Object.freeze({ key: `filter-${++sequence}`, entry: current, update });
  }
  const [entries, setEntries] = createSignal<readonly EntryRecord[]>(Object.freeze(listFilterConditions(accepted()).map(createEntryRecord)), { equals: false });
  createEffect(() => {
    const nextEntries = listFilterConditions(accepted());
    const previous = untrack(entries);
    const available = new Set(previous);
    const exactRecords = new Map<string, EntryRecord[]>();
    const pathRecords = new Map<string, EntryRecord[]>();
    for (const record of previous) untrack(() => {
      addRecord(exactRecords, entrySignature(record.entry()), record);
      addRecord(pathRecords, entryPath(record.entry()), record);
    });
    const next = nextEntries.map(entry => {
      const existing = takeRecord(exactRecords, entrySignature(entry), available) ?? takeRecord(pathRecords, entryPath(entry), available);
      if (!existing) return createEntryRecord(entry);
      available.delete(existing);
      existing.update(entry);
      return existing;
    });
    setEntries(Object.freeze(next));
  });
  const [addOpen, setAddOpen] = createSignal(false);
  const [selectedColumn, setSelectedColumn] = createSignal<string | null>(null);
  const [search, setSearch] = createSignal("");
  let root: HTMLDivElement | undefined;
  let addRoot: HTMLDivElement | undefined;

  const visibleColumns = createMemo(() => {
    const query = search().trim().toLocaleLowerCase(theme.state().locale);
    return query ? definitions.filter(definition => `${definition.header} ${definition.id}`.toLocaleLowerCase(theme.state().locale).includes(query)) : definitions;
  });

  function publish(filter: FilterNode): void {
    if (props.disabled) return;
    props.onChange(parseFilter(filter, filterColumns));
  }

  function updateCondition(key: string, entry: FilterConditionEntry, condition: FilterCondition, negated: boolean): void {
    if (!entries().some(candidate => candidate.key === key)) return;
    publish(replaceFilterCondition(accepted(), entry.path, condition, negated));
  }

  function removeCondition(key: string, entry: FilterConditionEntry): void {
    const keys = entries().map(record => record.key);
    const index = keys.indexOf(key);
    const targetKey = keys[index + 1] ?? keys[index - 1];
    publish(removeFilterCondition(accepted(), entry.path));
    const view = root?.ownerDocument.defaultView;
    view?.requestAnimationFrame(() => view.requestAnimationFrame(() => {
      const target = targetKey
        ? [...root?.querySelectorAll<HTMLButtonElement>("button[data-filter-key]") ?? []].find(element => element.dataset.filterKey === targetKey)
        : addRoot?.querySelector<HTMLButtonElement>("button");
      if (target?.isConnected) target.focus({ preventScroll: true });
    }));
  }

  const chosen = () => definitionById.get(selectedColumn() ?? "");
  function resetPicker(): void { setSelectedColumn(null); setSearch(""); }
  function changeAddOpen(open: boolean): void { setAddOpen(open); if (!open) resetPicker(); }

  return <div ref={root} class={cn("sheen-filter-bar", props.class)} aria-label={messages().filters} data-disabled={props.disabled || undefined}>
    <ul class="sheen-filter-list"><For each={entries()}>{record => {
      const definition = () => {
        const value = definitionById.get(record.entry().condition.column);
        if (!value) throw new Error(`Missing filter definition for ${record.entry().condition.column}`);
        return value;
      };
      return <ConditionChip record={record} definition={definition} facets={props.facets} disabled={props.disabled} dateEditor={props.dateEditor} onApply={updateCondition} onRemove={removeCondition}
        removeRef={(key, element) => { element.dataset.filterKey = key; }} />;
    }}</For></ul>
    <div ref={addRoot} class="sheen-filter-add">
      <Popover trigger={messages().filterAdd} title={chosen() ? `${messages().filterAdd}: ${chosen()?.header}` : messages().filterColumns}
        open={addOpen()} onOpenChange={changeAddOpen} class="sheen-filter-picker">
        <Show when={chosen()} fallback={<>
          <Input type="search" label={messages().filterSearchColumns} value={search()} onInput={event => setSearch(event.currentTarget.value)} disabled={props.disabled} />
          <ul class="sheen-filter-column-list"><For each={visibleColumns()}>{definition => <li><Button variant="ghost" disabled={props.disabled} onClick={() => setSelectedColumn(definition.id)}>{definition.header}</Button></li>}</For></ul>
          <Show when={visibleColumns().length === 0}><p>{messages().noResults}</p></Show>
        </>}>{definition => <FilterEditor definition={definition()} condition={Object.freeze({ kind: "empty", column: definition().id })} initialOperator={newConditionOperator(definition())} directNegated={false}
          inheritedNegated={false} facets={props.facets?.[definition().id]} disabled={props.disabled} dateEditor={props.dateEditor} onApply={(condition, negated) => {
            changeAddOpen(false);
            publish(appendFilterCondition(accepted(), condition, negated));
          }} />}</Show>
      </Popover>
    </div>
  </div>;
}
