import { Button, Checkbox, ContextMenu, DropdownMenu, EmptyState, Glyph, Pagination, SearchInput, Skeleton, flashChange, useTheme } from "@gemologic/sheen";
import type { MenuItem, ShortcutAction } from "@gemologic/sheen";
import { createVirtualizer } from "@tanstack/solid-virtual";
import type { VirtualItem } from "@tanstack/solid-virtual";
import { For, Index, Show, createComputed, createEffect, createMemo, createSignal, createUniqueId, on, onCleanup, onMount, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { changeTableState } from "./table-state-changes.ts";
import { canMoveColumn, moveColumn, orderColumnStates, placeColumn } from "./column-layout.ts";
import { constrainedColumnValues, summarizedColumns } from "./constrained-columns.ts";
import type { ColumnDropPlacement, ColumnMoveDirection } from "./column-layout.ts";
import { columnStateSchema, readColumnDefinitions } from "./columns.ts";
import type { ColumnValue, SheenColumns } from "./columns.ts";
import { createClientView } from "./client-view.ts";
import type { ClientView } from "./client-view.ts";
import { formatSearchQuery, parseSearchQuery } from "./search.ts";
import type { SearchMode } from "./search.ts";
import { getPageRange, resolvePagination } from "./pagination.ts";
import type { PageResult, TablePagination } from "./pagination.ts";
import type { ServerRowGroup } from "./grouping.ts";
import { createTableRequests } from "./requests.ts";
import type { TableRequestOutcome } from "./requests.ts";
import { createTableSelection } from "./selection.ts";
import type { BulkSelection } from "./selection.ts";
import { parseTableState, serializeState } from "./table-state.ts";
import type { ColumnState, TableState } from "./table-state.ts";
import { filterBarFeature } from "./FilterBar.tsx";
import { DataTableToolbar } from "./DataTableToolbar.tsx";
import type { DataTableToolbarAction } from "./DataTableToolbar.tsx";
import { parseFilter, serializeFilter } from "./filter.ts";
import type { FilterNode } from "./filter.ts";
import type { FilterDateEditor } from "./FilterBar.tsx";
import { selectClientRows } from "./selection-client.ts";
import { createServerExport } from "./server-export.ts";
import type { ServerExportOutcome, TableExportRequest } from "./server-export.ts";
import type { CellCommitRequest, CellCommitResult } from "./cell-edit.ts";
import { resolveTableMessages } from "./messages.ts";
import { cellEditingFeature, createSnapshotSignal, createStableRows, defaultCell, groupingFeature, hierarchyFeature } from "./data-table-features.tsx";
import type { DataTableCellAttributes, DataTableCellBinding, DataTableFeature, DataTableFeatureContext, DataTablePresentation, DisplayDataRow, DisplayGroupRow, DisplayRow, StableRow } from "./data-table-features.tsx";

export interface DataTableResult<Row extends object> extends PageResult<Row> {
  readonly facets?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Required for delegated server grouping; describes the accepted page with full-group totals. */
  readonly groups?: readonly ServerRowGroup[];
}

export interface DataTableInitialState {
  readonly search?: string;
  readonly filter?: TableState["filter"];
  readonly sorting?: TableState["sorting"];
  readonly columns?: readonly ColumnState[];
}

export interface DataTableSelectionOptions<Row extends object> {
  readonly mode: "multiple";
  /** Receives a fresh immutable ID or query/exclusion payload after each user change. */
  readonly onChange: (selection: BulkSelection) => void;
  /** Overrides the localized stable-ID label used by each row checkbox. */
  readonly getRowLabel?: (row: Row) => string;
  /** Clear selection and loaded-row eligibility when an account or permission boundary changes. */
  readonly resetKey?: string | number;
}

export interface DataTableGroupingOptions {
  /** Accessor column whose scalar values define first-seen groups. */
  readonly by: string;
  readonly collapsible?: boolean;
  readonly defaultExpanded?: boolean;
  readonly getLabel?: (value: ColumnValue) => string;
}

export interface DataTableHierarchyOptions<Row extends object> {
  /** Return known child rows synchronously. Undefined represents an unloaded subtree. */
  readonly getChildren?: (row: Row) => readonly Row[] | undefined;
  /** Required with onLoadChildren so known leaves are not presented as expandable. */
  readonly hasChildren?: (row: Row) => boolean;
  readonly onLoadChildren?: (row: Row, signal: AbortSignal) => Promise<readonly Row[]>;
  readonly defaultExpanded?: boolean | readonly string[];
  /** Clear expansion and loaded subtrees when an account or permission boundary changes. */
  readonly resetKey?: string | number;
}

export type DataTableExportFormat = "csv" | "json";

export interface DataTableExportOptions {
  /** Formats shown in the export menu. Defaults to CSV and JSON. */
  readonly formats?: readonly DataTableExportFormat[];
  /** Download filename without an extension. Defaults to a slug derived from the caption. */
  readonly filename?: string;
  /** Aborts work and revokes the retained artifact when an account or permission boundary changes. */
  readonly resetKey?: string | number;
}

export interface DataTableCellCommitRequest<Row extends object> extends CellCommitRequest<ColumnValue> {
  readonly rowId: string;
  readonly row: Row;
  readonly column: string;
}

export interface DataTableActionContext<Row extends object> {
  /** Immutable explicit-ID or all-matching selection passed to the application action. */
  readonly selection: BulkSelection;
  /** Selected rows that are present in the accepted page/view. Never implies complete query materialization. */
  readonly loadedRows: readonly Row[];
  /** Row that opened a context menu. Omitted for the selection action bar. */
  readonly anchor?: Row;
}

export interface DataTableAction<Row extends object> {
  readonly id: string;
  readonly label: string;
  readonly shortcut?: string;
  readonly tone?: "neutral" | "accent" | "danger" | "success";
  readonly disabled?: boolean | ((context: DataTableActionContext<Row>) => boolean);
  readonly onSelect: (context: DataTableActionContext<Row>) => void;
}

export interface DataTableMobileLayoutOptions {
  /** Number of cards per local page in continuous mode. Numbered tables keep their configured page size. */
  readonly pageSize?: number;
  /** Visible column used as the card heading. Falls back to the first visible column when omitted or hidden. */
  readonly titleColumn?: string;
}

export type DataTableVariant = "integrated" | "framed";
export type DataTableDensity = "compact" | "comfortable" | "spacious";

export interface DataTableSearchOptions {
  /** Visible-to-assistive-technology input label. Defaults to a localized caption-specific label. */
  readonly label?: string;
  /** Input placeholder. Defaults to the resolved label. */
  readonly placeholder?: string;
  /** Trailing delay in milliseconds. Defaults to 120. */
  readonly debounce?: number;
  /** Optional application shortcut, for example mod+f. */
  readonly shortcut?: string;
  /** Enables a visible Smart/Exact control whose Exact mode matches one literal phrase within a searchable column. */
  readonly exactMatch?: boolean;
}

export interface DataTableFilterBarOptions {
  /** Optional date package adapter. Omission keeps the native date-input fallback and table bundle boundary. */
  readonly dateEditor?: FilterDateEditor;
}

interface DataTableBaseProps<Row extends object> {
  readonly columns: SheenColumns<Row>;
  readonly getRowId: (row: Row) => string;
  readonly caption: string;
  /** Framed is a standalone surface. Integrated joins application-pane chrome. DataTablePage supplies integrated context when omitted. */
  readonly variant?: DataTableVariant;
  /** Optional local density for table chrome and rows. Omission inherits the surrounding application density. */
  readonly density?: DataTableDensity;
  readonly pagination?: TablePagination;
  readonly initialState?: DataTableInitialState;
  /** Reactively applies an app-owned accepted filter. Use onAcceptedStateChange to keep table-authored changes synchronized. */
  readonly filter?: FilterNode;
  /** Row and cell height as a CSS length, such as `"2.75rem"` for two-line cells. Pair with `estimatedRowHeight` in pixels. */
  readonly rowHeight?: string;
  readonly variableRowHeight?: boolean;
  readonly estimatedRowHeight?: number;
  readonly initialViewportHeight?: number;
  readonly class?: string;
  readonly onAcceptedStateChange?: (state: TableState) => void;
  readonly onRowActivate?: (row: Row) => void;
  readonly selection?: DataTableSelectionOptions<Row>;
  /** One action model rendered in both the selection bar and each row context menu. */
  readonly actions?: readonly DataTableAction<Row>[];
  /** Opt into a card presentation below 768px. Continuous results receive bounded local paging. */
  readonly mobileLayout?: boolean | DataTableMobileLayoutOptions;
  readonly grouping?: DataTableGroupingOptions;
  readonly hierarchy?: DataTableHierarchyOptions<Row>;
  /** Configure global search declared by columns. False hides and disables table search. */
  readonly search?: false | DataTableSearchOptions;
  /** Show filters configured by column definitions in the table toolbar. */
  readonly filterBar?: boolean | DataTableFilterBarOptions;
  /** Show the keyboard-accessible visibility, order, pin, and sizing menu. */
  readonly columnControls?: boolean;
  /** Opt-in fields summarized only when the accepted filter fixes their value. Does not rewrite saved visibility. */
  readonly summarizeColumns?: readonly string[];
  /** Client exports are enabled by default. False hides them; options customize format and filename. */
  readonly export?: false | DataTableExportOptions;
  /** Commits values from columns that declare an editor. Required when any editor is present. */
  readonly onCellCommit?: (request: DataTableCellCommitRequest<Row>, signal: AbortSignal) => Promise<CellCommitResult<ColumnValue, string>>;
  /** Discards drafts and aborts commits when an account or permission boundary changes. */
  readonly editResetKey?: string | number;
}

export interface ClientDataTableProps<Row extends object> extends DataTableBaseProps<Row> {
  readonly mode?: "client";
  readonly data: readonly Row[];
  readonly initialResult?: never;
  readonly onStateChange?: never;
  readonly onExport?: never;
  readonly refreshKey?: never;
}

export interface ServerDataTableProps<Row extends object> extends DataTableBaseProps<Row> {
  readonly mode: "server";
  readonly pagination: TablePagination;
  readonly data?: never;
  readonly initialResult?: DataTableResult<Row>;
  readonly onStateChange: (state: TableState, signal: AbortSignal) => Promise<DataTableResult<Row>>;
  /** Change to revalidate the latest requested/accepted query without resetting layout or scroll. Initial value does not fetch. */
  readonly refreshKey?: string | number;
  /** Creates a complete server-side export for the captured accepted query and selection. Without this adapter, export UI is hidden. */
  readonly onExport?: (request: TableExportRequest, signal: AbortSignal) => Promise<Blob>;
}

export type DataTableProps<Row extends object> = ClientDataTableProps<Row> | ServerDataTableProps<Row>;

interface ScrollAnchor {
  readonly id: string;
  readonly index: number;
  readonly offset: number;
}

interface VirtualRow<Row extends object> {
  readonly row: DisplayRow<Row>;
  readonly item: VirtualItem;
}

function displayDataRow<Row extends object>(row: DisplayRow<Row>): DisplayDataRow<Row> | undefined {
  return row.kind === "data" ? row : undefined;
}

function displayGroupRow<Row extends object>(row: DisplayRow<Row>): DisplayGroupRow<Row> | undefined {
  return row.kind === "group" ? row : undefined;
}

function sameSelection(left: BulkSelection | undefined, right: BulkSelection | undefined): boolean {
  return left === right || JSON.stringify(left) === JSON.stringify(right);
}

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : "Table request failed";
}

function exportFormats(options: false | DataTableExportOptions | undefined): readonly DataTableExportFormat[] {
  if (options === false) return Object.freeze([]);
  const formats = options?.formats ?? ["csv", "json"];
  if (!Array.isArray(formats) || formats.length === 0) throw new Error("DataTable export formats must be a nonempty array");
  const unique = new Set<DataTableExportFormat>();
  for (const format of formats) {
    if (format !== "csv" && format !== "json") throw new Error("DataTable export formats must contain only csv or json");
    if (unique.has(format)) throw new Error("DataTable export formats must be unique");
    unique.add(format);
  }
  return Object.freeze([...unique]);
}

function exportBaseName(caption: string, options: false | DataTableExportOptions | undefined): string {
  const supplied = options === false ? undefined : options?.filename;
  if (supplied !== undefined) {
    if (typeof supplied !== "string" || !supplied.trim() || /[/\\]/u.test(supplied)) throw new Error("DataTable export filename must be nonempty and cannot contain path separators");
    return supplied.trim();
  }
  return caption.normalize("NFKD").replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-").replaceAll(/^-|-$/g, "").toLocaleLowerCase() || "table";
}

function exportResetKey(options: false | DataTableExportOptions | undefined): string | number | undefined {
  if (options === false) return undefined;
  const key = options?.resetKey;
  if (typeof key === "number" && !Number.isFinite(key)) throw new Error("DataTable export resetKey must be a finite number or string");
  return key;
}


function filterActive(filter: FilterNode): boolean {
  if (filter.kind === "and" || filter.kind === "or") return filter.children.some(filterActive);
  return true;
}

function validateActions<Row extends object>(actions: readonly DataTableAction<Row>[]): readonly DataTableAction<Row>[] {
  if (!Array.isArray(actions)) throw new Error("DataTable actions must be an array");
  const ids = new Set<string>();
  for (const action of actions) {
    if (typeof action.id !== "string" || !action.id.trim() || ids.has(action.id)) throw new Error("DataTable action IDs must be unique nonempty strings");
    ids.add(action.id);
    if (typeof action.label !== "string" || !action.label.trim()) throw new Error(`DataTable action ${action.id} requires a nonempty label`);
    if (typeof action.onSelect !== "function") throw new Error(`DataTable action ${action.id} requires onSelect`);
    if (action.shortcut !== undefined && (typeof action.shortcut !== "string" || !action.shortcut.trim())) throw new Error(`DataTable action ${action.id} has an invalid shortcut`);
    if (action.disabled !== undefined && typeof action.disabled !== "boolean" && typeof action.disabled !== "function") throw new Error(`DataTable action ${action.id} has an invalid disabled value`);
    if (action.tone !== undefined && action.tone !== "neutral" && action.tone !== "accent" && action.tone !== "danger" && action.tone !== "success") throw new Error(`DataTable action ${action.id} has an invalid tone`);
  }
  return actions;
}

