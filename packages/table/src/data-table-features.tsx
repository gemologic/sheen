import { Toaster, createToaster } from "@gemologic/sheen";
import { For, Show, createComputed, createEffect, createMemo, createSignal, createUniqueId, on, onCleanup, onMount, untrack } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import type { ColumnEditor, ColumnValue, ResolvedColumn } from "./columns.ts";
import { createCellEdit } from "./cell-edit.ts";
import type { CellCommitOutcome, CellEditSnapshot } from "./cell-edit.ts";
import type { DataTableCellCommitRequest, DataTableInternalProps, DataTableResult } from "./DataTable.tsx";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { groupClientRows, normalizeServerGroups } from "./grouping.ts";
import type { ClientRowGroup } from "./grouping.ts";
import type { TableMessages } from "./messages.ts";
import { createRowHierarchy } from "./row-hierarchy.ts";
import type { HierarchyRow } from "./row-hierarchy.ts";
import { createRowIdentity } from "./row-identity.ts";

/** One application row with a stable ID. The accessor follows the current source row for that ID. */
export interface StableRow<Row extends object> {
  readonly id: string;
  readonly value: Accessor<Row>;
}

export interface StableRows<Row extends object> {
  readonly resolve: (row: Row, index: number) => StableRow<Row>;
}

export interface DisplayDataRow<Row extends object> {
  readonly kind: "data";
  readonly key: string;
  readonly row: StableRow<Row>;
  readonly parentId: string | null;
  readonly depth: number;
  readonly position: number;
  readonly setSize: number;
  readonly canExpand: boolean;
  readonly expanded: boolean;
  readonly unloaded: boolean;
  readonly pending: boolean;
  readonly error: unknown;
}

export interface DisplayGroupRow<Row extends object> {
  readonly kind: "group";
  readonly key: string;
  readonly group: ClientRowGroup<Row>;
  readonly label: string;
  readonly position: number;
  readonly setSize: number;
  readonly expanded: boolean;
}

export type DisplayRow<Row extends object> = DisplayDataRow<Row> | DisplayGroupRow<Row>;

/** What a feature may read from, and ask of, the table that composes it. */
export interface DataTableFeatureContext<Row extends object> {
  readonly props: DataTableInternalProps<Row>;
  readonly definitions: readonly ResolvedColumn<Row>[];
  readonly filterColumns: readonly FilterColumn[];
  readonly messages: Accessor<TableMessages>;
  readonly locale: Accessor<string>;
  /** A query is unsettled. Structural changes wait for accepted state. */
  readonly pending: Accessor<boolean>;
  /** Accepted rows, facets, and server groups. Totals stay with the table because cursor pages may not know them. */
  readonly result: Accessor<Pick<DataTableResult<Row>, "rows" | "facets" | "groups">>;
  readonly accepted: Accessor<boolean>;
  readonly acceptedFilter: Accessor<FilterNode>;
  readonly requestFilter: (filter: FilterNode) => void;
  /** Stable rows for the table's own source (client data or the accepted server page). */
  readonly stableRows: StableRows<Row>;
  readonly createStableRows: (source: Accessor<readonly Row[]>) => StableRows<Row>;
  readonly rowAt: (index: number) => DisplayRow<Row> | undefined;
  readonly rowIndex: (key: string, hint?: number) => number;
  readonly focusRow: (index: number) => void;
}

/** Replaces the flat row model with a structured treegrid presentation. At most one may be active. */
export interface DataTablePresentation<Row extends object> {
  readonly rows: Accessor<readonly DisplayRow<Row>[]>;
  readonly allowSelectAll: boolean;
  /** Column that labels group rows when it is visible. */
  readonly labelColumn?: string;
  /** Returns true when the feature handled the key. Cards omit child/parent focus movement. */
  readonly keyDown: (event: KeyboardEvent, row: DisplayRow<Row>, index: number, layout: "table" | "cards") => boolean;
  /** Wraps the first visible data cell with tree indentation and expansion controls. */
  readonly TreeCell: (props: { readonly row: DisplayDataRow<Row>; readonly children: JSX.Element }) => JSX.Element;
  readonly GroupCell?: (props: { readonly row: DisplayGroupRow<Row>; readonly column: ResolvedColumn<Row>; readonly label: boolean }) => JSX.Element;
}

