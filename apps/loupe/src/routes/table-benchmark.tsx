import { ThemeScope } from "@gemologic/sheen";
import type { ThemeOverrides } from "@gemologic/sheen";
import { DataTable, createClientView, defineColumns } from "@gemologic/sheen-table";
import type { ClientViewOptions, ClientViewState, ColumnValue, FilterNode, SheenColumns, SortColumn } from "@gemologic/sheen-table";
import { Show, createSignal, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { createTableBenchmarkRows, refreshTableBenchmarkRows, tableBenchmarkFixture } from "../../../../bench/fixtures/table.ts";
import type { TableBenchmarkRow } from "../../../../bench/fixtures/table.ts";

const rows = createTableBenchmarkRows();
const refreshedRows = refreshTableBenchmarkRows(rows);
const amountFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

interface BenchmarkCounts {
  readonly accessorReads: number;
  readonly searchProjectionReads: number;
  readonly cellRenders: number;
  readonly rowIdReads: number;
}

interface MutableBenchmarkCounts {
  accessorReads: number;
  searchProjectionReads: number;
  cellRenders: number;
  rowIdReads: number;
}

interface CoreProfile {
  readonly blankViewMs: number;
  readonly multiSortMs: number;
  readonly rankedSearchMs: number;
  readonly blankRows: number;
  readonly sortedRows: number;
  readonly searchRows: number;
  readonly valueReads: number;
  readonly searchProjectionReads: number;
}

const emptyCounts = (): BenchmarkCounts => Object.freeze({ accessorReads: 0, searchProjectionReads: 0, cellRenders: 0, rowIdReads: 0 });

function snapshotCounts(counts: MutableBenchmarkCounts): BenchmarkCounts {
  return Object.freeze({ ...counts });
}

function resetCounts(counts: MutableBenchmarkCounts): void {
  counts.accessorReads = 0;
  counts.searchProjectionReads = 0;
  counts.cellRenders = 0;
  counts.rowIdReads = 0;
}

function measuredAccessor<Value extends ColumnValue>(enabled: boolean, counts: MutableBenchmarkCounts, accessor: (row: TableBenchmarkRow) => Value): (row: TableBenchmarkRow) => Value {
  if (!enabled) return accessor;
  return row => {
    counts.accessorReads++;
    return accessor(row);
  };
}

function measuredSearch(enabled: boolean, counts: MutableBenchmarkCounts, project: (row: TableBenchmarkRow) => string): (row: TableBenchmarkRow) => string {
  if (!enabled) return project;
  return row => {
    counts.searchProjectionReads++;
    return project(row);
  };
}

function createColumns(profile: boolean, counts: MutableBenchmarkCounts): SheenColumns<TableBenchmarkRow> {
  const renderCell = (render: (value: ColumnValue, row: TableBenchmarkRow) => JSX.Element): ((value: ColumnValue, row: TableBenchmarkRow) => JSX.Element) => {
    if (!profile) return render;
    return (value: ColumnValue, row: TableBenchmarkRow) => {
      counts.cellRenders++;
      return render(value, row);
    };
  };
  return defineColumns<TableBenchmarkRow>([
    { id: "id", header: "ID", accessor: measuredAccessor(profile, counts, row => row.id), width: 160 },
    { id: "name", header: "Name", accessor: measuredAccessor(profile, counts, row => row.name), search: measuredSearch(profile, counts, row => row.name), width: 220, sort: "text", filter: { type: "text" },
      cell: renderCell((value, row) => <span class="loupe-table-benchmark-account"><strong>{String(value)}</strong><small>{row.id}</small></span>) },
    { id: "status", header: "Status", accessor: measuredAccessor(profile, counts, row => row.status), search: measuredSearch(profile, counts, row => row.status), width: 120, sort: "text",
      cell: renderCell(value => <span class="loupe-table-benchmark-status" data-status={String(value)}><span aria-hidden="true" />{String(value)}</span>) },
    { id: "region", header: "Region", accessor: measuredAccessor(profile, counts, row => row.region), search: measuredSearch(profile, counts, row => row.region), width: 120, sort: "text" },
    { id: "amount", header: "Amount", accessor: measuredAccessor(profile, counts, row => row.amount), width: 140, numeric: true, sort: "number", filter: { type: "number" },
      cell: renderCell(value => <span class="loupe-table-benchmark-amount">{typeof value === "number" ? amountFormatter.format(value) : ""}<small>{typeof value === "number" && value >= 0 ? "credit" : "debit"}</small></span>) },
    { id: "updated", header: "Updated", accessor: measuredAccessor(profile, counts, row => row.updatedAt), width: 180, numeric: true, sort: "date",
      cell: renderCell(value => typeof value === "number" ? <time datetime={new Date(value).toISOString()}>{dateFormatter.format(value)}</time> : "") },
  ]);
}

function profileCore(): CoreProfile {
  let valueReads = 0;
  let searchProjectionReads = 0;
  const getValue = (row: TableBenchmarkRow, column: string): ColumnValue => {
    valueReads++;
    if (column === "id") return row.id;
    if (column === "name") return row.name;
    if (column === "status") return row.status;
    if (column === "region") return row.region;
    if (column === "amount") return row.amount;
    if (column === "updated") return row.updatedAt;
    return null;
  };
  const getSearchValue = (row: TableBenchmarkRow, column: string): string | null => {
    searchProjectionReads++;
    if (column === "name") return row.name;
    if (column === "status") return row.status;
    if (column === "region") return row.region;
    return null;
  };
  const sortColumns: readonly SortColumn[] = Object.freeze([{ id: "name", type: "text" }, { id: "amount", type: "number" }]);
  const options: ClientViewOptions<TableBenchmarkRow> = Object.freeze({
    locale: "en-US",
    searchColumns: Object.freeze(["name", "status", "region"]),
    filterColumns: Object.freeze([]),
    sortColumns,
    getValue,
    getSearchValue,
  });
  const emptyFilter: FilterNode = Object.freeze({ kind: "and", children: Object.freeze([]) });
  const measure = (state: ClientViewState): { readonly duration: number; readonly rows: number } => {
    const start = performance.now();
    const view = createClientView(rows, state, options);
    return Object.freeze({ duration: performance.now() - start, rows: view.total });
  };
  createClientView(rows.slice(0, 1_000), { search: "", filter: emptyFilter, sorting: [], pagination: false }, options);
  valueReads = 0;
  searchProjectionReads = 0;
  const blank = measure({ search: "", filter: emptyFilter, sorting: [], pagination: false });
  const sorted = measure({ search: "", filter: emptyFilter, sorting: [{ column: "name", direction: "asc" }, { column: "amount", direction: "desc" }], pagination: false });
  const searched = measure({ search: "needle", filter: emptyFilter, sorting: [], pagination: false });
  return Object.freeze({
    blankViewMs: blank.duration,
    multiSortMs: sorted.duration,
    rankedSearchMs: searched.duration,
    blankRows: blank.rows,
    sortedRows: sorted.rows,
    searchRows: searched.rows,
    valueReads,
    searchProjectionReads,
  });
}

export default function TableBenchmarkFixture() {
  const [mounted, setMounted] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  const [data, setData] = createSignal(rows);
  const [scopeOverrides, setScopeOverrides] = createSignal<ThemeOverrides>({});
  const [reportedCounts, setReportedCounts] = createSignal<BenchmarkCounts>(emptyCounts());
  const [coreProfile, setCoreProfile] = createSignal<CoreProfile>();
  const counts: MutableBenchmarkCounts = { accessorReads: 0, searchProjectionReads: 0, cellRenders: 0, rowIdReads: 0 };
  let profile = false;
  let columns = createColumns(false, counts);
  let getRowId = (row: TableBenchmarkRow): string => row.id;
  onMount(() => {
    profile = new URL(window.location.href).searchParams.get("profile") === "true";
    setReady(true);
  });
  function mount(): void {
    resetCounts(counts);
    columns = createColumns(profile, counts);
    getRowId = profile ? row => { counts.rowIdReads++; return row.id; } : row => row.id;
    setMounted(true);
  }
  function refresh(): void {
    setData(current => current === rows ? refreshedRows : rows);
  }
  return <main class="loupe-data-table-page" data-benchmark-ready={ready() ? "true" : "false"}>
    <h1>DataTable benchmark</h1>
    <p>{tableBenchmarkFixture.rows} deterministic rows, {tableBenchmarkFixture.columns} visible columns, integrated compact density, {tableBenchmarkFixture.viewport.tableHeight}px viewport.</p>
    <div class="loupe-table-benchmark-controls">
      <button type="button" data-benchmark-mount onClick={mount}>Mount benchmark table</button>
      <button type="button" data-benchmark-refresh onClick={refresh}>Accept replacement rows</button>
      <button type="button" hidden data-benchmark-reset onClick={() => resetCounts(counts)}>Reset diagnostics</button>
      <button type="button" hidden data-benchmark-snapshot onClick={() => setReportedCounts(snapshotCounts(counts))}>Snapshot diagnostics</button>
      <button type="button" hidden data-benchmark-core-profile onClick={() => setCoreProfile(profileCore())}>Profile core processing</button>
      <button type="button" hidden data-benchmark-theme onClick={() => setScopeOverrides(current => ({ ...current, theme: "graphite" }))}>Change benchmark theme</button>
      <button type="button" hidden data-benchmark-locale onClick={() => setScopeOverrides(current => ({ ...current, locale: "tr-TR" }))}>Change benchmark locale</button>
      <output hidden data-benchmark-diagnostics>{JSON.stringify({ counts: reportedCounts(), core: coreProfile() ?? null })}</output>
    </div>
    <section class="loupe-table-benchmark-surface" aria-label="Table benchmark surface">
      <ThemeScope {...scopeOverrides()} density="compact" class="loupe-table-benchmark-scope">
        <Show when={mounted()}><DataTable data={data()} columns={columns} getRowId={getRowId} caption="Benchmark accounts" pagination={false} variant="integrated" search={{ debounce: 0 }}
          initialViewportHeight={tableBenchmarkFixture.viewport.tableHeight} export={false} columnControls={false} onRowActivate={() => {}} /></Show>
      </ThemeScope>
    </section>
  </main>;
}
