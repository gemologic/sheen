import { Button, DropdownMenu, useTheme } from "@gemologic/sheen";
import type { MenuItem } from "@gemologic/sheen";
import { For, Show, children, createMemo } from "solid-js";
import type { JSX } from "solid-js";

interface DataTableToolbarActionBase {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}
export interface DataTableToolbarButton extends DataTableToolbarActionBase { readonly kind: "action"; readonly onSelect: () => void; readonly items?: never; }
export interface DataTableToolbarMenu extends DataTableToolbarActionBase { readonly kind: "menu"; readonly items: readonly MenuItem[]; readonly onSelect?: never; }
export type DataTableToolbarAction = DataTableToolbarButton | DataTableToolbarMenu;

export interface DataTableToolbarProps {
  readonly label: string;
  readonly query?: JSX.Element | undefined;
  readonly result?: string | undefined;
  readonly resultPrevious?: string | undefined;
  readonly actions: readonly DataTableToolbarAction[];
  readonly status?: JSX.Element | undefined;
}

function validateActions(actions: readonly DataTableToolbarAction[]): ReadonlyMap<string, DataTableToolbarAction> {
  if (!Array.isArray(actions)) throw new Error("DataTable toolbar actions must be an array");
  const result = new Map<string, DataTableToolbarAction>();
  for (const action of actions) {
    if (!action.id.trim() || !action.label.trim() || result.has(action.id)) throw new Error("DataTable toolbar actions require unique nonempty IDs and labels");
    if (action.kind === "action" && (typeof action.onSelect !== "function" || action.items !== undefined)) throw new Error(`DataTable toolbar action ${action.id} requires onSelect only`);
    if (action.kind === "menu" && (!Array.isArray(action.items) || action.items.length === 0 || action.onSelect !== undefined)) throw new Error(`DataTable toolbar menu ${action.id} requires nonempty items only`);
    result.set(action.id, action);
  }
  return result;
}

function DirectAction(props: { readonly action: DataTableToolbarAction }): JSX.Element {
  return <Show when={props.action.kind === "menu"} fallback={<Button size="sm" {...(props.action.disabled === undefined ? {} : { disabled: props.action.disabled })}
    onClick={() => { if (props.action.kind === "action") props.action.onSelect(); }}>{props.action.label}</Button>}>
    <DropdownMenu trigger={props.action.label} items={props.action.kind === "menu" ? props.action.items : []}
      {...(props.action.disabled === undefined ? {} : { disabled: props.action.disabled })} />
  </Show>;
}

function overflowItem(action: DataTableToolbarAction): MenuItem {
  if (action.kind === "menu") return Object.freeze({ kind: "submenu", id: action.id, label: action.label, items: action.items, ...(action.disabled === undefined ? {} : { disabled: action.disabled }) });
  return Object.freeze({ kind: "action", id: action.id, label: action.label, onSelect: action.onSelect, ...(action.disabled === undefined ? {} : { disabled: action.disabled }) });
}

export function DataTableToolbar(props: DataTableToolbarProps): JSX.Element {
  const theme = useTheme();
  const query = children(() => props.query);
  const status = children(() => props.status);
  const actions = createMemo(() => {
    if (!props.label.trim()) throw new Error("DataTable toolbar requires a nonempty label");
    return validateActions(props.actions);
  });
  const overflow = createMemo<readonly MenuItem[]>(() => [...actions().values()].map(overflowItem));
  const actionIds = createMemo(() => [...actions().keys()]);

  return <div class="sheen-data-table-toolbar" role="toolbar" aria-label={props.label}>
    <Show when={query()}><div class="sheen-data-table-toolbar-query">{query()}</div></Show>
    <Show when={props.result}>{result => <output class="sheen-data-table-result-count" data-previous={props.resultPrevious ? "" : undefined} aria-live="polite" aria-atomic="true">{result()}<Show when={props.resultPrevious}>{previous => <span class="sheen-data-table-previous-label">{previous()}</span>}</Show></output>}</Show>
    <Show when={status()}><div class="sheen-data-table-toolbar-status">{status()}</div></Show>
    <Show when={actionIds().length > 0}><div class="sheen-data-table-toolbar-actions">
      <For each={actionIds()}>{id => <Show when={actions().get(id)}>{action => <div class="sheen-data-table-toolbar-action" data-action={id}><DirectAction action={action()} /></div>}</Show>}</For>
      <div class="sheen-data-table-toolbar-overflow"><DropdownMenu trigger={theme.messages().moreActions} items={overflow()} /></div>
    </div></Show>
  </div>;
}