export interface DataTableCellAttributes {
  readonly "data-editable"?: "";
  readonly "data-invalid"?: "";
  readonly "data-stale"?: "";
  readonly "data-pending"?: "";
  readonly "data-conflict"?: "";
}

/** Per-cell extension bound inside the owning cell. */
export interface DataTableCellBinding<Row extends object> {
  readonly active: Accessor<boolean>;
  readonly attributes: Accessor<DataTableCellAttributes>;
  readonly render: (row: Accessor<DisplayDataRow<Row>>) => JSX.Element;
}

export interface DataTableFeatureInstance<Row extends object> {
  readonly presentation?: DataTablePresentation<Row>;
  /** Toolbar query control rendered beside search. */
  readonly query?: { readonly visible: Accessor<boolean>; readonly render: () => JSX.Element };
  /** Returns undefined for columns the feature does not own. */
  readonly cell?: (row: Accessor<DisplayDataRow<Row> | undefined>, column: ResolvedColumn<Row>) => DataTableCellBinding<Row> | undefined;
  /** Rendered once at the end of the table section. */
  readonly overlay?: () => JSX.Element;
}

export type DataTableFeatureId = "filterBar" | "grouping" | "hierarchy" | "cellEditing";

/**
 * An opt-in DataTable capability for `createDataTable`. Only Sheen's exported features are supported; the
 * context contract is internal. A feature validates the props it owns and returns undefined when inactive.
 * Features are row-agnostic so one list type-checks against any DataTable.
 */
export interface DataTableFeature<Id extends DataTableFeatureId = DataTableFeatureId> {
  readonly id: Id;
  readonly create: <Row extends object>(context: DataTableFeatureContext<Row>) => DataTableFeatureInstance<Row> | undefined;
}

