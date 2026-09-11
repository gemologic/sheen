import { createContext, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps, useContext } from "solid-js";
import type { Accessor, JSX, Setter } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export type TreeSelectionMode = "none" | "single" | "multiple";

export interface TreeProps extends Omit<JSX.HTMLAttributes<HTMLUListElement>, "aria-label" | "onChange" | "onKeyDown" | "onSelect" | "onSelectionChange"> {
  label: string;
  selectionMode?: TreeSelectionMode;
  selectedValues?: readonly string[];
  defaultSelectedValues?: readonly string[];
  onSelectionChange?: (values: readonly string[]) => void;
  expandedValues?: readonly string[];
  defaultExpandedValues?: readonly string[];
  onExpandedChange?: (values: readonly string[]) => void;
  onActivate?: (value: string) => void;
}

export interface TreeItemProps extends Omit<JSX.LiHTMLAttributes<HTMLLIElement>, "children" | "onClick" | "onDblClick" | "onKeyDown" | "onSelect" | "value"> {
  value: string;
  label: string;
  disabled?: boolean;
  children?: JSX.Element;
}

interface TreeRecord {
  readonly branch: boolean;
  readonly disabled: Accessor<boolean>;
}

interface TreeContextValue {
  readonly selectionMode: Accessor<TreeSelectionMode>;
  readonly selected: Accessor<ReadonlySet<string>>;
  readonly expanded: Accessor<ReadonlySet<string>>;
  readonly focused: Accessor<string>;
  readonly setFocused: Setter<string>;
  readonly register: (value: string, record: TreeRecord) => void;
  readonly unregister: (value: string) => void;
  readonly select: (value: string) => void;
  readonly toggleExpanded: (value: string) => void;
  readonly expand: (values: readonly string[]) => void;
  readonly activate: (value: string) => void;
}

const TreeContext = createContext<TreeContextValue>();

function validateValues(name: string, values: readonly string[]): readonly string[] {
  if (values.some(value => !value.trim())) throw new Error(`Tree ${name} values must be nonempty`);
  if (new Set(values).size !== values.length) throw new Error(`Tree ${name} values must be unique`);
  return values;
}

function visibleItems(root: HTMLUListElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')].filter(item =>
    item.closest('[role="tree"]') === root && item.closest("[hidden], [inert]") === null
  );
}

function directGroup(item: HTMLElement): HTMLElement | undefined {
  const group = [...item.children].find(child => child.getAttribute("role") === "group");
  return group instanceof HTMLElement ? group : undefined;
}

function itemValue(item: HTMLElement): string {
  const value = item.dataset.sheenTreeValue;
  if (value === undefined) throw new Error("Sheen Tree encountered an item without an identity");
  return value;
}