interface ResolvedMobileLayout {
  readonly pageSize: number;
  readonly titleColumn?: string;
}

interface ResolvedSearchOptions {
  readonly label?: string;
  readonly placeholder?: string;
  readonly debounce: number;
  readonly shortcut?: string;
  readonly exactMatch: boolean;
}

function resolveSearchOptions(value: false | DataTableSearchOptions | undefined, searchableColumns: number): ResolvedSearchOptions | null {
  if (value === false || (value === undefined && searchableColumns === 0)) return null;
  if (searchableColumns === 0) throw new Error("DataTable search requires at least one searchable column");
  if (value === undefined) return Object.freeze({ debounce: 120, exactMatch: false });
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("DataTable search must be false or an options object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("DataTable search must be a plain options object");
  for (const key of Object.keys(value)) if (key !== "label" && key !== "placeholder" && key !== "debounce" && key !== "shortcut" && key !== "exactMatch") throw new Error(`DataTable search has unknown field ${key}`);
  if (value.label !== undefined && (typeof value.label !== "string" || !value.label.trim())) throw new Error("DataTable search label must be a nonempty string");
  if (value.placeholder !== undefined && (typeof value.placeholder !== "string" || !value.placeholder.trim())) throw new Error("DataTable search placeholder must be a nonempty string");
  const debounce = value.debounce ?? 120;
  if (!Number.isFinite(debounce) || debounce < 0 || debounce > 5_000) throw new Error("DataTable search debounce must be from 0 to 5000 milliseconds");
  if (value.shortcut !== undefined && (typeof value.shortcut !== "string" || !value.shortcut.trim())) throw new Error("DataTable search shortcut must be a nonempty string");
  if (value.exactMatch !== undefined && typeof value.exactMatch !== "boolean") throw new Error("DataTable search exactMatch must be boolean");
  return Object.freeze({
    debounce,
    exactMatch: value.exactMatch ?? false,
    ...(value.label === undefined ? {} : { label: value.label }),
    ...(value.placeholder === undefined ? {} : { placeholder: value.placeholder }),
    ...(value.shortcut === undefined ? {} : { shortcut: value.shortcut }),
  });
}

function resolveMobileLayout(value: boolean | DataTableMobileLayoutOptions | undefined): ResolvedMobileLayout | null {
  if (value === undefined || value === false) return null;
  if (value === true) return Object.freeze({ pageSize: 20 });
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("DataTable mobileLayout must be boolean or an options object");
  for (const key of Object.keys(value)) if (key !== "pageSize" && key !== "titleColumn") throw new Error(`DataTable mobileLayout has unknown field ${key}`);
  const pageSize = value.pageSize ?? 20;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("DataTable mobileLayout pageSize must be an integer from 1 to 100");
  if (value.titleColumn !== undefined && (typeof value.titleColumn !== "string" || !value.titleColumn.trim())) throw new Error("DataTable mobileLayout titleColumn must be a nonempty string");
  return Object.freeze({ pageSize, ...(value.titleColumn ? { titleColumn: value.titleColumn } : {}) });
}

function clientFacetRecord<Row>(view: ClientView<Row>): Readonly<Record<string, Readonly<Record<string, number>>>> {
  const result: Record<string, Readonly<Record<string, number>>> = {};
  for (const facet of view.facets) {
    const options: Record<string, number> = {};
    for (const option of facet.options) options[option.value] = option.count;
    result[facet.column] = Object.freeze(options);
  }
  return Object.freeze(result);
}

function initialTableState<Row extends object>(props: DataTableProps<Row>): TableState {
  const schema = columnStateSchema(props.columns);
  const definitions = readColumnDefinitions(props.columns);
  const pagination = resolvePagination(props.mode ?? "client", props.pagination);
  const state = parseTableState({
    search: props.initialState?.search ?? "",
    filter: props.filter ?? props.initialState?.filter ?? { kind: "and", children: [] },
    sorting: props.initialState?.sorting ?? [],
    pagination,
    columns: props.initialState?.columns ?? definitions.map(column => ({ id: column.id, visible: column.visible, width: typeof column.width === "number" ? column.width : null, pin: column.pin })),
  }, schema);
  for (const columnState of state.columns) {
    const definition = definitions.find(column => column.id === columnState.id);
    if (!definition) throw new Error(`Unknown table column: ${columnState.id}`);
    if (columnState.width !== null && ((definition.minWidth !== null && columnState.width < definition.minWidth) || (definition.maxWidth !== null && columnState.width > definition.maxWidth))) {
      throw new Error(`Initial width for ${columnState.id} must be within its column bounds`);
    }
    if (columnState.pin !== false && columnState.width === null && typeof definition.width !== "number") {
      throw new Error(`Pinned column ${columnState.id} requires an explicit numeric width`);
    }
  }
  return state;
}

function samePagination(left: TablePagination, right: TablePagination): boolean {
  return left === false ? right === false : right !== false && left.pageIndex === right.pageIndex && left.pageSize === right.pageSize;
}

function columnTrack(width: number | "fill" | "content", minimum: number | null, maximum: number | null): string {
  const min = minimum ?? 80;
  if (typeof width === "number") return `${width}px`;
  if (width === "content") return `minmax(${min}px, max-content)`;
  return `minmax(${min}px, ${maximum === null ? "1fr" : `min(1fr, ${maximum}px)`})`;
}

function clampColumnWidth(value: number, minimum: number | null, maximum: number | null): number {
  return Math.min(maximum ?? 4096, Math.max(minimum ?? 80, Math.round(value)));
}

export function DataTable<Row extends object>(props: DataTableProps<Row>): JSX.Element {
  return renderDataTable(props, [filterBarFeature, groupingFeature, hierarchyFeature, cellEditingFeature]);
}

/** Internal composition root. Features own their props, state, and rendering hooks; omitted features are not bundled. */
export function renderDataTable<Row extends object>(props: DataTableProps<Row>, features: readonly DataTableFeature[]): JSX.Element {
  if (props.mode === "server" && typeof props.onStateChange !== "function") throw new Error("Server mode requires onStateChange");
  if (props.mode !== "server" && !Array.isArray(props.data)) throw new Error("Client mode requires a complete data array");
  if (props.mode !== "server" && props.initialResult !== undefined) throw new Error("initialResult is available only in server mode");
  if (props.selection && (props.selection.mode !== "multiple" || typeof props.selection.onChange !== "function")) throw new Error("DataTable selection requires multiple mode and onChange");
  if (typeof props.selection?.resetKey === "number" && !Number.isFinite(props.selection.resetKey)) throw new Error("DataTable selection resetKey must be a finite number or string");
  if (props.grouping && props.hierarchy) throw new Error("DataTable grouping and hierarchy are separate presentation modes");
  if (typeof props.editResetKey === "number" && !Number.isFinite(props.editResetKey)) throw new Error("DataTable editResetKey must be a finite number or string");
  const variant = () => {
    const value: unknown = props.variant;
    if (value !== undefined && value !== "integrated" && value !== "framed") throw new Error("DataTable variant must be integrated or framed");
    return value;
  };
  const density = (): DataTableDensity | undefined => {
    const value: unknown = props.density;
    if (value !== undefined && value !== "compact" && value !== "comfortable" && value !== "spacious") throw new Error("DataTable density must be compact, comfortable, or spacious");
    return value;
  };
  const actions = createMemo(() => validateActions(props.actions ?? []));
  const configuredExportFormats = exportFormats(props.export);
  const configuredExportBaseName = exportBaseName(props.caption, props.export);
  let configuredExportResetKey = exportResetKey(props.export);
  const schema = columnStateSchema(props.columns);
  const tableId = createUniqueId();
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const messages = createMemo(() => resolveTableMessages(theme.messages()));
  const definitions = readColumnDefinitions(props.columns);
  const definitionById = new Map(definitions.map(column => [column.id, column]));
  const searchableDefinitions = definitions.filter(column => column.search !== null);
  const searchableDefinitionById = new Map(searchableDefinitions.map(column => [column.id, column]));
  const searchOptions = resolveSearchOptions(props.search, searchableDefinitions.length);
  const mobileLayout = resolveMobileLayout(props.mobileLayout);
  if (mobileLayout?.titleColumn && !definitions.some(column => column.id === mobileLayout.titleColumn)) throw new Error(`Unknown mobileLayout title column: ${mobileLayout.titleColumn}`);
  const initialState = initialTableState(props);
  const selection = props.selection ? createTableSelection(initialState.filter, schema.filterColumns) : undefined;
  let selectionAnchorId: string | undefined;
  let selectionSearch = initialState.search;
  let selectionResetKey = props.selection?.resetKey;
  const [clientState, setClientState] = createSignal(initialState);
  const [searchDraft, setSearchDraft] = createSignal(initialState.search);
  const [searchScheduled, setSearchScheduled] = createSignal(false);
  const [layoutColumns, setLayoutColumns] = createSignal(initialState.columns);
  const [clientExportError, setClientExportError] = createSignal<unknown>(null);
  const [lastDownload, setLastDownload] = createSignal<{ readonly href: string; readonly filename: string }>();
  const [coldVisible, setColdVisible] = createSignal(false);
  const [refreshVisible, setRefreshVisible] = createSignal(false);
  const [mobilePageIndex, setMobilePageIndex] = createSignal(0);
  let root: HTMLElement | undefined;
  let viewport: HTMLDivElement | undefined;
  let mobileViewport: HTMLDivElement | undefined;
  let tableElement: HTMLTableElement | undefined;
  let searchTimer: number | undefined;
  let searchComposing = false;

  const requests = props.mode === "server" && props.onStateChange
    ? createTableRequests<TableState, DataTableResult<Row>>(props.onStateChange, props.initialResult ? { state: initialState, result: props.initialResult } : undefined)
    : undefined;
  const serverExports = props.mode === "server" && props.onExport
    ? createServerExport<Blob>(schema, async (request, signal) => {
      const artifact = await props.onExport?.(request, signal);
      if (!(artifact instanceof Blob)) throw new Error("DataTable onExport must resolve to a Blob");
      return artifact;
    })
    : undefined;
  // Client export code loads on first use. Reset and disposal advance the generation so a late load cannot publish.
  let clientExportGeneration = 0;
  let clientExportInFlight = false;
  const server = requests ? createSnapshotSignal(requests.getSnapshot) : undefined;
  const serverSnapshot = () => server?.snapshot();
  const exportStore = serverExports ? createSnapshotSignal(serverExports.getSnapshot) : undefined;

  const getValue = (row: Row, columnId: string): ColumnValue => {
    const column = definitionById.get(columnId);
    return column?.accessor?.(row) ?? null;
  };
  const getSearchValue = (row: Row, columnId: string): string | number | null => {
    const column = searchableDefinitionById.get(columnId);
    return column?.search?.(row) ?? null;
  };
  const clientView = createMemo<ClientView<Row> | undefined>(() => props.mode === "server" ? undefined : createClientView(props.data ?? [], clientState(), {
    locale: locale(),
    searchColumns: searchableDefinitions.map(column => column.id),
    exactMatch: searchOptions?.exactMatch ?? false,
    filterColumns: schema.filterColumns,
    sortColumns: schema.sortColumns,
    getValue,
    getSearchValue,
  }));

  createEffect(() => {
    const view = clientView();
    if (!view || samePagination(clientState().pagination, view.pagination)) return;
    setClientState(state => parseTableState({ ...state, pagination: view.pagination }, schema));
  });

  onMount(() => {
    if (!requests || !server || serverSnapshot()?.accepted) return;
    void server.track(requests.request(initialState));
  });
  createEffect(() => {
    const nextResetKey = exportResetKey(props.export);
    if (Object.is(nextResetKey, configuredExportResetKey)) return;
    configuredExportResetKey = nextResetKey;
    serverExports?.clear();
    clientExportGeneration++;
    clientExportInFlight = false;
    exportStore?.sync();
    setClientExportError(null);
    const download = lastDownload();
    if (download) URL.revokeObjectURL(download.href);
    setLastDownload(undefined);
  });
  onCleanup(() => {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    requests?.dispose();
    clientExportGeneration++;
    serverExports?.dispose();
    const download = lastDownload();
    if (download) URL.revokeObjectURL(download.href);
  });

  const acceptedState = createMemo<TableState>(() => {
    const state = serverSnapshot()?.accepted?.state ?? clientState();
    return Object.freeze({ ...state, columns: layoutColumns() });
  });
  const result = (): DataTableResult<Row> => {
    const accepted = serverSnapshot()?.accepted?.result;
    if (accepted) return accepted;
    const view = clientView();
    return view ? { rows: view.rows, total: view.total, facets: clientFacetRecord(view) } : { rows: [], total: 0 };
  };
  const acceptedAvailable = (): boolean => props.mode !== "server" || serverSnapshot()?.accepted !== null;
  const busy = (): boolean => searchScheduled() || (serverSnapshot()?.pending ?? false);
  const pending = (): boolean => busy() || searchDraft() !== acceptedState().search || Boolean(acceptedAvailable() && serverSnapshot()?.requested);
  const previous = (): boolean => pending() && acceptedAvailable();
  const error = (): unknown => serverSnapshot()?.error;

  onMount(() => {
    createEffect(() => {
      const waiting = busy();
      const accepted = acceptedAvailable();
      setColdVisible(false);
      setRefreshVisible(false);
      if (!waiting) return;
      const timer = window.setTimeout(() => {
        if (accepted) setRefreshVisible(true);
        else setColdVisible(true);
      }, accepted ? 500 : 200);
      onCleanup(() => window.clearTimeout(timer));
    });
  });

  async function transition(next: TableState): Promise<TableRequestOutcome | "client"> {
    if (!requests || !server) {
      setClientState(next);
      props.onAcceptedStateChange?.(Object.freeze({ ...next, columns: layoutColumns() }));
      return "client";
    }
    const outcome = await server.track(requests.request(next));
    const accepted = requests.getSnapshot().accepted;
    if (outcome === "accepted" && accepted) props.onAcceptedStateChange?.(Object.freeze({ ...accepted.state, columns: layoutColumns() }));
    return outcome;
  }

  createEffect(on(() => props.filter, filter => {
    if (filter === undefined) return;
    const parsed = parseFilter(filter, schema.filterColumns);
    const current = serverSnapshot()?.requested ?? acceptedState();
    if (serializeFilter(parsed, schema.filterColumns) === serializeFilter(current.filter, schema.filterColumns)) return;
    const pagination = current.pagination === false ? false : { ...current.pagination, pageIndex: 0 };
    const next = parseTableState({ ...current, filter: parsed, pagination }, schema);
    setMobilePageIndex(0);
    void transition(next).then(outcome => {
      if (outcome === "accepted" || outcome === "client") viewport?.scrollTo({ top: 0 });
    });
  }, { defer: true }));

  createEffect(on(() => props.refreshKey, () => {
    if (!requests) return;
    const snapshot = requests.getSnapshot();
    void transition(snapshot.requested ?? snapshot.accepted?.state ?? initialState);
  }, { defer: true }));

  const searchLabel = () => (searchOptions?.label ?? messages().searchTable).replaceAll("{caption}", props.caption);
  const searchPlaceholder = () => (searchOptions?.placeholder ?? searchLabel()).replaceAll("{caption}", props.caption);
  const searchShortcut = createMemo<ShortcutAction | undefined>(() => searchOptions?.shortcut ? Object.freeze({
    keys: searchOptions.shortcut,
    scope: "global",
    label: searchLabel(),
    group: messages().tableShortcuts,
  }) : undefined);
  const searchQuery = createMemo(() => parseSearchQuery(searchDraft(), searchOptions?.exactMatch ?? false));
  const searchMode = () => searchQuery().mode;
  const searchModeItems = createMemo<readonly MenuItem[]>(() => [{
    kind: "radio",
    id: "search-mode",
    label: messages().searchMatchMode,
    value: searchMode(),
    onValueChange: value => changeSearchMode(value),
    options: [
      { id: "ranked", label: messages().searchRanked },
      { id: "exact", label: messages().searchExact },
    ],
  }]);

  function changeSearchMode(value: string): void {
    if (value !== "ranked" && value !== "exact") throw new Error(`Unsupported DataTable search mode ${JSON.stringify(value)}`);
    const mode: SearchMode = value;
    updateSearchDraft(formatSearchQuery(searchQuery().value, mode));
  }

  function cancelSearchSchedule(): void {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = undefined;
  }

  function scheduleSearch(query: string): void {
    if (!searchOptions) return;
    cancelSearchSchedule();
    const request = serverSnapshot();
    if (query === acceptedState().search && (!request?.pending || request.requested?.search === query)) {
      setSearchScheduled(false);
      return;
    }
    setSearchScheduled(true);
    searchTimer = window.setTimeout(() => {
      searchTimer = undefined;
      if (searchComposing || searchDraft() !== query) return;
      setSearchScheduled(false);
      const requested = serverSnapshot()?.requested;
      const basis = requested ? Object.freeze({ ...requested, columns: layoutColumns() }) : acceptedState();
      const next = changeTableState(basis, { kind: "query", change: { kind: "search", value: query } }, schema);
      setMobilePageIndex(0);
      void transition(next).then(outcome => {
        if (outcome === "accepted" || outcome === "client") viewport?.scrollTo({ top: 0 });
      });
    }, searchOptions.debounce);
  }

  function updateSearchDraft(query: string): void {
    setSearchDraft(query);
    if (searchComposing) {
      cancelSearchSchedule();
      setSearchScheduled(false);
      return;
    }
    scheduleSearch(query);
  }

  function startSearchComposition(): void {
    searchComposing = true;
    cancelSearchSchedule();
    setSearchScheduled(false);
  }

  function finishSearchComposition(query: string): void {
    searchComposing = false;
    setSearchDraft(query);
    scheduleSearch(query);
  }

  function requestPage(pageIndex: number): void {
    const current = acceptedState();
    if (current.pagination === false || pending()) return;
    const next = changeTableState(current, { kind: "query", change: { kind: "pagination", value: { ...current.pagination, pageIndex } } }, schema);
    void transition(next).then(outcome => {
      if (outcome !== "accepted" && outcome !== "client") return;
      viewport?.scrollTo({ top: 0 });
      mobileViewport?.scrollIntoView({ block: "nearest" });
    });
  }

  function requestSort(column: string, multiple: boolean): void {
    const requested = serverSnapshot()?.requested;
    const basis = requested ? Object.freeze({ ...requested, columns: layoutColumns() }) : acceptedState();
    const next = changeTableState(basis, { kind: "sortCycle", column, multiple }, schema);
    setMobilePageIndex(0);
    void transition(next);
  }

  function requestFilter(filter: FilterNode): void {
    if (pending()) return;
    const next = changeTableState(acceptedState(), { kind: "query", change: { kind: "filter", value: filter } }, schema);
    setMobilePageIndex(0);
    void transition(next).then(outcome => { if (outcome === "accepted" || outcome === "client") viewport?.scrollTo({ top: 0 }); });
  }

  function clearQuery(): void {
    if (pending()) return;
    cancelSearchSchedule();
    setSearchScheduled(false);
    setSearchDraft("");
    const current = acceptedState();
    const pagination = current.pagination === false ? false : { ...current.pagination, pageIndex: 0 };
    const next = parseTableState({ ...current, search: "", filter: { kind: "and", children: [] }, pagination }, schema);
    setMobilePageIndex(0);
    void transition(next).then(outcome => {
      if (outcome === "accepted" || outcome === "client") queueMicrotask(() => {
        const mobileTarget = mobileViewport && mobileViewport.getClientRects().length > 0 ? mobileViewport : undefined;
        (mobileTarget ?? viewport)?.focus({ preventScroll: true });
      });
    });
  }

  function retry(): void {
    if (!requests || !server || busy()) return;
    void server.track(requests.retry()).then(outcome => {
      const accepted = requests.getSnapshot().accepted;
      if (outcome === "accepted" && accepted) props.onAcceptedStateChange?.(Object.freeze({ ...accepted.state, columns: layoutColumns() }));
    });
  }

  const stableRows = createStableRows(props.getRowId, () => props.mode === "server" ? result().rows : props.data ?? []);
  const flatDisplayCache = new WeakMap<StableRow<Row>, DisplayDataRow<Row>>();
  function flatDisplayRow(row: StableRow<Row>, index: number, setSize: number): DisplayDataRow<Row> {
    const existing = flatDisplayCache.get(row);
    if (existing && existing.position === index + 1 && existing.setSize === setSize) return existing;
    const created: DisplayDataRow<Row> = Object.freeze({ kind: "data", key: `row:${row.id}`, row, parentId: null, depth: 1, position: index + 1, setSize, canExpand: false, expanded: false, unloaded: false, pending: false, error: null });
    flatDisplayCache.set(row, created);
    return created;
  }
  const featureContext: DataTableFeatureContext<Row> = Object.freeze({
    props,
    definitions,
    filterColumns: schema.filterColumns,
    messages,
    locale,
    pending,
    result,
    accepted: acceptedAvailable,
    acceptedFilter: () => acceptedState().filter,
    requestFilter,
    stableRows,
    createStableRows: (source: () => readonly Row[]) => createStableRows(props.getRowId, source),
    rowAt,
    rowIndex,
    focusRow,
  });
  const extensions = features.flatMap(feature => feature(featureContext) ?? []);
  const presentations = extensions.flatMap(extension => extension.presentation ? [extension.presentation] : []);
  if (presentations.length > 1) throw new Error("DataTable grouping and hierarchy are separate presentation modes");
  const presentation: DataTablePresentation<Row> | undefined = presentations[0];
  const treePresentation = presentation !== undefined;
  const cellExtensions = extensions.flatMap(extension => extension.cell ? [extension.cell] : []);
  const queryExtensions = extensions.flatMap(extension => extension.query ? [extension.query] : []);
  const overlays = extensions.flatMap(extension => extension.overlay ? [extension.overlay] : []);
  const flatResultRows = createMemo<readonly Row[]>(() => presentation ? Object.freeze([]) : result().rows);
  const serverFlatStableRows = createMemo<readonly StableRow<Row>[]>(() => props.mode === "server" && !presentation
    ? Object.freeze(flatResultRows().map((row, index) => stableRows.resolve(row, index)))
    : Object.freeze([]));
  function flatStableRow(index: number): StableRow<Row> | undefined {
    const row = flatResultRows()[index];
    if (!row) return undefined;
    return props.mode === "server" ? serverFlatStableRows()[index] : stableRows.resolve(row, index);
  }
  const rowCount = (): number => presentation ? presentation.rows().length : flatResultRows().length;
  function rowAt(index: number): DisplayRow<Row> | undefined {
    if (presentation) return presentation.rows()[index];
    const row = flatStableRow(index);
    return row ? flatDisplayRow(row, index, flatResultRows().length) : undefined;
  }
  /**
   * Callers pass the index they already know (the realized item, focused row, or scroll anchor), so keyboard
   * handling is O(1). The scan only runs when rows moved under a stale hint, at most once per accepted row change.
   */
  function rowIndex(key: string, hint?: number): number {
    if (hint !== undefined && hint >= 0 && rowAt(hint)?.key === key) return hint;
    if (presentation) return presentation.rows().findIndex(row => row.key === key);
    if (!key.startsWith("row:")) return -1;
    const id = key.slice("row:".length);
    return flatResultRows().findIndex(row => props.getRowId(row) === id);
  }
  const loadedRows = createMemo<readonly StableRow<Row>[]>(() => presentation
    ? presentation.rows().flatMap(row => row.kind === "data" ? [row.row] : [])
    : props.mode === "server" ? serverFlatStableRows()
    : selection || actions().length > 0 ? flatResultRows().map((row, index) => stableRows.resolve(row, index)) : Object.freeze([]));
  const loadedIds = createMemo<ReadonlySet<string>>(() => new Set(loadedRows().map(row => row.id)));
  const [selectionPayload, setSelectionPayload] = createSignal<BulkSelection | undefined>(selection?.getPayload(), { equals: sameSelection });
  // The accepted boundary (reset key, search, filter, and loaded rows) drives selection eligibility before rows render.
  createComputed(() => {
    const ids = loadedIds();
    const resetKey = props.selection?.resetKey;
    const state = acceptedState();
    if (!selection) return;
    untrack(() => {
      if (!Object.is(resetKey, selectionResetKey) || state.search !== selectionSearch) {
        selection.reset();
        selectionAnchorId = undefined;
      }
      selectionResetKey = resetKey;
      selectionSearch = state.search;
      selection.setFilter(state.filter);
      selection.setLoadedIds([...ids]);
      setSelectionPayload(selection.getPayload());
    });
  });
  let notifiedSelection = selectionPayload();
  // Boundary-driven clears reach the application here; user changes notify directly in publishSelection.
  createEffect(on(selectionPayload, payload => {
    if (!payload || payload === notifiedSelection) return;
    notifiedSelection = payload;
    props.selection?.onChange(payload);
  }, { defer: true }));
  function publishSelection(): void {
    if (!selection) return;
    const payload = selection.getPayload();
    notifiedSelection = payload;
    setSelectionPayload(payload);
    props.selection?.onChange(payload);
  }
  const selectionMarks = createMemo<ReadonlySet<string>>(() => {
    const payload = selectionPayload();
    return new Set(payload?.kind === "query" ? payload.excluded : payload?.ids ?? []);
  });
  function rowSelected(id: string): boolean {
    const payload = selectionPayload();
    if (!payload) return false;
    return payload.kind === "query" ? loadedIds().has(id) && !selectionMarks().has(id) : selectionMarks().has(id);
  }
  function selectionAnchorLoaded(id: string): boolean {
    return loadedIds().has(id);
  }
  function changeRowSelection(id: string, selected: boolean, range: boolean): void {
    if (!selection || pending()) return;
    if (range && selectionAnchorId !== undefined && selectionAnchorLoaded(selectionAnchorId)) selection.selectRange(selectionAnchorId, id, selected);
    else {
      selection.setSelected(id, selected);
      selectionAnchorId = id;
    }
    publishSelection();
  }
  function selectLoadedRows(selected: boolean): void {
    if (!selection || pending()) return;
    selection.selectLoaded(selected);
    publishSelection();
  }
  function selectAllMatchingRows(): void {
    if (!selection || pending() || acceptedState().search.length > 0) return;
    selection.selectAllMatching();
    publishSelection();
  }
  function clearSelection(): void {
    if (!selection) return;
    selection.clear();
    selectionAnchorId = undefined;
    publishSelection();
  }
  const selectedLoadedCount = createMemo(() => {
    const payload = selectionPayload();
    if (!payload) return 0;
    const loaded = loadedIds();
    let marked = 0;
    for (const id of selectionMarks()) if (loaded.has(id)) marked++;
    return payload.kind === "query" ? loaded.size - marked : marked;
  });
  const selectionActive = createMemo(() => {
    const payload = selectionPayload();
    return payload?.kind === "query" || Boolean(payload?.ids.length);
  });

  function rowActionSelection(row: StableRow<Row>): BulkSelection {
    const payload = selectionPayload();
    if (selection && payload && rowSelected(row.id) && selectionActive()) return payload;
    return Object.freeze({ kind: "ids", ids: Object.freeze([row.id]) });
  }

  function actionContext(anchor?: StableRow<Row>): DataTableActionContext<Row> {
    const payload = anchor ? rowActionSelection(anchor) : selectionPayload();
    if (!payload) throw new Error("DataTable selection actions require an active selection");
    const selectedRows = loadedRows()
      .filter(row => payload.kind === "query" ? !payload.excluded.includes(row.id) : payload.ids.includes(row.id))
      .map(row => row.value());
    return Object.freeze({ selection: payload, loadedRows: Object.freeze(selectedRows), ...(anchor ? { anchor: anchor.value() } : {}) });
  }

  function actionDisabled(action: DataTableAction<Row>, context: DataTableActionContext<Row>): boolean {
    return pending() || (typeof action.disabled === "function" ? action.disabled(context) : action.disabled === true);
  }

  function prepareContextSelection(row: StableRow<Row>): void {
    if (!selection || pending() || rowSelected(row.id)) return;
    selection.clear();
    selection.setSelected(row.id, true);
    selectionAnchorId = row.id;
    publishSelection();
  }

  function rowActionItems(row: StableRow<Row>): readonly MenuItem[] {
    const context = actionContext(row);
    return actions().map(action => ({
      kind: "action",
      id: action.id,
      label: action.label,
      ...(action.shortcut ? { shortcut: action.shortcut } : {}),
      disabled: actionDisabled(action, context),
      onSelect: () => action.onSelect(context),
    }));
  }

  const selectionCount = createMemo(() => {
    const payload = selectionPayload();
    if (!payload) return 0;
    return payload.kind === "query" ? Math.max(0, result().total - payload.excluded.length) : payload.ids.length;
  });
  const [selectionBarPresent, setSelectionBarPresent] = createSignal(false);
  const [selectionBarOpen, setSelectionBarOpen] = createSignal(false);
  let selectionBarTimer: number | undefined;
  createEffect(() => {
    const active = selectionActive();
    if (selectionBarTimer !== undefined) window.clearTimeout(selectionBarTimer);
    selectionBarTimer = undefined;
    if (active) {
      setSelectionBarPresent(true);
      setSelectionBarOpen(true);
      return;
    }
    setSelectionBarOpen(false);
    if (selectionBarPresent()) selectionBarTimer = window.setTimeout(() => {
      selectionBarTimer = undefined;
      setSelectionBarPresent(false);
    }, 250);
  });
  onCleanup(() => { if (selectionBarTimer !== undefined) window.clearTimeout(selectionBarTimer); });

  function finishSelectionBarExit(event: AnimationEvent): void {
    if (event.target !== event.currentTarget || selectionBarOpen()) return;
    if (selectionBarTimer !== undefined) window.clearTimeout(selectionBarTimer);
    selectionBarTimer = undefined;
    setSelectionBarPresent(false);
  }

  function selectionLabel(row: StableRow<Row>): string {
    const label = props.selection?.getRowLabel?.(row.value()) ?? messages().selectRow.replaceAll("{id}", row.id);
    if (typeof label !== "string" || !label.trim()) throw new Error(`Selection label for ${row.id} must be nonempty`);
    return label;
  }
  const acceptedColumns = createMemo(() => acceptedState().columns);
  const acceptedColumnById = createMemo(() => new Map(acceptedColumns().map(column => [column.id, column])));
  const columnRecords = definitions.map((definition, index) => {
    const initial = initialState.columns.find(column => column.id === definition.id);
    if (!initial) throw new Error(`Missing initial state for table column: ${definition.id}`);
    const state = createMemo(() => acceptedColumnById().get(definition.id) ?? initial);
    return Object.freeze({ definition, state, variable: `--sheen-table-column-${index}`, sortDescriptionId: createUniqueId() });
  });
  const columnRecordById = new Map(columnRecords.map(column => [column.definition.id, column]));
  const orderedColumnStates = createMemo(() => orderColumnStates(acceptedColumns()));
  const summaryEligible = createMemo(() => {
    const ids = props.summarizeColumns ?? [];
    const unique = new Set<string>();
    for (const id of ids) {
      const definition = columnRecordById.get(id)?.definition;
      if (!definition?.accessor || !definition.filter || definition.editor || definition.sensitive || unique.has(id)) throw new Error("DataTable summarizeColumns requires unique, filterable, noneditable, nonsensitive accessor IDs");
      unique.add(id);
    }
    return unique;
  });
  const [restoredSummaries, setRestoredSummaries] = createSignal<ReadonlySet<string>>(new Set());
  const columnSummaries = createMemo(() => summaryEligible().size === 0 ? [] : summarizedColumns(orderedColumnStates(), constrainedColumnValues(acceptedState().filter), summaryEligible(), restoredSummaries()));
  const summarizedIds = createMemo(() => new Set(columnSummaries().map(item => item.column)), undefined, {
    equals: (previous, next) => previous.size === next.size && [...previous].every(id => next.has(id)),
  });
  const summaryLabel = (id: string): string => {
    const summary = columnSummaries().find(item => item.column === id);
    const definition = columnRecordById.get(id)?.definition;
    if (!summary || !definition) return "";
    const locale = theme.state().locale;
    const value = typeof summary.value === "number"
      ? summary.kind === "date" ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(summary.value) : new Intl.NumberFormat(locale).format(summary.value)
      : summary.value;
    return messages().constrainedColumn.replace(/\{(column|value|count)\}/gu, (_match: string, key: string) => key === "column" ? definition.header : key === "value" ? value : new Intl.NumberFormat(locale).format(result().total));
  };
  const restoreSummary = (id: string): void => {
    setRestoredSummaries(previous => new Set([...previous, id]));
    queueMicrotask(() => {
      const header = tableElement?.querySelector<HTMLElement>(`th[data-column="${CSS.escape(id)}"]`);
      if (header && header.getClientRects().length > 0) {
        const sort = header.querySelector<HTMLButtonElement>(".sheen-data-table-sort");
        if (sort) sort.focus({ preventScroll: true });
        else { header.tabIndex = -1; header.focus({ preventScroll: true }); }
      } else if (root) { root.tabIndex = -1; root.focus({ preventScroll: true }); }
    });
  };
  const visibleDefinitions = createMemo(() => {
    return orderedColumnStates().flatMap(state => {
      const record = columnRecordById.get(state.id);
      return record && state.visible && !summarizedIds().has(state.id) ? [record] : [];
    });
  });
  const availableExportFormats = createMemo<readonly DataTableExportFormat[]>(() => {
    const hasVisibleValue = visibleDefinitions().some(column => column.definition.accessor !== null);
    if (!hasVisibleValue || configuredExportFormats.length === 0) return Object.freeze([]);
    if (props.mode === "server" && !serverExports) return Object.freeze([]);
    return configuredExportFormats;
  });
  const serverExportSnapshot = () => exportStore?.snapshot();
  const exportPending = (): boolean => serverExportSnapshot()?.pending ?? false;
  const exportError = (): unknown => serverExportSnapshot()?.error ?? clientExportError();

  function publishDownload(blob: Blob, format: DataTableExportFormat): void {
    const previousDownload = lastDownload();
    const href = URL.createObjectURL(blob);
    const filename = `${configuredExportBaseName}.${format}`;
    setLastDownload({ href, filename });
    if (previousDownload) URL.revokeObjectURL(previousDownload.href);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
  }

  async function exportClient(format: DataTableExportFormat): Promise<void> {
    if (props.mode === "server" || clientExportInFlight) return;
    setClientExportError(null);
    // Capture the accepted view, selection, and columns at request time; only the code load is deferred.
    const generation = clientExportGeneration;
    clientExportInFlight = true;
    try {
      const view = clientView()?.view ?? [];
      const payload = selectionActive() ? selectionPayload() : undefined;
      const rows = payload ? selectClientRows(view, payload, { locale: locale(), filterColumns: schema.filterColumns, getRowId: props.getRowId, getValue }) : view;
      const columns = visibleDefinitions().flatMap(column => column.definition.accessor
        ? [{ id: column.definition.id, header: column.definition.header, value: column.definition.accessor }]
        : []);
      const { createClientExport } = await import("./export.ts");
      if (generation !== clientExportGeneration) return;
      const exported = createClientExport(rows, columns);
      const content = format === "csv" ? exported.toCSV() : exported.toJSON();
      publishDownload(new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" }), format);
    } catch (value) {
      if (generation === clientExportGeneration) setClientExportError(value);
    } finally {
      if (generation === clientExportGeneration) clientExportInFlight = false;
    }
  }

  async function finishServerExport(completion: Promise<ServerExportOutcome>): Promise<void> {
    const outcome = await (exportStore ? exportStore.track(completion) : completion);
    if (outcome !== "accepted") return;
    const accepted = serverExportSnapshot()?.accepted;
    if (accepted) publishDownload(accepted.artifact, accepted.request.format);
  }

  function exportServer(format: DataTableExportFormat): void {
    if (!serverExports || pending() || exportPending()) return;
    const payload = selectionActive() ? selectionPayload() ?? null : null;
    void finishServerExport(serverExports.request({ format, state: acceptedState(), selection: payload }));
  }

  function requestExport(format: DataTableExportFormat): void {
    if (pending() || exportPending()) return;
    if (props.mode === "server") exportServer(format);
    else void exportClient(format);
  }

  function retryExport(): void {
    if (!serverExports || pending() || exportPending()) return;
    void finishServerExport(serverExports.retry());
  }

  const exportMenuItems = createMemo<readonly MenuItem[]>(() => availableExportFormats().map(format => ({
    kind: "action",
    id: format,
    label: format === "csv" ? messages().exportCSV : messages().exportJSON,
    disabled: pending() || exportPending(),
    onSelect: () => requestExport(format),
  })));
  const resultNumber = createMemo(() => new Intl.NumberFormat(locale()));
  const resultCount = () => {
    if (!acceptedAvailable()) return undefined;
    const total = result().total;
    const template = total === 1 ? messages().resultCountOne : messages().resultCount;
    return template.replace("{count}", resultNumber().format(total));
  };
  function downloadLastExport(): void {
    const download = lastDownload();
    if (!download) return;
    const anchor = document.createElement("a");
    anchor.href = download.href;
    anchor.download = download.filename;
    anchor.click();
  }
  const track = (column: (typeof columnRecords)[number]): string => `var(${column.variable}, ${columnTrack(column.state().width ?? column.definition.width, column.definition.minWidth, column.definition.maxWidth)})`;
  const selectionTrack = "var(--sheen-table-selection-column, 2.75rem)";
  const template = createMemo(() => [...(selection ? [selectionTrack] : []), ...visibleDefinitions().map(track)].join(" "));

  function commitLayout(next: TableState): void {
    setLayoutColumns(next.columns);
    const base = serverSnapshot()?.accepted?.state ?? clientState();
    props.onAcceptedStateChange?.(Object.freeze({ ...base, columns: next.columns }));
  }

  function changeLayout(change: Parameters<typeof changeTableState>[1]): void {
    commitLayout(changeTableState(acceptedState(), change, schema));
  }

  function currentColumnWidth(column: (typeof columnRecords)[number]): number {
    const header = [...tableElement?.querySelectorAll<HTMLElement>("thead th[data-column]") ?? []].find(element => element.dataset.column === column.definition.id);
    const measured = header?.getBoundingClientRect().width;
    const fallback = column.state().width ?? (typeof column.definition.width === "number" ? column.definition.width : column.definition.minWidth ?? 160);
    return clampColumnWidth(measured && measured > 0 ? measured : fallback, column.definition.minWidth, column.definition.maxWidth);
  }

  function writeColumnWidth(column: (typeof columnRecords)[number], width: number | null): void {
    if (width === null) tableElement?.style.removeProperty(column.variable);
    else tableElement?.style.setProperty(column.variable, `${width}px`);
  }

  function setColumnWidth(column: (typeof columnRecords)[number], width: number | null): void {
    const resolved = width === null ? null : clampColumnWidth(width, column.definition.minWidth, column.definition.maxWidth);
    writeColumnWidth(column, resolved);
    changeLayout({ kind: "columnWidth", column: column.definition.id, width: resolved });
  }

  function autoFitColumn(column: (typeof columnRecords)[number]): void {
    const cells = [...tableElement?.querySelectorAll<HTMLElement>("[data-column]") ?? []].filter(element => element.dataset.column === column.definition.id);
    // Grid tracks size every cell to the current column width, so measure each cell at its content width to fit both wider and narrower content.
    const previous = cells.map(cell => cell.style.inlineSize);
    for (const cell of cells) cell.style.inlineSize = "max-content";
    const measured = cells.reduce((maximum, cell) => Math.max(maximum, Math.ceil(cell.getBoundingClientRect().width)), 0);
    cells.forEach((cell, index) => { cell.style.inlineSize = previous[index] ?? ""; });
    setColumnWidth(column, measured > 0 ? measured : currentColumnWidth(column));
  }

  function setColumnPin(column: (typeof columnRecords)[number], pin: ColumnState["pin"]): void {
    let next = acceptedState();
    if (pin !== false && column.state().width === null && typeof column.definition.width !== "number") {
      next = changeTableState(next, { kind: "columnWidth", column: column.definition.id, width: currentColumnWidth(column) }, schema);
    }
    next = changeTableState(next, { kind: "columnPin", column: column.definition.id, pin }, schema);
    commitLayout(next);
  }

  function moveLayoutColumn(id: string, direction: ColumnMoveDirection): void {
    const columns = moveColumn(acceptedState().columns, id, direction);
    if (columns === acceptedState().columns) return;
    const focused = tableElement?.ownerDocument.activeElement;
    changeLayout({ kind: "columnOrder", ids: columns.map(column => column.id) });
    if (focused instanceof HTMLElement && tableElement?.contains(focused)) queueMicrotask(() => { if (focused.isConnected) focused.focus({ preventScroll: true }); });
  }

  function placeLayoutColumn(sourceId: string, targetId: string, placement: ColumnDropPlacement): void {
    const columns = placeColumn(acceptedState().columns, sourceId, targetId, placement);
    const focused = tableElement?.ownerDocument.activeElement;
    changeLayout({ kind: "columnOrder", ids: columns.map(column => column.id) });
    if (focused instanceof HTMLElement && tableElement?.contains(focused)) queueMicrotask(() => { if (focused.isConnected) focused.focus({ preventScroll: true }); });
  }

  const columnMenuItems = createMemo<readonly MenuItem[]>(() => {
    const labels = messages();
    const state = acceptedState().columns;
    const visibleCount = state.filter(column => column.visible).length;
    return state.map(columnState => {
      const column = columnRecordById.get(columnState.id);
      if (!column) throw new Error(`Missing table column: ${columnState.id}`);
      const items: readonly MenuItem[] = [
        { kind: "checkbox", id: "visible", label: labels.showColumn, checked: columnState.visible && !summarizedIds().has(columnState.id), disabled: columnState.visible && visibleCount === 1, onCheckedChange: visible => {
          if (visible) setRestoredSummaries(previous => new Set([...previous, columnState.id]));
          changeLayout({ kind: "columnVisibility", column: columnState.id, visible });
        } },
        { kind: "action", id: "move-start", label: labels.moveColumnStart, disabled: !canMoveColumn(state, columnState.id, "toward-start"), onSelect: () => moveLayoutColumn(columnState.id, "toward-start") },
        { kind: "action", id: "move-end", label: labels.moveColumnEnd, disabled: !canMoveColumn(state, columnState.id, "toward-end"), onSelect: () => moveLayoutColumn(columnState.id, "toward-end") },
        { kind: "radio", id: "pin", label: labels.pinColumn, value: columnState.pin === false ? "none" : columnState.pin, onValueChange: value => {
          if (value !== "none" && value !== "start" && value !== "end") throw new Error("Invalid column pin action");
          setColumnPin(column, value === "none" ? false : value);
        }, options: [
          { id: "none", label: labels.pinNone },
          { id: "start", label: labels.pinStart },
          { id: "end", label: labels.pinEnd },
        ] },
        { kind: "action", id: "auto-fit", label: labels.autoFitColumn, disabled: !columnState.visible, onSelect: () => autoFitColumn(column) },
        { kind: "action", id: "reset-width", label: labels.resetColumnWidth, disabled: columnState.width === null || (columnState.pin !== false && typeof column.definition.width !== "number"), onSelect: () => setColumnWidth(column, null) },
      ];
      return { kind: "submenu", id: columnState.id, label: column.definition.header, items };
    });
  });
  const toolbarActions = createMemo<readonly DataTableToolbarAction[]>(() => {
    const next: DataTableToolbarAction[] = [];
    if (selection && (presentation?.allowSelectAll ?? true) && acceptedState().search.length === 0) next.push({ kind: "action", id: "select-all", label: messages().selectAll, disabled: pending(), onSelect: selectAllMatchingRows });
    if (availableExportFormats().length > 0) next.push({ kind: "menu", id: "export", label: messages().export, disabled: pending() || exportPending(), items: exportMenuItems() });
    if (lastDownload()) next.push({ kind: "action", id: "download", label: messages().downloadLastExport, onSelect: downloadLastExport });
    if (props.columnControls !== false) next.push({ kind: "menu", id: "columns", label: messages().columns, items: columnMenuItems() });
    return Object.freeze(next);
  });

  function pinOffset(column: (typeof columnRecords)[number]): string {
    const visible = visibleDefinitions();
    const index = visible.findIndex(candidate => candidate.definition.id === column.definition.id);
    if (index < 0 || column.state().pin === false) return "0px";
    const adjacent = column.state().pin === "start" ? visible.slice(0, index) : visible.slice(index + 1);
    const tracks = adjacent.filter(candidate => candidate.state().pin === column.state().pin).map(track);
    if (column.state().pin === "start" && selection) tracks.unshift(selectionTrack);
    return tracks.length === 0 ? "0px" : `calc(${tracks.join(" + ")})`;
  }

  function pinStyle(column: (typeof columnRecords)[number]): JSX.CSSProperties | undefined {
    if (column.state().pin === "start") return { "inset-inline-start": pinOffset(column) };
    if (column.state().pin === "end") return { "inset-inline-end": pinOffset(column) };
    return undefined;
  }

  function pinEdge(column: (typeof columnRecords)[number]): "start" | "end" | undefined {
    const visible = visibleDefinitions();
    if (column.state().pin === "start" && [...visible].reverse().find(candidate => candidate.state().pin === "start") === column) return "start";
    if (column.state().pin === "end" && visible.find(candidate => candidate.state().pin === "end") === column) return "end";
    return undefined;
  }

  let resizeSession: {
    readonly pointerId: number;
    readonly column: (typeof columnRecords)[number];
    readonly handle: HTMLButtonElement;
    readonly startX: number;
    readonly startWidth: number;
    readonly direction: 1 | -1;
    nextWidth: number;
    frame: number | undefined;
  } | undefined;

  function paintResize(): void {
    const session = resizeSession;
    if (!session) return;
    session.frame = undefined;
    writeColumnWidth(session.column, session.nextWidth);
    session.handle.setAttribute("aria-valuenow", String(session.nextWidth));
    session.handle.setAttribute("aria-valuetext", messages().columnWidthPixels.replace("{width}", String(session.nextWidth)));
  }

  function cancelResize(): void {
    const session = resizeSession;
    if (!session) return;
    if (session.frame !== undefined) cancelAnimationFrame(session.frame);
    writeColumnWidth(session.column, null);
    session.handle.removeAttribute("data-resizing");
    root?.removeAttribute("data-resizing");
    resizeSession = undefined;
  }

  function startResize(event: PointerEvent, column: (typeof columnRecords)[number]): void {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLButtonElement)) return;
    cancelResize();
    event.preventDefault();
    const handle = event.currentTarget;
    const width = currentColumnWidth(column);
    resizeSession = { pointerId: event.pointerId, column, handle, startX: event.clientX, startWidth: width, direction: theme.state().direction === "rtl" ? -1 : 1, nextWidth: width, frame: undefined };
    handle.setPointerCapture(event.pointerId);
    handle.setAttribute("data-resizing", "");
    root?.setAttribute("data-resizing", column.definition.id);
  }

  function moveResize(event: PointerEvent): void {
    const session = resizeSession;
    if (!session || session.pointerId !== event.pointerId) return;
    session.nextWidth = clampColumnWidth(session.startWidth + (event.clientX - session.startX) * session.direction, session.column.definition.minWidth, session.column.definition.maxWidth);
    if (session.frame === undefined) session.frame = requestAnimationFrame(paintResize);
  }

  function finishResize(event: PointerEvent): void {
    const session = resizeSession;
    if (!session || session.pointerId !== event.pointerId) return;
    if (session.frame !== undefined) cancelAnimationFrame(session.frame);
    resizeSession = undefined;
    writeColumnWidth(session.column, session.nextWidth);
    session.handle.setAttribute("aria-valuenow", String(session.nextWidth));
    session.handle.setAttribute("aria-valuetext", messages().columnWidthPixels.replace("{width}", String(session.nextWidth)));
    session.handle.removeAttribute("data-resizing");
    root?.removeAttribute("data-resizing");
    if (session.handle.hasPointerCapture(event.pointerId)) session.handle.releasePointerCapture(event.pointerId);
    setColumnWidth(session.column, session.nextWidth);
  }

  function resizeWithKeyboard(event: KeyboardEvent, column: (typeof columnRecords)[number]): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const minimum = column.definition.minWidth ?? 80;
    const maximum = column.definition.maxWidth ?? 4096;
    const current = currentColumnWidth(column);
    const step = event.shiftKey ? 50 : 10;
    const direction = theme.state().direction === "rtl" ? -1 : 1;
    const next = event.key === "ArrowRight" ? current + step * direction
      : event.key === "ArrowLeft" ? current - step * direction
      : event.key === "Home" ? minimum
      : event.key === "End" ? maximum
      : null;
    if (next === null) return;
    event.preventDefault();
    setColumnWidth(column, next);
  }

  let reorderSession: {
    readonly pointerId: number;
    readonly source: (typeof columnRecords)[number];
    readonly handle: HTMLButtonElement;
    readonly startX: number;
    readonly startY: number;
    target: (typeof columnRecords)[number] | undefined;
    placement: ColumnDropPlacement | undefined;
    dragging: boolean;
  } | undefined;
  function clearColumnDrag(): void {
    reorderSession = undefined;
    root?.removeAttribute("data-reordering");
    for (const header of tableElement?.querySelectorAll<HTMLElement>("th[data-drop-placement]") ?? []) header.removeAttribute("data-drop-placement");
  }
  function startColumnDrag(event: PointerEvent, column: (typeof columnRecords)[number]): void {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLButtonElement)) return;
    clearColumnDrag();
    const handle = event.currentTarget;
    reorderSession = { pointerId: event.pointerId, source: column, handle, startX: event.clientX, startY: event.clientY, target: undefined, placement: undefined, dragging: false };
    handle.setPointerCapture(event.pointerId);
  }
  function moveColumnDrag(event: PointerEvent): void {
    const session = reorderSession;
    if (!session || session.pointerId !== event.pointerId) return;
    if (!session.dragging && Math.hypot(event.clientX - session.startX, event.clientY - session.startY) < 5) return;
    session.dragging = true;
    event.preventDefault();
    root?.setAttribute("data-reordering", session.source.definition.id);
    const targetElement = session.handle.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("th[data-column]");
    const target = targetElement?.dataset.column ? columnRecordById.get(targetElement.dataset.column) : undefined;
    for (const header of tableElement?.querySelectorAll<HTMLElement>("th[data-drop-placement]") ?? []) if (header !== targetElement) header.removeAttribute("data-drop-placement");
    if (!target || target === session.source || target.state().pin !== session.source.state().pin || !targetElement) {
      session.target = undefined;
      session.placement = undefined;
      return;
    }
    const bounds = targetElement.getBoundingClientRect();
    const physicalAfter = event.clientX >= bounds.left + bounds.width / 2;
    session.target = target;
    session.placement = theme.state().direction === "rtl" ? physicalAfter ? "before" : "after" : physicalAfter ? "after" : "before";
    targetElement.setAttribute("data-drop-placement", session.placement);
  }
  function finishColumnDrag(event: PointerEvent): void {
    const session = reorderSession;
    if (!session || session.pointerId !== event.pointerId) return;
    const target = session.target;
    const placement = session.placement;
    const sourceId = session.source.definition.id;
    if (session.handle.hasPointerCapture(event.pointerId)) session.handle.releasePointerCapture(event.pointerId);
    clearColumnDrag();
    if (target && placement) placeLayoutColumn(sourceId, target.definition.id, placement);
  }
  function reorderWithKeyboard(event: KeyboardEvent, column: (typeof columnRecords)[number]): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    const towardStart = theme.state().direction === "rtl" ? event.key === "ArrowRight" : event.key === "ArrowLeft";
    moveLayoutColumn(column.definition.id, towardStart ? "toward-start" : "toward-end");
  }
  let columnMeasureFrame: number | undefined;
  onMount(() => {
    const synchronize = (): void => {
      columnMeasureFrame = undefined;
      for (const column of visibleDefinitions()) {
        const header = [...tableElement?.querySelectorAll<HTMLElement>("thead th[data-column]") ?? []].find(element => element.dataset.column === column.definition.id);
        header?.querySelector<HTMLElement>('[role="separator"]')?.setAttribute("aria-valuenow", String(currentColumnWidth(column)));
      }
    };
    const schedule = (): void => {
      if (columnMeasureFrame === undefined) columnMeasureFrame = requestAnimationFrame(synchronize);
    };
    const observer = new ResizeObserver(schedule);
    if (tableElement) observer.observe(tableElement);
    schedule();
    onCleanup(() => {
      observer.disconnect();
      if (columnMeasureFrame !== undefined) cancelAnimationFrame(columnMeasureFrame);
    });
  });
  onCleanup(() => { cancelResize(); clearColumnDrag(); });

  const rowHeight = props.rowHeight ?? "var(--sheen-table-row-h)";
  if (typeof rowHeight !== "string" || rowHeight.trim() === "") throw new Error("rowHeight must be a nonempty CSS length");
  const effectiveDensity = (): DataTableDensity => density() ?? theme.state().density;
  const estimatedRowHeight = (): number => props.estimatedRowHeight ?? (theme.state().theme === "studio"
    ? effectiveDensity() === "compact" ? 36 : effectiveDensity() === "spacious" ? 48 : 40
    : effectiveDensity() === "compact" ? 28 : effectiveDensity() === "spacious" ? 42 : 34);
  let measuredDensity = effectiveDensity();
  let measuredRowHeight = estimatedRowHeight();
  if (!Number.isFinite(measuredRowHeight) || measuredRowHeight <= 0) throw new Error("estimatedRowHeight must be a positive finite number");
  const initialViewportHeight = props.initialViewportHeight ?? 400;
  if (!Number.isFinite(initialViewportHeight) || initialViewportHeight <= 0) throw new Error("initialViewportHeight must be a positive finite number");
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    get count() { return rowCount(); },
    getScrollElement: () => viewport ?? null,
    estimateSize: () => measuredRowHeight,
    getItemKey: index => props.variableRowHeight ? rowAt(index)?.key ?? index : index,
    initialRect: { width: 1024, height: initialViewportHeight },
    overscan: 8,
    useAnimationFrameWithResizeObserver: true,
  });
  let virtualizerMounted = false;
  function bindVirtualRow(element: HTMLTableRowElement, index: number): void {
    element.setAttribute("data-index", String(index));
    if (virtualizerMounted && props.variableRowHeight) virtualizer.measureElement(element);
  }
  onMount(() => {
    virtualizerMounted = true;
    if (props.variableRowHeight) {
      for (const element of viewport?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-key]") ?? []) virtualizer.measureElement(element);
    }
  });
  createEffect(() => {
    const currentDensity = effectiveDensity();
    const height = estimatedRowHeight();
    if (!Number.isFinite(height) || height <= 0) throw new Error("estimatedRowHeight must be a positive finite number");
    const changed = height !== measuredRowHeight || currentDensity !== measuredDensity;
    measuredRowHeight = height;
    measuredDensity = currentDensity;
    if (virtualizerMounted && changed) virtualizer.measure();
  });
  const virtualRows = createMemo<ReadonlyMap<string, VirtualRow<Row>>>(() => {
    const rows = new Map<string, VirtualRow<Row>>();
    for (const item of virtualizer.getVirtualItems()) {
      const row = rowAt(item.index);
      if (row) rows.set(row.key, { row, item });
    }
    return rows;
  });
  // Rendered rows are keyed by stable display key, so a row's DOM survives position and data refreshes.
  const renderedKeys = createMemo<readonly string[]>(() => [...virtualRows().keys()], [], { equals: sameKeys });
  function virtualRow(key: string): VirtualRow<Row> {
    const row = virtualRows().get(key);
    if (!row) throw new Error(`Missing rendered table row: ${key}`);
    return row;
  }
  const [activeRowKey, setActiveRowKey] = createSignal<string | null>(null);
  let activeRowHint = -1;
  function activateRow(key: string, index: number): void {
    activeRowHint = index;
    setActiveRowKey(key);
  }
  const focusableRowKey = createMemo<string | null>(() => {
    if (!props.onRowActivate && !selection && !treePresentation && actions().length === 0) return null;
    const active = activeRowKey();
    return active && rowIndex(active, activeRowHint) >= 0 ? active : rowAt(0)?.key ?? null;
  });
  let focusFrame: number | undefined;
  function focusRow(index: number): void {
    const row = rowAt(index);
    if (!row || !viewport) return;
    activateRow(row.key, index);
    virtualizer.scrollToIndex(index, { align: "auto" });
    let attempts = 10;
    const realize = (): void => {
      focusFrame = undefined;
      const element = [...viewport?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-key]") ?? []].find(candidate => candidate.dataset.rowKey === row.key);
      if (element) {
        element.focus({ preventScroll: true });
        return;
      }
      attempts--;
      if (attempts > 0) focusFrame = requestAnimationFrame(realize);
    };
    if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(realize);
  }
  function handleRowKeyDown(event: KeyboardEvent, row: DisplayRow<Row>, index: number): void {
    if (event.target !== event.currentTarget || event.altKey) return;
    if (selection && !pending() && row.kind === "data" && (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      selectLoadedRows(true);
      return;
    }
    if (presentation?.keyDown(event, row, index, "table")) return;
    if (selection && !pending() && row.kind === "data" && !event.ctrlKey && !event.metaKey && event.key === " ") {
      event.preventDefault();
      changeRowSelection(row.row.id, !rowSelected(row.row.id), event.shiftKey);
      return;
    }
    if (props.onRowActivate && !pending() && row.kind === "data" && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      props.onRowActivate(row.row.value());
      return;
    }
    if (event.ctrlKey || event.metaKey || (event.shiftKey && !selection)) return;
    const current = rowIndex(row.key, index);
    if (current < 0) return;
    const page = Math.max(1, Math.floor((viewport?.clientHeight ?? estimatedRowHeight()) / estimatedRowHeight()));
    const last = Math.max(0, rowCount() - 1);
    const next = event.key === "ArrowDown" ? Math.min(last, current + 1)
      : event.key === "ArrowUp" ? Math.max(0, current - 1)
      : event.key === "PageDown" ? Math.min(last, current + page)
      : event.key === "PageUp" ? Math.max(0, current - page)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    const nextRow = rowAt(next);
    if (selection && row.kind === "data" && event.shiftKey && nextRow?.kind === "data") {
      if (!selectionAnchorId || !selectionAnchorLoaded(selectionAnchorId)) selectionAnchorId = row.row.id;
      selection.selectRange(selectionAnchorId, nextRow.row.id, true);
      publishSelection();
    }
    focusRow(next);
  }
  function handleRowClick(event: MouseEvent, row: DisplayRow<Row>): void {
    if (!selection || pending() || row.kind !== "data" || !(event.target instanceof Element) || event.target.closest("button, input, select, textarea, a, [data-sheen-selection-control]")) return;
    if (event.shiftKey) changeRowSelection(row.row.id, true, true);
    else if (event.ctrlKey || event.metaKey) changeRowSelection(row.row.id, !rowSelected(row.row.id), false);
    else {
      selection.clear();
      selection.setSelected(row.row.id, true);
      selectionAnchorId = row.row.id;
      publishSelection();
    }
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true });
  }
  onCleanup(() => { if (focusFrame !== undefined) cancelAnimationFrame(focusFrame); });
  let scrollAnchor: ScrollAnchor | undefined;
  let anchorFrame: number | undefined;
  function captureScrollAnchor(): void {
    if (!viewport) return;
    if (!props.variableRowHeight && props.estimatedRowHeight === undefined) {
      // Fixed rows use the virtualizer's coordinates. The sticky header and
      // body's normal-flow header offset cancel at the visible row boundary.
      // Avoid querying and measuring every overscan row on each scroll frame.
      const top = viewport.scrollTop;
      const item = virtualizer.getVirtualItems().find(candidate => candidate.end > top);
      const row = item ? rowAt(item.index) : undefined;
      if (item && row) scrollAnchor = { id: row.key, index: item.index, offset: top - item.start };
      return;
    }
    const bounds = viewport.getBoundingClientRect();
    const visibleTop = viewport.querySelector("thead")?.getBoundingClientRect().bottom ?? bounds.top;
    const row = [...viewport.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-key]")].find(candidate => candidate.getBoundingClientRect().bottom > visibleTop);
    if (!row?.dataset.rowKey) return;
    const index = Number(row.dataset.index);
    const item = virtualizer.getVirtualItems().find(candidate => candidate.index === index);
    if (!item) return;
    scrollAnchor = { id: row.dataset.rowKey, index, offset: viewport.scrollTop - item.start };
  }
  function scheduleScrollAnchorCapture(): void {
    if (anchorFrame !== undefined) cancelAnimationFrame(anchorFrame);
    anchorFrame = requestAnimationFrame(() => {
      anchorFrame = undefined;
      captureScrollAnchor();
    });
  }
  onCleanup(() => { if (anchorFrame !== undefined) cancelAnimationFrame(anchorFrame); });
  const currentRowCollection = (): readonly DisplayRow<Row>[] | readonly Row[] => presentation ? presentation.rows() : flatResultRows();
  let previousRows = currentRowCollection();
  let previousState = serializeState(acceptedState(), schema);
  createEffect(() => {
    const nextRows = currentRowCollection();
    const nextState = serializeState(acceptedState(), schema);
    const anchor = scrollAnchor;
    if (viewport && anchor && nextRows !== previousRows && nextState === previousState) {
      const index = rowIndex(anchor.id, anchor.index);
      const offset = index < 0 ? undefined : virtualizer.getOffsetForIndex(index, "start")?.[0];
      if (offset !== undefined) viewport.scrollTop = Math.max(0, offset + anchor.offset);
    }
    previousRows = nextRows;
    previousState = nextState;
  });

  const range = createMemo(() => {
    const pagination = acceptedState().pagination;
    return pagination === false ? undefined : getPageRange(pagination, result().total);
  });
  const mobileRange = createMemo(() => {
    if (!mobileLayout || acceptedState().pagination !== false) return undefined;
    return getPageRange({ pageIndex: mobilePageIndex(), pageSize: mobileLayout.pageSize }, rowCount());
  });
  createEffect(() => {
    const current = mobileRange();
    if (current && current.pageIndex !== mobilePageIndex()) setMobilePageIndex(current.pageIndex);
  });
  const mobileRows = createMemo<readonly DisplayRow<Row>[]>(() => {
    if (!mobileLayout) return Object.freeze([]);
    const current = mobileRange();
    const start = current?.start ?? 0;
    const end = current?.end ?? rowCount();
    const rows: DisplayRow<Row>[] = [];
    for (let index = start; index < end; index++) {
      const row = rowAt(index);
      if (row) rows.push(row);
    }
    return Object.freeze(rows);
  });
  const mobileTitleColumn = createMemo(() => {
    const visible = visibleDefinitions();
    return visible.find(column => column.definition.id === mobileLayout?.titleColumn) ?? visible[0];
  });
  const mobileDataRows = createMemo(() => mobileRows().flatMap(row => row.kind === "data" ? [row.row] : []));
  const mobileSelectedCount = createMemo(() => mobileDataRows().filter(row => rowSelected(row.id)).length);
  const mobileSortItems = createMemo<readonly MenuItem[]>(() => visibleDefinitions().flatMap(column => {
    if (!column.definition.sort) return [];
    const direction = acceptedState().sorting.find(entry => entry.column === column.definition.id)?.direction;
    const state = direction === "asc" ? messages().sortedAscending : direction === "desc" ? messages().sortedDescending : messages().notSorted;
    return [{ kind: "action", id: `sort:${column.definition.id}`, label: `${messages().sortColumn.replaceAll("{column}", column.definition.header)}, ${state}`, disabled: pending(), onSelect: () => requestSort(column.definition.id, false) }];
  }));
  const mobileFocusableKey = createMemo(() => {
    const active = activeRowKey();
    return active && mobileRows().some(row => row.key === active) ? active : mobileRows()[0]?.key ?? null;
  });
  const queryActive = createMemo(() => acceptedState().search.length > 0 || filterActive(acceptedState().filter));
  const clearQueryLabel = () => acceptedState().search.length > 0 ? messages().clearSearchAndFilters : messages().clearFilters;
  const bodyState = createMemo<"cold" | "error" | "no-results" | "empty">(() => {
    if (!acceptedAvailable()) return error() ? "error" : "cold";
    return queryActive() ? "no-results" : "empty";
  });
  const footerRows = createMemo<readonly Row[]>(() => props.mode === "server" ? result().rows : clientView()?.view ?? []);
  const hasFooter = createMemo(() => visibleDefinitions().some(column => column.definition.footer !== null));
  const stateColumnCount = () => Math.max(1, visibleDefinitions().length + (selection ? 1 : 0));
  const logicalColumnCount = () => definitions.length + (selection ? 1 : 0);
  const coldRows = Object.freeze([0, 1, 2, 3, 4, 5]);
  const className = () => `sheen-data-table${props.class ? ` ${props.class}` : ""}`;
  function requestMobilePage(pageIndex: number): void {
    const current = mobileRange();
    if (!current || pending() || pageIndex < 0 || pageIndex >= current.pageCount || pageIndex === current.pageIndex) return;
    setMobilePageIndex(pageIndex);
    mobileViewport?.scrollIntoView({ block: "nearest" });
  }
  function selectMobileRows(selected: boolean): void {
    if (!selection || pending()) return;
    for (const row of mobileDataRows()) selection.setSelected(row.id, selected);
    publishSelection();
  }
  function focusMobileRow(index: number): void {
    const row = mobileRows()[index];
    if (!row || !mobileViewport) return;
    setActiveRowKey(row.key);
    const element = [...mobileViewport.querySelectorAll<HTMLElement>("[data-mobile-row-key]")].find(candidate => candidate.dataset.mobileRowKey === row.key);
    element?.focus({ preventScroll: true });
  }
  function handleMobileRowKeyDown(event: KeyboardEvent, row: DisplayRow<Row>): void {
    if (event.target !== event.currentTarget || event.altKey) return;
    if (selection && !pending() && row.kind === "data" && (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "a") {
      event.preventDefault();
      selectMobileRows(true);
      return;
    }
    const current = mobileRows().findIndex(candidate => candidate.key === row.key);
    if (presentation?.keyDown(event, row, current, "cards")) return;
    if (selection && !pending() && row.kind === "data" && !event.ctrlKey && !event.metaKey && event.key === " ") {
      event.preventDefault();
      changeRowSelection(row.row.id, !rowSelected(row.row.id), event.shiftKey);
      return;
    }
    if (props.onRowActivate && !pending() && row.kind === "data" && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      props.onRowActivate(row.row.value());
      return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    const last = Math.max(0, mobileRows().length - 1);
    const next = event.key === "ArrowDown" ? Math.min(last, current + 1)
      : event.key === "ArrowUp" ? Math.max(0, current - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null || current < 0) return;
    event.preventDefault();
    focusMobileRow(next);
  }
  function RowSelectionCell(cellProps: { readonly row: StableRow<Row> }): JSX.Element {
    let selectRange = false;
    return <td role={treePresentation ? "gridcell" : undefined} class="sheen-data-table-selection-cell" aria-colindex="1">
      <Checkbox data-sheen-selection-control="" class="sheen-data-table-selection-control" label={selectionLabel(cellProps.row)} checked={rowSelected(cellProps.row.id)} disabled={pending()}
        onPointerDown={event => { selectRange = event.shiftKey; }} onKeyDown={event => { if (event.key === " ") selectRange = event.shiftKey; }}
        onCheckedChange={checked => { changeRowSelection(cellProps.row.id, checked, selectRange); selectRange = false; }} />
    </td>;
  }
  function logicalColumnIndex(id: string): number {
    const index = orderedColumnStates().findIndex(column => column.id === id);
    if (index < 0) throw new Error(`Missing accepted state for table column: ${id}`);
    return index + 1 + (selection ? 1 : 0);
  }
  function logicalRowIndex(index: number): number {
    const pagination = acceptedState().pagination;
    if (treePresentation || pagination === false) return index + 2;
    return getPageRange(pagination, result().total).start + index + 2;
  }
  const logicalRowCount = (): number | undefined => rowCount() === 0
    ? undefined
    : treePresentation ? -1 : result().total + 1 + (hasFooter() ? 1 : 0);
  const footerRowIndex = (): number => treePresentation ? rowCount() + 2 : result().total + 2;
  function bindCell(row: () => DisplayDataRow<Row> | undefined, column: (typeof columnRecords)[number]): DataTableCellBinding<Row> | undefined {
    for (const extension of cellExtensions) {
      const binding = extension(row, column.definition);
      if (binding) return binding;
    }
    return undefined;
  }
  function DataCellContent(cellProps: { readonly row: DisplayDataRow<Row>; readonly column: (typeof columnRecords)[number]; readonly first: boolean; readonly cell: DataTableCellBinding<Row> | undefined; readonly host: () => HTMLElement | undefined }): JSX.Element {
    const definition = cellProps.column.definition;
    const input = createMemo(() => {
      const row = cellProps.row.row.value();
      return { row, value: definition.accessor?.(row) ?? null };
    }, undefined, { equals: (previous, next) => Object.is(previous.value, next.value) && (definition.cell === null
      || (definition.cellDependencies === null ? previous.row === next.row : definition.cellDependencies.every(key => Object.is(previous.row[key], next.row[key])))) });
    if (definition.flash) createEffect(on(() => ({ id: cellProps.row.row.id, value: input().value }), (next, previous) => {
      const element = cellProps.host();
      if (!element || !previous || previous.id !== next.id || typeof next.value !== "number" || typeof previous.value !== "number" || next.value === previous.value) return;
      flashChange(element, next.value > previous.value ? "up" : "down");
    }, { defer: true }));
    const content = () => cellProps.cell?.active() ? cellProps.cell.render(() => cellProps.row) : definition.cell?.(input().value, input().row) ?? defaultCell(input().value);
    const TreeCell = presentation?.TreeCell;
    if (!TreeCell || !cellProps.first) return <>{content()}</>;
    return <TreeCell row={cellProps.row}>{content()}</TreeCell>;
  }
  function GroupCellContent(cellProps: { readonly row: DisplayGroupRow<Row>; readonly column: (typeof columnRecords)[number]; readonly labelColumn: boolean }): JSX.Element {
    const GroupCell = presentation?.GroupCell;
    return GroupCell ? <GroupCell row={cellProps.row} column={cellProps.column.definition} label={cellProps.labelColumn} /> : null;
  }
  function MobileSelectionControl(controlProps: { readonly row: StableRow<Row> }): JSX.Element {
    let selectRange = false;
    return <Checkbox data-sheen-selection-control="" class="sheen-data-table-selection-control" label={selectionLabel(controlProps.row)} checked={rowSelected(controlProps.row.id)} disabled={pending()}
      onPointerDown={event => { selectRange = event.shiftKey; }} onKeyDown={event => { if (event.key === " ") selectRange = event.shiftKey; }}
      onCheckedChange={checked => { changeRowSelection(controlProps.row.id, checked, selectRange); selectRange = false; }} />;
  }
  function MobileCellContent(cellProps: { readonly row: DisplayRow<Row>; readonly column: (typeof columnRecords)[number]; readonly title: boolean }): JSX.Element {
    const data = () => displayDataRow(cellProps.row);
    const cell = bindCell(data, cellProps.column);
    const attributes = (): DataTableCellAttributes => cell?.attributes() ?? {};
    let host: HTMLDivElement | undefined;
    return <Show when={data()} fallback={<Show when={displayGroupRow(cellProps.row)}>{group => <div class="sheen-data-table-mobile-value" data-column={cellProps.column.definition.id} data-align={cellProps.column.definition.align} data-numeric={cellProps.column.definition.numeric || undefined}>
      <GroupCellContent row={group()} column={cellProps.column} labelColumn={cellProps.title} />
    </div>}</Show>}>
      {current => <div ref={host} class="sheen-data-table-mobile-value" data-column={cellProps.column.definition.id} data-align={cellProps.column.definition.align} data-numeric={cellProps.column.definition.numeric || undefined}
        data-editable={attributes()["data-editable"]} data-invalid={attributes()["data-invalid"]} data-stale={attributes()["data-stale"]} data-pending={attributes()["data-pending"]} data-conflict={attributes()["data-conflict"]}>
        <DataCellContent row={current()} column={cellProps.column} first={cellProps.title} cell={cell} host={() => host} />
      </div>}
    </Show>;
  }
  function MobileCardBody(cardProps: { readonly row: DisplayRow<Row> }): JSX.Element {
    const data = () => displayDataRow(cardProps.row);
    const title = mobileTitleColumn;
    const details = () => visibleDefinitions().filter(column => column !== title());
    return <>
      <div class="sheen-data-table-mobile-card-header">
        <Show when={data()}>{value => <Show when={selection}><MobileSelectionControl row={value().row} /></Show>}</Show>
        <div class="sheen-data-table-mobile-title">
          <Show when={title()} fallback={data()?.row.id ?? displayGroupRow(cardProps.row)?.label ?? ""}>{column => <MobileCellContent row={cardProps.row} column={column()} title />}</Show>
        </div>
        <Show when={data()}>{value => <Show when={actions().length > 0}><DropdownMenu trigger={<Glyph name="more" />} triggerLabel={messages().rowActions.replaceAll("{id}", value().row.id)} items={rowActionItems(value().row)} disabled={pending()} /></Show>}</Show>
      </div>
      <Show when={details().length > 0}><dl class="sheen-data-table-mobile-fields">
        <For each={details()}>{column => <div class="sheen-data-table-mobile-field">
          <dt>{column.definition.header}</dt>
          <dd><MobileCellContent row={cardProps.row} column={column} title={false} /></dd>
        </div>}</For>
      </dl></Show>
    </>;
  }
  return <section ref={root} class={className()} data-variant={variant()} data-sheen-density={density()} data-mobile-layout={mobileLayout ? "" : undefined} data-variable-height={props.variableRowHeight ? "" : undefined} data-selection={selection ? "multiple" : undefined} data-pending={busy() ? "" : undefined} data-previous-results={previous() ? "" : undefined} aria-busy={busy() || undefined} style={{ "--sheen-data-table-initial-viewport-height": `${initialViewportHeight}px`, ...(props.rowHeight === undefined ? {} : { "--sheen-table-row-h": props.rowHeight }) }}>
    <Show when={acceptedAvailable() ? error() : null}>{value => <div class="sheen-data-table-error" role="alert"><span>{errorMessage(value())}</span><Button onClick={retry}>{messages().retry}</Button></div>}</Show>
    <Show when={exportError()}><div class="sheen-data-table-error" role="alert"><span>{messages().exportFailed}</span><Show when={serverExports}><Button onClick={retryExport}>{messages().retryExport}</Button></Show></div></Show>
    <DataTableToolbar label={messages().tableControls.replace("{caption}", props.caption)} result={resultCount()} resultPrevious={previous() ? messages().previousResults : undefined} actions={toolbarActions()}
      query={searchOptions || queryExtensions.some(query => query.visible()) || columnSummaries().length > 0 ? <>
        <Show when={searchOptions}><div class="sheen-data-table-search-field" data-search-mode={searchMode()}><SearchInput class="sheen-data-table-search" label={searchLabel()} placeholder={searchPlaceholder()} value={searchDraft()} shortcut={searchShortcut()} aria-busy={busy() || undefined}
          onValueChange={updateSearchDraft} onCompositionStart={startSearchComposition} onCompositionEnd={event => finishSearchComposition(event.currentTarget.value)} />
          <Show when={searchOptions?.exactMatch}><DropdownMenu class="sheen-data-table-search-mode-menu" trigger={<span>{searchMode() === "exact" ? messages().searchExact : messages().searchRanked}</span>}
            triggerLabel={`${messages().searchMatchMode}: ${searchMode() === "exact" ? messages().searchExact : messages().searchRanked}`} items={searchModeItems()} disabled={pending()} /></Show>
        </div></Show>
        <For each={queryExtensions}>{query => <Show when={query.visible()}>{query.render()}</Show>}</For>
        <Show when={columnSummaries().length > 0}><div class="sheen-data-table-constraints" role="group" aria-label={messages().constrainedColumns}>
          <For each={columnSummaries().map(item => item.column)}>{id => <span class="sheen-data-table-constraint"><span>{summaryLabel(id)}</span><Button size="sm" variant="ghost" aria-label={messages().restoreColumn.replaceAll("{column}", columnRecordById.get(id)?.definition.header ?? id)} onClick={() => restoreSummary(id)}>{messages().showColumn}</Button></span>}</For>
        </div></Show>
      </> : undefined}
      status={<Show when={exportPending()}><span class="sheen-data-table-export-status" role="status">{messages().preparingExport}</span></Show>} />
    <div class="sheen-data-table-frame">
      <Show when={refreshVisible()}><div class="sheen-data-table-refresh" role="status"><span>{messages().refreshing}</span></div></Show>
      <div class="sheen-data-table-viewport" ref={element => { viewport = element; }} tabindex="-1" onScroll={scheduleScrollAnchorCapture}>
      <table ref={tableElement} id={tableId} role={treePresentation ? "treegrid" : undefined} aria-multiselectable={treePresentation && selection ? true : undefined}
        aria-rowcount={logicalRowCount()} aria-colcount={logicalColumnCount()}>
        <caption>{props.caption}</caption>
        <thead><tr aria-rowindex="1" style={{ "grid-template-columns": template() }}>
          <Show when={selection}><th class="sheen-data-table-selection-cell" scope="col" role={treePresentation ? "columnheader" : undefined} aria-colindex="1">
            <Checkbox data-sheen-selection-control="" class="sheen-data-table-selection-control" label={messages().selectPage}
              checked={loadedRows().length > 0 && selectedLoadedCount() === loadedRows().length}
              indeterminate={selectedLoadedCount() > 0 && selectedLoadedCount() < loadedRows().length}
              disabled={pending() || loadedRows().length === 0} onCheckedChange={selectLoadedRows} />
          </th></Show>
          <For each={visibleDefinitions()}>{column => {
            const sorted = () => acceptedState().sorting.find(entry => entry.column === column.definition.id);
            const sortPosition = () => acceptedState().sorting.findIndex(entry => entry.column === column.definition.id) + 1;
            const sortDescription = () => {
              const direction = sorted()?.direction;
              const state = direction === "asc" ? messages().sortedAscending : direction === "desc" ? messages().sortedDescending : messages().notSorted;
              const count = acceptedState().sorting.length;
              return direction && count > 1 ? `${state}, ${messages().sortPriority.replace("{position}", String(sortPosition())).replace("{count}", String(count))}` : state;
            };
            const resizeLabel = () => messages().resizeColumn.replaceAll("{column}", column.definition.header);
            const reorderLabel = () => messages().reorderColumn.replaceAll("{column}", column.definition.header);
            const reportedWidth = () => column.state().width ?? (typeof column.definition.width === "number" ? column.definition.width : column.definition.minWidth ?? 160);
            return <th scope="col" role={treePresentation ? "columnheader" : undefined} aria-colindex={logicalColumnIndex(column.definition.id)} data-column={column.definition.id} data-pin={column.state().pin || undefined} data-pin-edge={pinEdge(column)} data-sort-direction={sorted()?.direction} data-sort-priority={sorted() ? sortPosition() : undefined} style={pinStyle(column)}
              aria-sort={sortPosition() === 1 ? sorted()?.direction === "asc" ? "ascending" : sorted()?.direction === "desc" ? "descending" : undefined : undefined}>
              <div class="sheen-data-table-header-content" title={column.definition.header}>
                <Show when={column.definition.sort} fallback={<span class="sheen-data-table-header-label">{column.definition.header}</span>}>
                  <button class="sheen-data-table-sort" type="button" disabled={pending()} aria-describedby={column.sortDescriptionId} onClick={event => requestSort(column.definition.id, event.shiftKey)}>
                    <span class="sheen-data-table-sort-label">{column.definition.header}</span>
                    <Show when={sorted()}>{value => <span class="sheen-data-table-sort-indicator" aria-hidden="true"><span class="sheen-data-table-sort-direction"><Glyph name={value().direction === "asc" ? "chevron-up" : "chevron-down"} /></span><Show when={acceptedState().sorting.length > 1}><span class="sheen-data-table-sort-priority">{sortPosition()}</span></Show></span>}</Show>
                  </button>
                  <span id={column.sortDescriptionId} class="sheen-data-table-state-label">{sortDescription()}</span>
                </Show>
                <button class="sheen-data-table-reorder" type="button" aria-label={reorderLabel()} onKeyDown={event => reorderWithKeyboard(event, column)}
                  onPointerDown={event => startColumnDrag(event, column)} onPointerMove={moveColumnDrag} onPointerUp={finishColumnDrag} onPointerCancel={clearColumnDrag}
                  onLostPointerCapture={() => { if (reorderSession?.source === column) clearColumnDrag(); }} aria-keyshortcuts="ArrowLeft ArrowRight"><span class="sheen-data-table-reorder-grip" aria-hidden="true" /></button>
              </div>
              <button class="sheen-data-table-resizer" type="button" role="separator" aria-label={resizeLabel()} aria-controls={tableId} aria-orientation="vertical"
                aria-valuemin={column.definition.minWidth ?? 80} aria-valuemax={column.definition.maxWidth ?? 4096} aria-valuenow={reportedWidth()} aria-valuetext={messages().columnWidthPixels.replace("{width}", String(reportedWidth()))}
                onPointerDown={event => startResize(event, column)} onPointerMove={moveResize} onPointerUp={finishResize} onPointerCancel={cancelResize}
                onLostPointerCapture={() => { if (resizeSession?.column === column) cancelResize(); }} onKeyDown={event => resizeWithKeyboard(event, column)} onDblClick={() => autoFitColumn(column)} />
            </th>;
          }}</For>
        </tr></thead>
        <Show when={rowCount() > 0} fallback={<tbody data-state={bodyState()}><tr class="sheen-data-table-empty" style={{ "grid-template-columns": template() }}><td colSpan={stateColumnCount()} aria-colindex="1" aria-colspan={logicalColumnCount()}>
          <Show when={bodyState() === "cold"}>
            <div class="sheen-data-table-cold" data-visible={coldVisible() ? "" : undefined} role={coldVisible() ? "status" : undefined}>
              <span class="sheen-data-table-state-label">{messages().loading}</span>
              <For each={coldRows}>{() => <div class="sheen-data-table-skeleton-row" style={{ "grid-template-columns": template() }}>
                <For each={Array.from({ length: stateColumnCount() })}>{() => <Skeleton />}</For>
              </div>}</For>
            </div>
          </Show>
          <Show when={bodyState() === "error"}><div class="sheen-data-table-state" role="alert"><strong>{messages().serverError}</strong><span>{errorMessage(error())}</span><Button onClick={retry}>{messages().retry}</Button></div></Show>
          <Show when={bodyState() === "no-results"}><EmptyState kind="no-results"><Button onClick={clearQuery}>{clearQueryLabel()}</Button></EmptyState></Show>
          <Show when={bodyState() === "empty"}><EmptyState kind="empty" /></Show>
        </td></tr></tbody>}>
          <tbody style={{ height: `${virtualizer.getTotalSize()}px` }}>
            <For each={renderedKeys()}>{key => {
              const entry = createMemo<VirtualRow<Row>>(previous => virtualRows().get(key) ?? previous, virtualRow(key));
              const row = createMemo(() => entry().row);
              const item = createMemo(() => entry().item);
              const dataRow = treePresentation ? () => displayDataRow(row()) : createMemo(() => displayDataRow(row()), undefined, {
                equals: (previous, next) => previous?.row === next?.row,
              });
              const groupRow = () => displayGroupRow(row());
              const labelColumn = () => {
                const visible = visibleDefinitions();
                return visible.some(column => column.definition.id === presentation?.labelColumn) ? presentation?.labelColumn : visible[0]?.definition.id;
              };
              function RowCells(): JSX.Element {
                return <>
                  <Show when={selection}>
                    <Show when={dataRow()} fallback={<td role={treePresentation ? "gridcell" : undefined} class="sheen-data-table-selection-cell" aria-colindex="1" aria-hidden="true" />}>
                      {value => <RowSelectionCell row={value().row} />}
                    </Show>
                  </Show>
                  <For each={visibleDefinitions()}>{column => {
                    const cell = bindCell(dataRow, column);
                    const attributes = (): DataTableCellAttributes => cell?.attributes() ?? {};
                    let host: HTMLTableCellElement | undefined;
                    return <td ref={host} role={treePresentation ? "gridcell" : undefined} aria-colindex={logicalColumnIndex(column.definition.id)} data-column={column.definition.id} data-pin={column.state().pin || undefined} data-pin-edge={pinEdge(column)} style={pinStyle(column)} data-align={column.definition.align} data-numeric={column.definition.numeric || undefined}
                      data-editable={attributes()["data-editable"]} data-invalid={attributes()["data-invalid"]}
                      data-stale={attributes()["data-stale"]} data-pending={attributes()["data-pending"]} data-conflict={attributes()["data-conflict"]}>
                      <Show when={dataRow()} fallback={<Show when={groupRow()}>{value => <GroupCellContent row={value()} column={column} labelColumn={column.definition.id === labelColumn()} />}</Show>}>
                        {value => <DataCellContent row={value()} column={column} first={column === visibleDefinitions()[0]} cell={cell} host={() => host} />}
                      </Show>
                    </td>;
                  }}</For>
                </>;
              }
              if (props.actions === undefined) return <tr data-row-key={key} data-row-id={dataRow()?.row.id} data-group-id={groupRow()?.group.id}
                data-index={item().index} data-selected={dataRow() && rowSelected(dataRow()?.row.id ?? "") ? "" : undefined}
                data-loading={dataRow()?.pending ? "" : undefined} data-load-error={dataRow() && dataRow()?.error !== null ? "" : undefined}
                tabIndex={focusableRowKey() === key ? 0 : props.onRowActivate || selection || treePresentation ? -1 : undefined}
                aria-rowindex={logicalRowIndex(item().index)}
                aria-level={treePresentation ? dataRow()?.depth ?? 1 : undefined}
                aria-posinset={treePresentation ? row().position : undefined} aria-setsize={treePresentation ? row().setSize : undefined}
                aria-expanded={groupRow()?.expanded ?? (dataRow()?.canExpand ? dataRow()?.expanded : undefined)}
                aria-selected={selection && dataRow() ? rowSelected(dataRow()?.row.id ?? "") : undefined}
                aria-busy={dataRow()?.pending ? true : undefined}
                onFocus={() => activateRow(key, item().index)} onKeyDown={event => handleRowKeyDown(event, row(), item().index)} onClick={event => handleRowClick(event, row())}
                ref={element => bindVirtualRow(element, item().index)}
                style={{ "grid-template-columns": template(), transform: `translateY(${item().start}px)`, "block-size": props.variableRowHeight ? undefined : rowHeight, "min-block-size": rowHeight }}>
                <RowCells />
              </tr>;
              const contextRow = dataRow();
              return <ContextMenu as="tr" items={contextRow ? rowActionItems(contextRow.row) : []} disabled={!contextRow || actions().length === 0 || pending()}
                onContextMenu={() => { const value = dataRow(); if (value) prepareContextSelection(value.row); }}
                data-row-key={key} data-row-id={dataRow()?.row.id} data-group-id={groupRow()?.group.id}
                data-index={item().index} data-selected={dataRow() && rowSelected(dataRow()?.row.id ?? "") ? "" : undefined}
                data-loading={dataRow()?.pending ? "" : undefined} data-load-error={dataRow() && dataRow()?.error !== null ? "" : undefined}
                tabIndex={focusableRowKey() === key ? 0 : props.onRowActivate || selection || treePresentation || actions().length > 0 ? -1 : undefined}
                aria-rowindex={logicalRowIndex(item().index)}
                aria-level={treePresentation ? dataRow()?.depth ?? 1 : undefined}
                aria-posinset={treePresentation ? row().position : undefined} aria-setsize={treePresentation ? row().setSize : undefined}
                aria-expanded={groupRow()?.expanded ?? (dataRow()?.canExpand ? dataRow()?.expanded : undefined)}
                aria-selected={selection && dataRow() ? rowSelected(dataRow()?.row.id ?? "") : undefined}
                aria-busy={dataRow()?.pending ? true : undefined}
                onFocus={() => activateRow(key, item().index)} onKeyDown={event => handleRowKeyDown(event, row(), item().index)} onClick={event => handleRowClick(event, row())}
                ref={element => {
                  if (!(element instanceof HTMLTableRowElement)) throw new Error("DataTable context rows must render as table rows");
                  bindVirtualRow(element, item().index);
                }}
                style={{ "grid-template-columns": template(), transform: `translateY(${item().start}px)`, "block-size": props.variableRowHeight ? undefined : rowHeight, "min-block-size": rowHeight }}>
                <RowCells />
              </ContextMenu>;
            }}</For>
          </tbody>
        </Show>
        <Show when={hasFooter()}><tfoot><tr aria-rowindex={footerRowIndex()} style={{ "grid-template-columns": template() }}>
          <Show when={selection}><td role={treePresentation ? "gridcell" : undefined} class="sheen-data-table-selection-cell" aria-colindex="1" aria-hidden="true" /></Show>
          <For each={visibleDefinitions()}>{column => <td role={treePresentation ? "gridcell" : undefined} aria-colindex={logicalColumnIndex(column.definition.id)} data-column={column.definition.id} data-pin={column.state().pin || undefined} data-pin-edge={pinEdge(column)} style={pinStyle(column)} data-align={column.definition.align} data-numeric={column.definition.numeric || undefined}>
            {typeof column.definition.footer === "function" ? column.definition.footer(footerRows()) : column.definition.footer ?? ""}
          </td>}</For>
        </tr></tfoot></Show>
      </table>
      </div>
      <Show when={mobileLayout}><div ref={element => { mobileViewport = element; }} class="sheen-data-table-mobile" tabindex="-1">
        <Show when={mobileRows().length > 0} fallback={<div class="sheen-data-table-mobile-state" data-state={bodyState()}>
          <Show when={bodyState() === "cold"}><div class="sheen-data-table-mobile-cold" data-visible={coldVisible() ? "" : undefined} role={coldVisible() ? "status" : undefined}>
            <span class="sheen-data-table-state-label">{messages().loading}</span>
            <For each={coldRows.slice(0, 3)}>{() => <div class="sheen-data-table-mobile-skeleton"><Skeleton /><Skeleton /><Skeleton /></div>}</For>
          </div></Show>
          <Show when={bodyState() === "error"}><div class="sheen-data-table-state" role="alert"><strong>{messages().serverError}</strong><span>{errorMessage(error())}</span><Button onClick={retry}>{messages().retry}</Button></div></Show>
          <Show when={bodyState() === "no-results"}><EmptyState kind="no-results"><Button onClick={clearQuery}>{clearQueryLabel()}</Button></EmptyState></Show>
          <Show when={bodyState() === "empty"}><EmptyState kind="empty" /></Show>
        </div>}>
          <Show when={Boolean(selection || mobileSortItems().length)}><div class="sheen-data-table-mobile-controls">
            <Show when={selection}><Checkbox data-sheen-selection-control="" class="sheen-data-table-selection-control" label={messages().selectPage}
              checked={mobileDataRows().length > 0 && mobileSelectedCount() === mobileDataRows().length}
              indeterminate={mobileSelectedCount() > 0 && mobileSelectedCount() < mobileDataRows().length}
              disabled={pending() || mobileDataRows().length === 0} onCheckedChange={selectMobileRows} /></Show>
            <Show when={mobileSortItems().length > 0}><DropdownMenu trigger={messages().sort} items={mobileSortItems()} disabled={pending()} /></Show>
          </div></Show>
          <div class="sheen-data-table-mobile-list" role="list" aria-label={messages().cardView.replaceAll("{caption}", props.caption)}>
            <Index each={mobileRows()}>{row => {
              const current = row;
              const data = () => displayDataRow(current());
              const interactive = Boolean(props.onRowActivate || selection || treePresentation || actions().length > 0);
              const tabIndex = () => interactive ? mobileFocusableKey() === current().key ? 0 : -1 : undefined;
              return <div class="sheen-data-table-mobile-card" role="listitem" data-mobile-row-key={current().key} data-mobile-row-id={data()?.row.id} data-mobile-group-id={displayGroupRow(current())?.group.id}
                data-selected={data() && rowSelected(data()?.row.id ?? "") ? "" : undefined} data-loading={data()?.pending ? "" : undefined} data-load-error={data() && data()?.error !== null ? "" : undefined}
                tabIndex={tabIndex()} aria-busy={data()?.pending ? true : undefined}
                onFocus={() => setActiveRowKey(current().key)} onKeyDown={event => handleMobileRowKeyDown(event, current())} onClick={event => handleRowClick(event, current())}>
                <MobileCardBody row={current()} />
              </div>;
            }}</Index>
          </div>
          <Show when={hasFooter()}><dl class="sheen-data-table-mobile-footer">
            <For each={visibleDefinitions().filter(column => column.definition.footer !== null)}>{column => <div class="sheen-data-table-mobile-field">
              <dt>{column.definition.header}</dt><dd>{typeof column.definition.footer === "function" ? column.definition.footer(footerRows()) : column.definition.footer}</dd>
            </div>}</For>
          </dl></Show>
          <Show when={mobileRange()}>{current => <Show when={current().pageCount > 1}><Pagination class="sheen-data-table-mobile-pagination" label={messages().cardView.replaceAll("{caption}", props.caption)} pageIndex={current().pageIndex} pageCount={current().pageCount} pending={busy()} disabled={previous()} onPageChange={requestMobilePage} /></Show>}</Show>
        </Show>
      </div></Show>
      <Show when={selectionBarPresent()}><div class="sheen-data-table-selection-actions" data-open={String(selectionBarOpen())} role="toolbar" aria-label={messages().selectionActions} aria-hidden={!selectionBarOpen() || undefined} inert={!selectionBarOpen()} onAnimationEnd={finishSelectionBarExit}>
        <strong>{messages().selectedCount.replaceAll("{count}", resultNumber().format(selectionCount()))}</strong>
        <For each={actions()}>{action => {
          const context = () => actionContext();
          return <Button size="sm" tone={action.tone ?? "neutral"} disabled={actionDisabled(action, context())} onClick={() => action.onSelect(actionContext())}>{action.label}</Button>;
        }}</For>
        <Button size="sm" variant="outline" onClick={clearSelection}>{messages().clearSelection}</Button>
      </div></Show>
    </div>
    <Show when={range()}>{page => <Pagination class="sheen-data-table-pagination" pageIndex={page().pageIndex} pageCount={page().pageCount} pending={busy()} disabled={previous()} onPageChange={requestPage} />}</Show>
    <For each={overlays}>{overlay => overlay()}</For>
  </section>;
}