export function defaultCell(value: ColumnValue): JSX.Element {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Holds a framework-neutral store's immutable snapshot in a signal. Stores publish by replacing their
 * snapshot object, so equal references do not notify readers.
 */
export function createSnapshotSignal<Snapshot>(read: () => Snapshot): { readonly snapshot: Accessor<Snapshot>; readonly sync: () => void; readonly track: <Value>(completion: Promise<Value>) => Promise<Value> } {
  const [snapshot, setSnapshot] = createSignal(read());
  const sync = (): void => { setSnapshot(() => read()); };
  return {
    snapshot,
    sync,
    track: completion => {
      sync();
      return completion.finally(sync);
    },
  };
}

/**
 * Resolves stable row records lazily by ID. Each record reads the validated source index, so a changed row
 * object reaches only the readers of that record without writing reactive state while deriving rows.
 */
export function createStableRows<Row extends object>(getRowId: (row: Row) => string, source: Accessor<readonly Row[]>): StableRows<Row> {
  const identity = createRowIdentity(getRowId);
  const records = new Map<string, StableRow<Row>>();
  const index = createMemo(() => {
    const rows = source();
    const ids = identity.resolveIds(rows);
    const byId = new Map<string, Row>();
    for (let position = 0; position < rows.length; position++) byId.set(ids[position]!, rows[position]!);
    for (const id of records.keys()) if (!byId.has(id)) records.delete(id);
    return byId;
  });
  function create(id: string, row: Row): StableRow<Row> {
    let last = row;
    const record: StableRow<Row> = Object.freeze({
      id,
      value: (): Row => {
        const current = index().get(id);
        if (current !== undefined) last = current;
        return last;
      },
    });
    records.set(id, record);
    return record;
  }
  return Object.freeze({
    resolve(row: Row, position: number): StableRow<Row> {
      const id = getRowId(row);
      if (!index().has(id)) throw new Error(`Result row at index ${position} is not part of the supplied data`);
      return records.get(id) ?? create(id, row);
    },
  });
}

function TreeCell<Row extends object>(props: {
  readonly row: DisplayDataRow<Row>;
  readonly children: JSX.Element;
  readonly messages: TableMessages;
  readonly pending: boolean;
  readonly onToggle: (row: DisplayDataRow<Row>) => void;
  readonly onRetry: (row: DisplayDataRow<Row>) => void;
}): JSX.Element {
  return <div class="sheen-data-table-tree-cell" style={{ "--sheen-table-depth": Math.max(0, props.row.depth - 1) }}>
    <Show when={props.row.canExpand} fallback={<span class="sheen-data-table-expander-space" aria-hidden="true" />}>
      <button type="button" class="sheen-data-table-expander" aria-label={`${props.row.expanded ? props.messages.collapse : props.messages.expand} ${props.row.row.id}`} aria-expanded={props.row.expanded} disabled={props.pending}
        onClick={() => props.onToggle(props.row)}>{props.row.expanded ? "▾" : "▸"}</button>
    </Show>
    <span class="sheen-data-table-tree-value">{props.children}</span>
    <Show when={props.row.pending}><span class="sheen-data-table-row-status" role="status">{props.messages.loadingChildren}</span></Show>
    <Show when={props.row.error !== null}><span class="sheen-data-table-row-status" role="alert">{props.messages.serverError} <button type="button" onClick={() => props.onRetry(props.row)}>{props.messages.retry}</button></span></Show>
  </div>;
}

function plainKey(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

/** First-seen groups over complete client data or delegated server groups for the accepted page. */
function grouping<Row extends object>(context: DataTableFeatureContext<Row>): DataTableFeatureInstance<Row> | undefined {
  const props = context.props;
  const options = props.grouping;
  if (!options) return undefined;
  if (props.mode !== "server" && props.pagination !== false) throw new Error("Client grouping requires complete continuous data with pagination=false");
  if (typeof options.by !== "string" || !options.by.trim()) throw new Error("DataTable grouping requires a column ID");
  if (options.getLabel !== undefined && typeof options.getLabel !== "function") throw new Error("DataTable grouping getLabel must be a function");
  const column = context.definitions.find(definition => definition.id === options.by);
  const getValue = column?.accessor;
  if (!column || !getValue) throw new Error(`Grouping column ${options.by} must be an accessor column`);
  const aggregateColumns = context.definitions.flatMap(definition => definition.aggregate && definition.accessor ? [{ id: definition.id, aggregate: definition.aggregate, getValue: definition.accessor }] : []);
  const [overrides, setOverrides] = createSignal<ReadonlyMap<string, boolean>>(new Map());
  // A group's default is fixed when it is first presented; later option changes affect only new groups.
  const defaults = new Map<string, boolean>();
  const numberFormatter = createMemo(() => new Intl.NumberFormat(context.locale()));

  function expanded(id: string): boolean {
    const override = overrides().get(id);
    if (override !== undefined) return override;
    const known = defaults.get(id);
    if (known !== undefined) return known;
    const initial = props.grouping?.collapsible === false || props.grouping?.defaultExpanded !== false;
    defaults.set(id, initial);
    return initial;
  }
  function setExpanded(id: string, value: boolean): void {
    if (context.pending() || props.grouping?.collapsible === false || expanded(id) === value) return;
    setOverrides(previous => new Map(previous).set(id, value));
  }
  function label(group: ClientRowGroup<Row>): string {
    const supplied = props.grouping?.getLabel?.(group.value);
    const value = supplied ?? (group.value === null ? context.messages().groupMissing : typeof group.value === "number" ? numberFormatter().format(group.value) : String(group.value));
    if (typeof value !== "string" || !value.trim()) throw new Error(`Group ${group.id} requires a nonempty label`);
    return value;
  }

  const rows = createMemo<readonly DisplayRow<Row>[]>(() => {
    if (props.mode === "server" && !context.accepted()) return Object.freeze([]);
    const current = context.result();
    const groups = props.mode === "server"
      ? normalizeServerGroups(current.rows, current.groups, { column: column.id, aggregateColumns: aggregateColumns.map(aggregate => aggregate.id), getRowId: props.getRowId })
      : groupClientRows(current.rows, { column: column.id, getValue, aggregates: aggregateColumns });
    const display: DisplayRow<Row>[] = [];
    let sourceIndex = 0;
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex]!;
      const open = expanded(group.id);
      display.push(Object.freeze({ kind: "group", key: group.id, group, label: label(group), position: groupIndex + 1, setSize: groups.length, expanded: open }));
      for (let rowIndex = 0; rowIndex < group.rows.length; rowIndex++, sourceIndex++) {
        if (!open) continue;
        const row = context.stableRows.resolve(group.rows[rowIndex]!, sourceIndex);
        display.push(Object.freeze({ kind: "data", key: `row:${row.id}`, row, parentId: group.id, depth: 2, position: rowIndex + 1, setSize: group.rows.length, canExpand: false, expanded: false, unloaded: false, pending: false, error: null }));
      }
    }
    return Object.freeze(display);
  });

  const ignore = (): void => undefined;
  return {
    presentation: {
      rows,
      allowSelectAll: true,
      labelColumn: column.id,
      keyDown(event, row) {
        if (row.kind !== "group" || !plainKey(event)) return false;
        if (event.key === " " || event.key === "Enter") setExpanded(row.group.id, !row.expanded);
        else if (event.key === "ArrowRight" || event.key === "ArrowLeft") setExpanded(row.group.id, event.key === "ArrowRight");
        else return false;
        event.preventDefault();
        return true;
      },
      TreeCell: cellProps => <TreeCell row={cellProps.row} messages={context.messages()} pending={context.pending()} onToggle={ignore} onRetry={ignore}>{cellProps.children}</TreeCell>,
      GroupCell: cellProps => {
        if (cellProps.label) return <div class="sheen-data-table-tree-cell" style={{ "--sheen-table-depth": 0 }}>
          <Show when={props.grouping?.collapsible !== false} fallback={<span class="sheen-data-table-expander-space" aria-hidden="true" />}>
            <button type="button" class="sheen-data-table-expander" disabled={context.pending()} aria-label={`${cellProps.row.expanded ? context.messages().collapse : context.messages().expand} ${cellProps.row.label}`}
              aria-expanded={cellProps.row.expanded} onClick={() => setExpanded(cellProps.row.group.id, !cellProps.row.expanded)}>{cellProps.row.expanded ? "▾" : "▸"}</button>
          </Show>
          <span class="sheen-data-table-group-label">{cellProps.row.label} <span class="sheen-data-table-group-count">({numberFormatter().format(cellProps.row.group.count)})</span></span>
        </div>;
        return defaultCell(cellProps.row.group.aggregates.find(value => value.column === cellProps.column.id)?.value ?? null);
      },
    },
  };
}

