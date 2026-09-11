import { Button, ConfirmDialog, Dialog, DropdownMenu, Input, Select, useTheme } from "@gemologic/sheen";
import type { MenuItem } from "@gemologic/sheen";
import { Show, children, createEffect, createMemo, createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { ErrorState } from "./ErrorState.tsx";
import { LoadingState } from "./LoadingState.tsx";
import { PageHeader } from "./PageHeader.tsx";
import { Toolbar } from "./Toolbar.tsx";
import type { ToolbarGroup } from "./Toolbar.tsx";

export type DataTablePageState = "ready" | "not-found" | "server-error" | "permission-denied";

export interface DataTablePageView {
  readonly id: string;
  readonly name: string;
}

export interface DataTablePageViews {
  readonly records: readonly DataTablePageView[];
  readonly selectedId: string | null;
  readonly draftName: string;
  readonly pending?: boolean;
  readonly error?: string | null;
  readonly onSelectedChange: (id: string | null) => void;
  readonly onDraftNameChange: (name: string) => void;
  readonly onSave: (name: string) => void;
  /** Rename without replacing the saved table-state snapshot. */
  readonly onRename: (id: string, name: string) => void;
  readonly onRestore: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onRetry: () => void;
}

export interface DataTablePageProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "children"> {
  readonly title: string;
  readonly headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly breadcrumb?: JSX.Element;
  readonly headerActions?: JSX.Element;
  readonly tabs?: JSX.Element;
  readonly toolbarLabel: string;
  readonly toolbarGroups?: readonly ToolbarGroup[];
  readonly views?: DataTablePageViews;
  readonly state?: DataTablePageState;
  readonly loadingPhase?: "idle" | "cold" | "refresh";
  readonly loadingFallback: JSX.Element;
  readonly errorTitle?: string;
  readonly errorDescription?: string;
  readonly onRetry?: () => void | Promise<void>;
  readonly status?: JSX.Element;
  readonly children: JSX.Element;
}

function validateViews(value: DataTablePageViews): readonly DataTablePageView[] {
  if (!Array.isArray(value.records)) throw new Error("DataTablePage saved views must be an array");
  const ids = new Set<string>();
  const records = value.records.map((record, index) => {
    if (typeof record !== "object" || record === null || Array.isArray(record)) throw new Error(`DataTablePage saved view ${index} must be an object`);
    if (typeof record.id !== "string" || !record.id.trim() || record.id !== record.id.trim() || ids.has(record.id)) throw new Error("DataTablePage saved view IDs must be unique nonempty trimmed strings");
    ids.add(record.id);
    if (typeof record.name !== "string" || !record.name.trim() || record.name !== record.name.trim()) throw new Error(`DataTablePage saved view ${record.id} requires a nonempty trimmed name`);
    return Object.freeze({ id: record.id, name: record.name });
  });
  if (value.selectedId !== null && (typeof value.selectedId !== "string" || !ids.has(value.selectedId))) throw new Error("DataTablePage selected saved view must exist in records");
  if (typeof value.draftName !== "string") throw new Error("DataTablePage saved view draftName must be a string");
  if (typeof value.pending !== "undefined" && typeof value.pending !== "boolean") throw new Error("DataTablePage saved view pending must be boolean");
  if (value.error !== undefined && value.error !== null && (typeof value.error !== "string" || !value.error.trim())) throw new Error("DataTablePage saved view error must be nonempty");
  if (typeof value.onSelectedChange !== "function" || typeof value.onDraftNameChange !== "function" || typeof value.onSave !== "function" || typeof value.onRename !== "function" || typeof value.onRestore !== "function" || typeof value.onDelete !== "function" || typeof value.onRetry !== "function") throw new Error("DataTablePage saved view callbacks must be functions");
  return Object.freeze(records);
}

function SavedViewControls(props: { readonly model: DataTablePageViews }): JSX.Element {
  const theme = useTheme();
  const records = createMemo(() => validateViews(props.model));
  const selected = createMemo(() => records().find(record => record.id === props.model.selectedId));
  const pending = () => props.model.pending ?? false;
  const [dialog, setDialog] = createSignal<"save" | "manage" | null>(null);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [renameName, setRenameName] = createSignal(selected()?.name ?? "");
  let renameOwner = props.model.selectedId;
  let root: HTMLDivElement | undefined;
  let deleteButton: HTMLButtonElement | undefined;
  createEffect(() => {
    const id = props.model.selectedId;
    if (id === renameOwner) return;
    renameOwner = id;
    setRenameName(selected()?.name ?? "");
  });
  const save = (event: SubmitEvent) => {
    event.preventDefault();
    const name = props.model.draftName.trim();
    if (!pending() && name) props.model.onSave(name);
  };
  const rename = (event: SubmitEvent) => {
    event.preventDefault();
    const view = selected();
    const name = renameName().trim();
    if (!pending() && view && name && name !== view.name) props.model.onRename(view.id, name);
  };
  const restore = (id: string) => {
    if (pending()) return;
    props.model.onSelectedChange(id);
    props.model.onRestore(id);
  };
  const openDialog = (kind: "save" | "manage") => queueMicrotask(() => setDialog(kind));
  const menuItems = createMemo<readonly MenuItem[]>(() => {
    const items: MenuItem[] = [];
    if (records().length > 0) {
      items.push({ kind: "radio", id: "views", label: theme.messages().selectView, value: props.model.selectedId ?? "", onValueChange: restore,
        options: records().map(record => ({ id: record.id, label: record.name })) });
      items.push({ kind: "action", id: "restore", label: theme.messages().restoreView, disabled: pending() || !selected(), onSelect: () => { const view = selected(); if (view) props.model.onRestore(view.id); } });
      items.push({ kind: "separator", id: "records" });
    }
    items.push({ kind: "action", id: "save", label: theme.messages().saveCurrentView, disabled: pending(), onSelect: () => openDialog("save") });
    items.push({ kind: "action", id: "manage", label: theme.messages().manageSavedViews, disabled: pending(), onSelect: () => openDialog("manage") });
    if (props.model.error) {
      items.push({ kind: "separator", id: "failure" });
      items.push({ kind: "action", id: "retry", label: theme.messages().retryViewOperation, disabled: pending(), onSelect: props.model.onRetry });
    }
    return Object.freeze(items);
  });
  const trigger = () => selected()?.name ?? theme.messages().savedViews;
  const deleteDescription = () => theme.messages().deleteSavedViewDescription.replace("{name}", selected()?.name ?? "");
  const returnFocus = () => root?.querySelector<HTMLButtonElement>("[data-sheen-menu-trigger]") ?? undefined;
  return <div ref={root} class="sheen-data-table-page-views">
    <DropdownMenu trigger={trigger()} items={menuItems()} disabled={pending()} />
    <Dialog title={dialog() === "save" ? theme.messages().saveCurrentView : theme.messages().manageSavedViews} open={dialog() !== null} onOpenChange={open => { if (!open) setDialog(null); }} returnFocus={returnFocus}
      class="sheen-data-table-page-view-dialog">
      <Show when={dialog() === "save"} fallback={<form class="sheen-data-table-page-view-form" aria-label={theme.messages().manageSavedViews} onSubmit={rename}>
        <Show when={records().length > 0} fallback={<p class="sheen-data-table-page-view-empty">{theme.messages().noSavedViews}</p>}>
          <Select label={theme.messages().selectView} options={records().map(record => ({ value: record.id, label: record.name }))}
            value={props.model.selectedId} onValueChange={props.model.onSelectedChange} disabled={pending()} />
          <Input label={theme.messages().viewName} value={renameName()} disabled={pending()} onInput={event => setRenameName(event.currentTarget.value)} />
          <div class="sheen-data-table-page-view-actions">
            <Button type="button" disabled={pending() || !selected()} onClick={() => { const view = selected(); if (view) props.model.onRestore(view.id); }}>{theme.messages().restoreView}</Button>
            <Button type="submit" disabled={pending() || !selected() || !renameName().trim() || renameName().trim() === selected()?.name}>{theme.messages().renameView}</Button>
            <Button ref={element => { deleteButton = element; }} type="button" tone="danger" disabled={pending() || !selected()} onClick={() => setDeleteOpen(true)}>{theme.messages().deleteView}</Button>
          </div>
        </Show>
        <Show when={props.model.error}>{error => <div class="sheen-data-table-page-view-error" role="alert"><span>{error()}</span><Button type="button" onClick={props.model.onRetry} disabled={pending()}>{theme.messages().retryViewOperation}</Button></div>}</Show>
      </form>}>
        <form class="sheen-data-table-page-view-form" aria-label={theme.messages().saveCurrentView} onSubmit={save}>
          <Input label={theme.messages().viewName} value={props.model.draftName} disabled={pending()} onInput={event => props.model.onDraftNameChange(event.currentTarget.value)} />
          <Button type="submit" disabled={pending() || !props.model.draftName.trim()}>{theme.messages().saveView}</Button>
          <Show when={props.model.error}>{error => <div class="sheen-data-table-page-view-error" role="alert"><span>{error()}</span><Button type="button" onClick={props.model.onRetry} disabled={pending()}>{theme.messages().retryViewOperation}</Button></div>}</Show>
        </form>
      </Show>
    </Dialog>
    <ConfirmDialog open={deleteOpen()} title={theme.messages().deleteSavedViewTitle} description={deleteDescription()} confirmLabel={theme.messages().deleteView} tone="danger"
      onCancel={() => setDeleteOpen(false)} onConfirm={() => { const view = selected(); setDeleteOpen(false); if (view && !pending()) props.model.onDelete(view.id); }} returnFocus={() => deleteButton} />
  </div>;
}

function errorKind(state: DataTablePageState): "not-found" | "server" | "permission-denied" {
  if (state === "not-found") return "not-found";
  if (state === "permission-denied") return "permission-denied";
  return "server";
}

export function DataTablePage(props: DataTablePageProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "headingLevel", "breadcrumb", "headerActions", "tabs", "toolbarLabel", "toolbarGroups", "views", "state", "loadingPhase", "loadingFallback", "errorTitle", "errorDescription", "onRetry", "status", "children", "class"]);
  const status = children(() => local.status);
  const state = createMemo<DataTablePageState>(() => {
    const value = local.state ?? "ready";
    if (value !== "ready" && value !== "not-found" && value !== "server-error" && value !== "permission-denied") throw new Error("DataTablePage has an invalid state");
    return value;
  });
  const phase = createMemo<"idle" | "cold" | "refresh">(() => {
    const value = local.loadingPhase ?? "idle";
    if (value !== "idle" && value !== "cold" && value !== "refresh") throw new Error("DataTablePage has an invalid loadingPhase");
    return state() === "ready" ? value : "idle";
  });
  const groups = createMemo(() => local.toolbarGroups ?? []);
  return <section {...others} class={`sheen-data-table-page ${local.class ?? ""}`} data-state={state()} data-phase={phase()}>
    <PageHeader title={local.title} headingLevel={local.headingLevel} breadcrumb={local.breadcrumb} actions={local.headerActions} tabs={local.tabs} />
    <Show when={state() === "ready" && (groups().length > 0 || local.views)}>
      <Toolbar label={local.toolbarLabel} groups={groups()} filter={<div class="sheen-data-table-page-controls">
        <Show when={local.views}>{views => <SavedViewControls model={views()} />}</Show>
      </div>} />
    </Show>
    <div class="sheen-data-table-page-content">
      <Show when={state() === "ready"} fallback={<ErrorState kind={errorKind(state())}
        {...(local.errorTitle === undefined ? {} : { title: local.errorTitle })}
        {...(local.errorDescription === undefined ? {} : { description: local.errorDescription })}
        {...(local.onRetry === undefined ? {} : { onRetry: local.onRetry })} />}>
        <LoadingState class="sheen-data-table-page-loading" label={local.title} phase={phase()} fallback={local.loadingFallback}>{local.children}</LoadingState>
      </Show>
    </div>
    <Show when={status()}><footer class="sheen-data-table-page-status">{status()}</footer></Show>
  </section>;
}