/** A hierarchical, explicitly selected treeview with roving focus and retained subtrees. */
export function Tree(props: TreeProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "selectionMode", "selectedValues", "defaultSelectedValues", "onSelectionChange", "expandedValues", "defaultExpandedValues", "onExpandedChange", "onActivate", "class", "ref", "children"]);
  const records = new Map<string, TreeRecord>();
  const theme = useTheme();
  const [selectedDraft, setSelectedDraft] = createSignal<readonly string[]>([...(local.defaultSelectedValues ?? [])]);
  const [expandedDraft, setExpandedDraft] = createSignal<readonly string[]>([...(local.defaultExpandedValues ?? [])]);
  const [focused, setFocused] = createSignal("");
  const mode = (): TreeSelectionMode => local.selectionMode ?? "single";
  const selectedValues = createMemo(() => {
    const values = validateValues("selected", local.selectedValues ?? selectedDraft());
    if (mode() === "none" && values.length) throw new Error("Tree selectionMode none cannot contain selected values");
    if (mode() === "single" && values.length > 1) throw new Error("Tree single selection accepts at most one value");
    return values;
  });
  const expandedValues = createMemo(() => validateValues("expanded", local.expandedValues ?? expandedDraft()));
  const selected = createMemo<ReadonlySet<string>>(() => new Set(selectedValues()));
  const expanded = createMemo<ReadonlySet<string>>(() => new Set(expandedValues()));
  const register = (value: string, record: TreeRecord): void => {
    if (records.has(value)) throw new Error(`Tree duplicate item value: ${value}`);
    records.set(value, record);
    if (!focused()) setFocused(value);
  };
  const unregister = (value: string): void => { records.delete(value); };
  const select = (value: string): void => {
    const record = records.get(value);
    if (mode() === "none" || !record || record.disabled()) return;
    if (mode() === "single" && selected().has(value)) return;
    let next: readonly string[];
    if (mode() === "single") next = [value];
    else next = selected().has(value) ? selectedValues().filter(candidate => candidate !== value) : [...selectedValues(), value];
    if (local.selectedValues === undefined) setSelectedDraft(next);
    local.onSelectionChange?.(next);
  };
  const publishExpanded = (next: readonly string[]): void => {
    if (local.expandedValues === undefined) setExpandedDraft(next);
    local.onExpandedChange?.(next);
  };
  const toggleExpanded = (value: string): void => {
    const record = records.get(value);
    if (!record?.branch || record.disabled()) return;
    publishExpanded(expanded().has(value) ? expandedValues().filter(candidate => candidate !== value) : [...expandedValues(), value]);
  };
  const expand = (values: readonly string[]): void => {
    const additions = values.filter(value => {
      const record = records.get(value);
      return record?.branch && !record.disabled() && !expanded().has(value);
    });
    if (additions.length) publishExpanded([...expandedValues(), ...additions]);
  };
  const activate = (value: string): void => {
    const record = records.get(value);
    if (!record || record.disabled()) return;
    if (local.onActivate) local.onActivate(value);
    else if (record.branch) toggleExpanded(value);
  };
  const context: TreeContextValue = { selectionMode: mode, selected, expanded, focused, setFocused, register, unregister, select, toggleExpanded, expand, activate };
  let root: HTMLUListElement | undefined;
  let typeahead = "";
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
  const focusItem = (item: HTMLElement | undefined): void => {
    if (!item) return;
    setFocused(itemValue(item));
    item.focus();
  };
  const onKeyDown: JSX.EventHandler<HTMLUListElement, KeyboardEvent> = event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const origin = event.target;
    if (!(origin instanceof HTMLElement)) return;
    const target = origin.closest<HTMLElement>('[role="treeitem"]');
    if (!target || target.closest('[role="tree"]') !== event.currentTarget) return;
    const items = visibleItems(event.currentTarget);
    const index = items.indexOf(target);
    if (index < 0) return;
    const value = itemValue(target);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case "ArrowDown": next = items[index + 1]; break;
      case "ArrowUp": next = items[index - 1]; break;
      case "Home": next = items[0]; break;
      case "End": next = items.at(-1); break;
      case "ArrowRight": {
        if (target.getAttribute("aria-expanded") === "false") context.toggleExpanded(value);
        else if (target.getAttribute("aria-expanded") === "true") next = directGroup(target)?.querySelector<HTMLElement>('[role="treeitem"]') ?? undefined;
        break;
      }
      case "ArrowLeft": {
        if (target.getAttribute("aria-expanded") === "true") context.toggleExpanded(value);
        else next = target.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
        break;
      }
      case "*": {
        const siblings = target.parentElement?.children ?? [];
        const branches = [...siblings].filter((sibling): sibling is HTMLElement => sibling instanceof HTMLElement && sibling.hasAttribute("aria-expanded")).map(itemValue);
        context.expand(branches);
        break;
      }
      case " ": context.select(value); break;
      case "Enter": context.activate(value); break;
      default: {
        if (event.key.length !== 1) return;
        typeahead += event.key.toLocaleLowerCase(theme.state().locale);
        if ([...typeahead].every(character => character === typeahead[0])) typeahead = typeahead[0] ?? "";
        if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer);
        typeaheadTimer = setTimeout(() => { typeahead = ""; }, 500);
        const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
        next = ordered.find(item => (item.dataset.sheenTreeLabel ?? "").toLocaleLowerCase(theme.state().locale).startsWith(typeahead));
      }
    }
    event.preventDefault();
    focusItem(next);
  };
  onMount(() => {
    const element = root;
    if (!element) return;
    let previous = visibleItems(element);
    const observer = new MutationObserver(() => {
      const next = visibleItems(element);
      const active = element.ownerDocument.activeElement;
      if (element.isConnected && active === element.ownerDocument.body && !next.some(item => item.dataset.sheenTreeValue === focused())) {
        const previousIndex = previous.findIndex(item => item.dataset.sheenTreeValue === focused());
        focusItem(next[Math.min(Math.max(previousIndex, 0), Math.max(next.length - 1, 0))]);
      }
      previous = next;
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "inert"] });
    onCleanup(() => observer.disconnect());
  });
  onCleanup(() => { if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer); });
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("Tree requires a nonempty accessible label");
    return local.label;
  });
  return <TreeContext.Provider value={context}><ul {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} role="tree" aria-label={label()}
    aria-multiselectable={mode() === "multiple" ? "true" : undefined} class={cn("sheen-tree", local.class)} onKeyDown={onKeyDown}>{local.children}</ul></TreeContext.Provider>;
}