/** Expandable parent rows with synchronous children or independently loaded subtrees. */
function hierarchy<Row extends object>(context: DataTableFeatureContext<Row>): DataTableFeatureInstance<Row> | undefined {
  const props = context.props;
  const options = props.hierarchy;
  if (!options) return undefined;
  if (!options.getChildren && !options.onLoadChildren) throw new Error("DataTable hierarchy requires getChildren or onLoadChildren");
  if (options.onLoadChildren && !options.hasChildren) throw new Error("Async DataTable hierarchy requires hasChildren");
  if (typeof options.resetKey === "number" && !Number.isFinite(options.resetKey)) throw new Error("DataTable hierarchy resetKey must be a finite number or string");
  const store = createRowHierarchy<Row>({
    getRowId: props.getRowId,
    ...(options.getChildren ? { getChildren: options.getChildren } : {}),
    ...(options.hasChildren ? { canLoadChildren: options.hasChildren } : {}),
    ...(options.onLoadChildren ? { loadChildren: options.onLoadChildren } : {}),
    ...(options.defaultExpanded !== undefined ? { defaultExpanded: options.defaultExpanded } : {}),
  });
  onCleanup(() => store.dispose());
  const { snapshot, sync, track } = createSnapshotSignal<readonly HierarchyRow<Row>[]>(store.getSnapshot);
  let resetKey = options.resetKey;
  // Accepted roots and the authorization boundary drive the store before any row derivation reads it.
  createComputed(() => {
    const roots = context.result().rows;
    const nextResetKey = props.hierarchy?.resetKey;
    untrack(() => {
      if (!Object.is(nextResetKey, resetKey)) store.reset();
      resetKey = nextResetKey;
      store.updateRoots(roots);
      sync();
    });
  });
  const stableRows = context.createStableRows(() => snapshot().map(item => item.row));
  const rows = createMemo<readonly DisplayRow<Row>[]>(() => Object.freeze(snapshot().map((item, index): DisplayDataRow<Row> => {
    const row = stableRows.resolve(item.row, index);
    return Object.freeze({ kind: "data", key: `row:${item.id}`, row, parentId: item.parentId, depth: item.depth, position: item.position, setSize: item.setSize, canExpand: item.canExpand, expanded: item.expanded, unloaded: item.unloaded, pending: item.pending, error: item.error });
  })));

  function changeExpansion(row: DisplayDataRow<Row>, expanded: boolean): void {
    if (context.pending()) return;
    void track(store.setExpanded(row.row.id, expanded));
  }
  function retry(row: DisplayDataRow<Row>): void {
    if (context.pending()) return;
    void track(store.retry(row.row.id));
  }
  const [mounted, setMounted] = createSignal(false);
  onMount(() => { setMounted(true); });
  createEffect(() => {
    if (!mounted()) return;
    for (const row of rows()) if (row.kind === "data" && row.expanded && row.unloaded && !row.pending && row.error === null) changeExpansion(row, true);
  });

  return {
    presentation: {
      rows,
      allowSelectAll: false,
      keyDown(event, row, index, layout) {
        if (row.kind !== "data" || !plainKey(event)) return false;
        if (layout === "cards") {
          if (!row.canExpand || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return false;
          event.preventDefault();
          changeExpansion(row, event.key === "ArrowRight");
          return true;
        }
        if (row.canExpand && event.key === "ArrowRight") {
          event.preventDefault();
          if (!row.expanded) changeExpansion(row, true);
          else {
            const current = context.rowIndex(row.key, index);
            const child = context.rowAt(current + 1);
            if (child?.kind === "data" && child.parentId === row.row.id) context.focusRow(current + 1);
          }
          return true;
        }
        if (event.key !== "ArrowLeft") return false;
        event.preventDefault();
        if (row.expanded) changeExpansion(row, false);
        else if (row.parentId) {
          const parent = rows().findIndex(candidate => candidate.kind === "data" && candidate.row.id === row.parentId);
          if (parent >= 0) context.focusRow(parent);
        }
        return true;
      },
      TreeCell: cellProps => <TreeCell row={cellProps.row} messages={context.messages()} pending={context.pending()} onToggle={row => changeExpansion(row, !row.expanded)} onRetry={retry}>{cellProps.children}</TreeCell>,
    },
  };
}

function editorAccepts<Row extends object>(editor: ColumnEditor<Row>, value: ColumnValue): boolean {
  if (value === null) return editor.nullable === true;
  if (editor.type === "text") return typeof value === "string";
  if (editor.type === "number") return typeof value === "number";
  if (editor.type === "boolean") return typeof value === "boolean";
  if (editor.type === "select") return typeof value === "string" && editor.options.includes(value);
  return false;
}

interface CellEditRecord {
  readonly controller: ReturnType<typeof createCellEdit<ColumnValue, string>>;
  readonly snapshot: Accessor<CellEditSnapshot<ColumnValue, string>>;
  readonly sync: () => void;
}

/** Inline editing for columns that declare an editor. Drafts survive virtualization until the reset boundary changes. */
function cellEditing<Row extends object>(context: DataTableFeatureContext<Row>): DataTableFeatureInstance<Row> | undefined {
  const props = context.props;
  const editable = context.definitions.filter(column => column.editor !== null);
  if (editable.length > 0 && !props.onCellCommit) throw new Error("DataTable editable columns require onCellCommit");
  if (editable.length === 0 && props.onCellCommit) throw new Error("DataTable onCellCommit requires at least one editable column");
  for (const column of editable) {
    if (!column.accessor || !column.editor) throw new Error(`Editable column ${column.id} requires an accessor and editor`);
  }
  const commit = props.onCellCommit;
  if (!commit) return undefined;
  const toaster = createToaster();
  // Each reset boundary owns its records; replacing the scope disposes drafts and aborts in-flight commits.
  const scope = createMemo(() => {
    const resetKey = props.editResetKey;
    if (typeof resetKey === "number" && !Number.isFinite(resetKey)) throw new Error("DataTable editResetKey must be a finite number or string");
    const records = new Map<string, CellEditRecord>();
    onCleanup(() => { for (const record of records.values()) record.controller.dispose(); });
    return records;
  });
  createEffect(on(() => props.editResetKey, () => toaster.clear(), { defer: true }));

  function recordFor(records: Map<string, CellEditRecord>, row: StableRow<Row>, column: ResolvedColumn<Row>): CellEditRecord | undefined {
    const editor = column.editor;
    const accessor = column.accessor;
    if (!editor || !accessor || !commit) return undefined;
    const key = `${row.id}\u0000${column.id}`;
    const existing = records.get(key);
    if (existing) return existing;
    const initial = accessor(untrack(row.value));
    if (!editorAccepts(editor, initial)) throw new Error(`Initial value for editable cell ${row.id}/${column.id} does not match its editor`);
    const controller = createCellEdit<ColumnValue, string>(initial, async (request, signal) => {
      const applicationRequest: DataTableCellCommitRequest<Row> = Object.freeze({ ...request, rowId: row.id, row: untrack(row.value), column: column.id });
      const result = await commit(applicationRequest, signal);
      const value = result.kind === "accepted" ? result.value : result.current;
      if (!editorAccepts(editor, value)) throw new Error(`Committed value for ${row.id}/${column.id} does not match its editor`);
      return result;
    }, { validate: value => {
      if (!editorAccepts(editor, value)) return value === null ? context.messages().cellValueRequired : context.messages().cellValueInvalid;
      return editor.validate?.(value, untrack(row.value)) ?? null;
    } });
    const { snapshot, sync } = createSnapshotSignal(controller.getSnapshot);
    const record = Object.freeze({ controller, snapshot, sync });
    records.set(key, record);
    return record;
  }

  function EditableCellValue(cellProps: { readonly row: DisplayDataRow<Row>; readonly column: ResolvedColumn<Row>; readonly record: CellEditRecord }): JSX.Element {
    const editor = cellProps.column.editor;
    const accessor = cellProps.column.accessor;
    if (!editor || !accessor) throw new Error(`Editable cell ${cellProps.row.row.id}/${cellProps.column.id} is missing its editor`);
    const activeEditor = editor;
    const id = createUniqueId();
    let editorElement: HTMLInputElement | HTMLSelectElement | undefined;
    let restingElement: HTMLSpanElement | undefined;
    let restoringRestingFocus = false;
    let incoming = accessor(untrack(cellProps.row.row.value));
    const snapshot = (): CellEditSnapshot<ColumnValue, string> => cellProps.record.snapshot();
    const draft = (): ColumnValue => snapshot().draft?.value ?? snapshot().committed;
    const label = () => context.messages().editCell.replaceAll("{column}", cellProps.column.header).replaceAll("{id}", cellProps.row.row.id);
    const message = () => {
      const current = snapshot();
      if (current.invalid) return current.invalid;
      if (current.conflict) return context.messages().cellConflict.replaceAll("{value}", current.conflict.current === null ? context.messages().noValue : String(current.conflict.current));
      return current.error ? context.messages().cellUpdateFailedDescription : null;
    };
    const content = () => cellProps.column.cell?.(snapshot().committed, cellProps.row.row.value()) ?? defaultCell(snapshot().committed);

    createEffect(() => {
      const next = accessor(cellProps.row.row.value());
      if (Object.is(next, incoming)) return;
      incoming = next;
      cellProps.record.controller.acceptRefetch(next);
      cellProps.record.sync();
    });

    function focusEditor(): void { queueMicrotask(() => editorElement?.focus({ preventScroll: true })); }
    function focusResting(): void {
      queueMicrotask(() => {
        restoringRestingFocus = true;
        try { restingElement?.focus({ preventScroll: true }); }
        finally { restoringRestingFocus = false; }
      });
    }
    function begin(): void {
      if (restoringRestingFocus || context.pending()) return;
      if (cellProps.record.controller.begin()) {
        cellProps.record.sync();
        focusEditor();
      }
    }
    function update(value: ColumnValue): void {
      cellProps.record.controller.setDraft(value);
      cellProps.record.sync();
    }
    async function finish(completion: Promise<CellCommitOutcome>, restore: boolean, notify = true): Promise<CellCommitOutcome> {
      cellProps.record.sync();
      const outcome = await completion;
      cellProps.record.sync();
      const current = snapshot();
      if (outcome === "accepted" && !current.editing && restore) focusResting();
      if ((outcome === "invalid" || outcome === "conflict") && restore) focusEditor();
      if (outcome === "failed" && notify) toaster.show({
        title: context.messages().cellUpdateFailed,
        description: context.messages().cellUpdateFailedDescription,
        tone: "danger",
        priority: "assertive",
        duration: null,
        action: {
          label: context.messages().retry,
          retryLabel: context.messages().retry,
          errorMessage: context.messages().retryFailed,
          run: async () => {
            const retried = await finish(cellProps.record.controller.retry(), false, false);
            if (retried !== "accepted") throw new Error(`Cell retry was not accepted: ${retried}`);
            focusResting();
          },
        },
      });
      return outcome;
    }
    function commitDraft(restore: boolean): void { void finish(cellProps.record.controller.commit(), restore); }
    function blur(): void {
      const current = snapshot();
      const unchangedFailure = (current.error !== null || current.conflict !== null) && current.attempt !== null && current.draft !== null && Object.is(current.attempt.value, current.draft.value);
      if (!unchangedFailure) commitDraft(false);
    }
    function keyDown(event: KeyboardEvent): void {
      if (event.key === "Enter") {
        event.preventDefault();
        commitDraft(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        cellProps.record.controller.discard();
        cellProps.record.sync();
        focusResting();
      }
    }
    function EditorControl(): JSX.Element {
      const invalid = () => snapshot().invalid !== null || snapshot().error !== null || undefined;
      const describedBy = () => message() ? `${id}-message` : undefined;
      if (activeEditor.type === "boolean") return <input ref={element => { editorElement = element; element.checked = draft() === true; }} class="sheen-data-table-editor sheen-data-table-editor-boolean" type="checkbox"
        aria-label={label()} aria-describedby={describedBy()} aria-invalid={invalid()} aria-busy={snapshot().pending || undefined} onBlur={blur} onKeyDown={keyDown} onChange={event => update(event.currentTarget.checked)} />;
      if (activeEditor.type === "select") return <select ref={element => { editorElement = element; element.value = draft() === null ? "" : String(draft()); }} class="sheen-data-table-editor"
        aria-label={label()} aria-describedby={describedBy()} aria-invalid={invalid()} aria-busy={snapshot().pending || undefined} onBlur={blur} onKeyDown={keyDown} onChange={event => update(event.currentTarget.value === "" && activeEditor.nullable ? null : event.currentTarget.value)}>
        <Show when={activeEditor.nullable}><option value="">{context.messages().noValue}</option></Show>
        <For each={activeEditor.options}>{option => <option value={option}>{option}</option>}</For>
      </select>;
      if (activeEditor.type === "number") return <input ref={element => { editorElement = element; element.value = draft() === null ? "" : String(draft()); }} class="sheen-data-table-editor" type="number" inputMode="decimal"
        aria-label={label()} aria-describedby={describedBy()} aria-invalid={invalid()} aria-busy={snapshot().pending || undefined} onBlur={blur} onKeyDown={keyDown}
        onInput={event => update(event.currentTarget.value === "" ? null : event.currentTarget.valueAsNumber)} />;
      return <input ref={element => { editorElement = element; element.value = draft() === null ? "" : String(draft()); }} class="sheen-data-table-editor" type="text"
        aria-label={label()} aria-describedby={describedBy()} aria-invalid={invalid()} aria-busy={snapshot().pending || undefined} onBlur={blur} onKeyDown={keyDown}
        onInput={event => update(event.currentTarget.value === "" && activeEditor.nullable ? null : event.currentTarget.value)} />;
    }
    return <span class="sheen-data-table-edit-value">
      <Show when={snapshot().editing} fallback={<span ref={element => { restingElement = element; element.addEventListener("focus", begin); if (element.ownerDocument.activeElement === element) queueMicrotask(begin); }} class="sheen-data-table-edit-rest" tabindex="0" aria-keyshortcuts="Enter" onClick={begin}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); begin(); } }}>{content()}</span>}>
        <EditorControl />
      </Show>
      <Show when={message()}>{value => <span id={`${id}-message`} class="sheen-data-table-edit-message" role={snapshot().invalid !== null || snapshot().conflict !== null ? "alert" : undefined}>{value()}</span>}</Show>
    </span>;
  }

  return {
    cell(row, column) {
      if (!column.editor) return undefined;
      const record = createMemo(() => {
        const value = row();
        return value ? recordFor(scope(), value.row, column) : undefined;
      });
      return {
        active: () => record() !== undefined,
        attributes: () => {
          const current = record()?.snapshot();
          if (!current) return {};
          return {
            "data-editable": "",
            ...(current.invalid !== null || current.error !== null ? { "data-invalid": "" } : {}),
            ...(current.stale ? { "data-stale": "" } : {}),
            ...(current.pending ? { "data-pending": "" } : {}),
            ...(current.conflict ? { "data-conflict": "" } : {}),
          };
        },
        render: value => <Show when={record()} keyed>{current => <EditableCellValue row={value()} column={column} record={current} />}</Show>,
      };
    },
    overlay: () => <Toaster controller={toaster} />,
  };
}

/** Client or delegated server grouping through the `grouping` prop. */
export const groupingFeature: DataTableFeature<"grouping"> = { id: "grouping", create: grouping };
/** Expandable row trees through the `hierarchy` prop. */
export const hierarchyFeature: DataTableFeature<"hierarchy"> = { id: "hierarchy", create: hierarchy };
/** Inline editing for columns that declare an editor, through `onCellCommit` and `editResetKey`. */
export const cellEditingFeature: DataTableFeature<"cellEditing"> = { id: "cellEditing", create: cellEditing };
