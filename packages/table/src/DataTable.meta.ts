import { defineMeta } from "../../ui/src/metadata.ts";
import type { DataTableProps } from "./DataTable.tsx";

interface ExampleRow { readonly id: string; readonly name: string; readonly amount: number }

export default defineMeta<DataTableProps<ExampleRow>>({
  name: "DataTable", package: "@gemologic/sheen-table", category: "data", summary: "Virtualized continuous or paginated data with phone cards, selection, layouts, groups, and trees.",
  props: {
    columns: { description: "Opaque column definitions returned by defineColumns." },
    getRowId: { description: "Returns a stable, unique, nonempty row ID." },
    caption: { description: "Required accessible table caption, visually hidden by default." },
    variant: { description: "Standalone frame or application-pane integration; omission follows context." },
    density: { description: "Optional table-local compact, comfortable, or spacious density. Omission inherits the surrounding application density." },
    pagination: { description: "False selects complete continuous results; page state selects numbered pagination. Client defaults false and server requires an explicit choice." },
    initialState: { description: "Optional initial query and column-layout state; pagination remains configured by the pagination prop." },
    filter: { description: "Optional app-owned accepted filter applied reactively without remounting retained rows; onAcceptedStateChange synchronizes table-authored changes." },
    rowHeight: { description: "CSS length for the fixed row block size or the minimum measured variable-row size.", default: "var(--sheen-table-row-h)" },
    variableRowHeight: { description: "Allows content-driven row heights and measures each realized row.", default: false },
    estimatedRowHeight: { description: "Positive CSS-pixel estimate used before measurement. Defaults to the active compact, comfortable, or spacious row token.", default: 34 },
    initialViewportHeight: { description: "Positive CSS-pixel viewport size used for deterministic server rendering and hydration.", default: 400 },
    class: { description: "Optional class merged onto the table region." },
    onAcceptedStateChange: { description: "Receives accepted query states and locally committed layout states; transient resize frames are excluded." },
    onRowActivate: { description: "Enables roving row focus and receives Enter activation for the focused row." },
    selection: { description: "Enables table-owned multiple selection, optional authorization-boundary resetKey, and immutable explicit-ID or query/exclusion payloads." },
    actions: { description: "One validated action model rendered in the bottom selection bar and each accepted row's context menu." },
    mobileLayout: { description: "Opt-in card presentation below 768px. Continuous results use local bounded pages of 20 cards by default; numbered tables keep their configured page." },
    grouping: { description: "Groups a complete continuous client view, or validates explicit full-query group metadata supplied with each delegated server page." },
    hierarchy: { description: "Provides synchronous children and optional app-loaded subtrees with independent cancellation, retry, stale-response rejection, and authorization reset." },
    search: { description: "Configures automatic search over explicitly searchable columns, or false disables it; options supply label, placeholder, debounce, shortcut, and an opt-in Exact mode that matches a literal phrase within one searchable column." },
    filterBar: { description: "Shows typed filters declared by columns; options may inject an isolated date editor without adding it to the table bundle.", default: true },
    columnControls: { description: "Shows the keyboard-accessible visibility, ordering, pinning, auto-fit, and width-reset menu.", default: true },
    export: { description: "Client export is enabled by default; false hides it, while options constrain formats and set a filename base." },
    onCellCommit: { description: "Required by editable columns; receives row/column context, a per-cell commit ID, previous/value snapshot, and AbortSignal, then reports acceptance or an explicit conflict." },
    editResetKey: { description: "Discards drafts, conflicts, failed attempts, and pending commits when an account or permission boundary changes." },
    mode: { description: "Client processes complete supplied data; server delegates the full query and requires pagination plus onStateChange.", default: "client" },
    data: { description: "Complete bounded client dataset. Available only in client mode." },
    initialResult: { description: "Optional authoritative server result used for SSR without a duplicate hydration request. Delegated grouping includes groups for the accepted page." },
    onStateChange: { description: "Server request adapter receiving complete state and an AbortSignal. Available only in server mode." },
    onExport: { description: "Optional server adapter returning a Blob for the captured accepted state and immutable selection. Server export UI is hidden without it." },
  },
  tokens: ["--sheen-table-row-h", "--sheen-color-border", "--sheen-color-bg", "--sheen-color-bg-raised"],
  a11y: { role: "table or treegrid, row, gridcell, columnheader, list, listitem, checkbox, toolbar, menu, separator, navigation, status", keyboard: ["Tab", "Shift+Tab", "Shift+F10", "ContextMenu", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", "Enter", "Space", "Shift+Space", "Control+A", "Meta+A"] },
  examples: [{
    title: "Bounded continuous data",
    setup: `const columns = defineColumns<{ readonly id: string; readonly name: string; readonly amount: number }>([
  { id: "name", header: "Name", accessor: row => row.name, search: true },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true },
]);
const rows = [{ id: "one", name: "Alpha", amount: 12 }, { id: "two", name: "Beta", amount: 34 }];`,
    code: '<DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Accounts" pagination={false} mobileLayout={{ pageSize: 20, titleColumn: "name" }} initialViewportHeight={160} />',
  }],
  composer: { allowedParentRegions: ["main-grid"], acceptedChildRegions: [], editableSafeProps: ["caption", "pagination", "density"], fixtureFactory: "records", codeGenerationAdapter: "records-table" },
  guidance: {
    do: ["Use continuous client mode for bounded local datasets.", "Use numbered server pagination for large or expensive remote results.", "Enable mobileLayout when a table must be functional on phones; tune its bounded continuous page size to row complexity.", "Supply full-query counts and aggregates when the server delegates grouping.", "Provide initialResult when server rendering already fetched the accepted page.", "Define row actions once so context, card overflow, and bulk paths cannot drift.", "Return complete server exports from onExport rather than walking pages in the component.", "Return explicit conflict results from onCellCommit instead of parsing transport error text.", "Change selection.resetKey, hierarchy.resetKey, export.resetKey, and editResetKey when the user's authorization or account boundary changes.", "Keep column controls enabled when users can drag, so every layout action has a keyboard path."],
    dont: ["Do not use pagination=false for an incomplete server response or infinite fetching.", "Do not render an unbounded phone card list; mobileLayout limits continuous pages to at most 100 cards.", "Do not calculate group totals from one server page.", "Do not paginate, sort, filter, or export one server page locally and present it as the complete query.", "Do not materialize all-matching selection by walking server pages or offer it for a hierarchy whose subtree query cannot be represented.", "Do not request server data for visibility, order, pin, or width-only changes."],
  },
});