/** A stable branch or leaf identity owned by Tree. Child items remain mounted while collapsed. */
export function TreeItem(props: TreeItemProps): JSX.Element {
  const context = useContext(TreeContext);
  if (!context) throw new Error("TreeItem requires a Tree owner");
  const theme = useTheme();
  const branch = Object.prototype.hasOwnProperty.call(props, "children");
  const [local, others] = splitProps(props, ["value", "label", "disabled", "class", "id", "children", "ref"]);
  const generatedId = createUniqueId();
  const labelId = () => `${local.id ?? generatedId}-label`;
  const registeredValue = local.value;
  if (!registeredValue.trim() || !local.label.trim()) throw new Error("TreeItem requires nonempty values and labels");
  context.register(registeredValue, { branch, disabled: () => local.disabled ?? false });
  onCleanup(() => context.unregister(registeredValue));
  const value = (): string => {
    if (local.value !== registeredValue) throw new Error("TreeItem value is a stable identity and cannot change after registration");
    if (!local.label.trim()) throw new Error("TreeItem requires nonempty values and labels");
    return registeredValue;
  };
  const open = () => branch && context.expanded().has(value());
  const selected = () => context.selected().has(value());
  let item: HTMLLIElement | undefined;
  let group: HTMLUListElement | undefined;
  createEffect(() => {
    if (!open() && item && group?.contains(item.ownerDocument.activeElement)) {
      context.setFocused(value());
      item.focus({ preventScroll: true });
    }
  });
  const focus = (): void => { context.setFocused(value()); };
  const choose = (): void => {
    focus();
    if (!local.disabled) context.select(value());
  };
  return <li {...others} ref={element => { item = element; if (typeof local.ref === "function") local.ref(element); }} id={local.id} role="treeitem" tabIndex={context.focused() === value() ? 0 : -1}
    aria-labelledby={labelId()} aria-expanded={branch ? open() : undefined} aria-selected={context.selectionMode() === "none" ? undefined : selected()}
    aria-disabled={local.disabled || undefined} class={cn("sheen-tree-item", local.class)} data-sheen-tree-value={value()} data-sheen-tree-label={local.label}
    data-selected={selected() ? "" : undefined} data-disabled={local.disabled ? "" : undefined} onFocus={focus} onClick={event => {
      if (event.target instanceof Element && event.target.closest('[role="treeitem"]') === event.currentTarget) choose();
    }} onDblClick={event => {
      if (!local.disabled && branch && event.target instanceof Element && event.target.closest('[role="treeitem"]') === event.currentTarget) context.toggleExpanded(value());
    }}>
    <div class="sheen-tree-item-row">
      {branch ? <button type="button" tabIndex={-1} class="sheen-tree-expander" aria-label={(open() ? theme.messages().collapseTreeItem : theme.messages().expandTreeItem).replace("{label}", local.label)} disabled={local.disabled}
        onClick={event => { event.stopPropagation(); focus(); item?.focus(); context.toggleExpanded(value()); }}><span aria-hidden="true" /></button> : <span class="sheen-tree-leaf" aria-hidden="true" />}
      <span id={labelId()} class="sheen-tree-item-label">{local.label}</span>
    </div>
    {branch ? <ul ref={group} role="group" class="sheen-tree-group" hidden={!open()} inert={!open()}>{local.children}</ul> : null}
  </li>;
}
