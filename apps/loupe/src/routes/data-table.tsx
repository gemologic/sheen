import { Button, ThemeScope } from "@gemologic/sheen";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { DataTableResult, ServerRowGroup, TableState } from "@gemologic/sheen-table";
import { createSignal } from "solid-js";

interface FixtureRow { readonly id: string; readonly name: string; readonly amount: number; readonly children?: readonly FixtureRow[]; readonly remote?: boolean }
interface GroupedRow { readonly id: string; readonly desk: string | null; readonly amount: number | null }

const columns = defineColumns<FixtureRow>([
  { id: "name", header: "Name", accessor: row => row.name, width: "fill", search: true, sort: "text" },
  { id: "amount", header: "Amount", accessor: row => row.amount, width: 120, numeric: true, sort: "number", cell: value => <strong>{value}</strong> },
]);
const variableColumns = defineColumns<FixtureRow>([
  { id: "name", header: "Measured content", accessor: row => row.name, width: "fill" },
]);
const interactionColumns = defineColumns<FixtureRow>([
  { id: "name", header: "Name", accessor: row => row.name, width: 180, minWidth: 100, maxWidth: 360, sort: "text" },
  { id: "amount", header: "Amount", accessor: row => row.amount, width: 130, minWidth: 80, maxWidth: 260, numeric: true, sort: "number" },
  { id: "identifier", header: "Identifier", accessor: row => row.id, width: 220, minWidth: 120, maxWidth: 320, sort: "text" },
]);
const groupedColumns = defineColumns<GroupedRow>([
  { id: "desk", header: "Desk", accessor: row => row.desk, width: "fill" },
  { id: "amount", header: "Amount", accessor: row => row.amount, width: 130, numeric: true, aggregate: "sum" },
]);
const continuousRows: readonly FixtureRow[] = Array.from({ length: 300 }, (_, index) => ({ id: `client-${index}`, name: `Client row ${index}`, amount: index * 5 }));
const variableRows: readonly FixtureRow[] = Array.from({ length: 80 }, (_, index) => ({
  id: `variable-${index}`,
  name: index % 3 === 0 ? `Variable row ${index}. ${"This content wraps to prove that measurement, not a fixed slot, determines the rendered block size. ".repeat(5)}` : `Variable row ${index}`,
  amount: index,
}));
const initialServerRows: readonly FixtureRow[] = Array.from({ length: 10 }, (_, index) => ({ id: `server-${index}`, name: `Server row ${index}`, amount: index * 10 }));
const initialGroupedServerRows: readonly GroupedRow[] = Array.from({ length: 10 }, (_, index) => ({ id: `server-${index}`, desk: "Alpha", amount: index * 10 }));
const initialGroupedServerResult: DataTableResult<GroupedRow> = {
  rows: initialGroupedServerRows,
  total: 55,
  groups: [{ value: "Alpha", rowIds: initialGroupedServerRows.map(row => row.id), count: 30, aggregates: [{ column: "amount", value: 4350 }] }],
};
const groupedRows: readonly GroupedRow[] = [
  { id: "group-a", desk: "Alpha", amount: 10 },
  { id: "group-b", desk: "Beta", amount: 7 },
  { id: "group-c", desk: "Alpha", amount: 20 },
  { id: "group-d", desk: null, amount: 0 },
];
const hierarchyRows: readonly FixtureRow[] = [
  { id: "tree-static", name: "Static parent", amount: 1, children: [{ id: "tree-static-child", name: "Static child", amount: 2 }] },
  { id: "tree-default", name: "Default remote parent", amount: 2, remote: true },
  { id: "tree-remote", name: "Remote parent", amount: 3, remote: true },
  { id: "tree-retry", name: "Retry parent", amount: 4, remote: true },
];

function parseResult(value: unknown): DataTableResult<FixtureRow> {
  if (typeof value !== "object" || value === null || !("rows" in value) || !Array.isArray(value.rows) || !("total" in value) || typeof value.total !== "number") throw new Error("Invalid DataTable response");
  const parsed: FixtureRow[] = [];
  for (const row of value.rows) {
    if (typeof row !== "object" || row === null || !("id" in row) || typeof row.id !== "string" || !("name" in row) || typeof row.name !== "string" || !("amount" in row) || typeof row.amount !== "number") throw new Error("Invalid DataTable row");
    parsed.push({ id: row.id, name: row.name, amount: row.amount });
  }
  return { rows: parsed, total: value.total };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGroupedResult(value: unknown): DataTableResult<GroupedRow> {
  if (!record(value) || !Array.isArray(value.rows) || typeof value.total !== "number" || !Array.isArray(value.groups)) throw new Error("Invalid grouped DataTable response");
  const rowValues: readonly unknown[] = value.rows;
  const rows: GroupedRow[] = [];
  for (const candidate of rowValues) {
    if (!record(candidate) || typeof candidate.id !== "string" || (typeof candidate.desk !== "string" && candidate.desk !== null) || (typeof candidate.amount !== "number" && candidate.amount !== null)) throw new Error("Invalid grouped DataTable row");
    rows.push({ id: candidate.id, desk: candidate.desk, amount: candidate.amount });
  }
  const groupValues: readonly unknown[] = value.groups;
  const groups: ServerRowGroup[] = [];
  for (const candidate of groupValues) {
    if (!record(candidate) || (typeof candidate.value !== "string" && typeof candidate.value !== "number" && typeof candidate.value !== "boolean" && candidate.value !== null) || !Array.isArray(candidate.rowIds) || typeof candidate.count !== "number" || !Array.isArray(candidate.aggregates)) throw new Error("Invalid grouped DataTable group");
    const rowIds: string[] = [];
    const rowIdValues: readonly unknown[] = candidate.rowIds;
    for (const rowId of rowIdValues) {
      if (typeof rowId !== "string") throw new Error("Invalid grouped DataTable row ID");
      rowIds.push(rowId);
    }
    const aggregates: { readonly column: string; readonly value: number | null }[] = [];
    const aggregateValues: readonly unknown[] = candidate.aggregates;
    for (const aggregate of aggregateValues) {
      if (!record(aggregate) || typeof aggregate.column !== "string" || (typeof aggregate.value !== "number" && aggregate.value !== null)) throw new Error("Invalid grouped DataTable aggregate");
      aggregates.push({ column: aggregate.column, value: aggregate.value });
    }
    groups.push({ value: candidate.value, rowIds, count: candidate.count, aggregates });
  }
  return { rows, total: value.total, groups };
}

async function requestServer(state: TableState, signal: AbortSignal, fail = false): Promise<DataTableResult<FixtureRow>> {
  if (state.pagination === false) throw new Error("Server fixture requires pages");
  const direction = state.sorting.find(entry => entry.column === "amount")?.direction ?? "none";
  const parameters = new URLSearchParams({ pageIndex: String(state.pagination.pageIndex), pageSize: String(state.pagination.pageSize), direction, search: state.search, fail: String(fail) });
  const response = await fetch(`/api/data-table?${parameters}`, { signal });
  if (!response.ok) throw new Error(`DataTable request failed (${response.status})`);
  return parseResult(await response.json());
}

async function requestGroupedServer(state: TableState, signal: AbortSignal): Promise<DataTableResult<GroupedRow>> {
  if (state.pagination === false) throw new Error("Grouped server fixture requires pages");
  const direction = state.sorting.find(entry => entry.column === "amount")?.direction ?? "none";
  const parameters = new URLSearchParams({ pageIndex: String(state.pagination.pageIndex), pageSize: String(state.pagination.pageSize), direction, fail: "false", grouped: "true" });
  const response = await fetch(`/api/data-table?${parameters}`, { signal });
  if (!response.ok) throw new Error(`Grouped DataTable request failed (${response.status})`);
  return parseGroupedResult(await response.json());
}

export default function DataTableFixture() {
  const [currentContinuousRows, setCurrentContinuousRows] = createSignal(continuousRows);
  const [pagedRows, setPagedRows] = createSignal<readonly FixtureRow[]>(continuousRows.slice(0, 25));
  const [activatedRow, setActivatedRow] = createSignal("None");
  const [density, setDensity] = createSignal<"compact" | "comfortable" | "spacious">("comfortable");
  const [columnState, setColumnState] = createSignal("Unchanged");
  const [columnDirection, setColumnDirection] = createSignal<"ltr" | "rtl">("ltr");
  const [selectionState, setSelectionState] = createSignal(JSON.stringify({ kind: "ids", ids: [] }));
  const [selectionAuthority, setSelectionAuthority] = createSignal("account-a");
  const [serverSelectionState, setServerSelectionState] = createSignal(JSON.stringify({ kind: "ids", ids: [] }));
  const [hierarchyAuthority, setHierarchyAuthority] = createSignal("account-a");
  let failNextServerRequest = false;
  const childAttempts = new Map<string, number>();
  const requestFallibleServer = (state: TableState, signal: AbortSignal): Promise<DataTableResult<FixtureRow>> => {
    const fail = failNextServerRequest;
    failNextServerRequest = false;
    return requestServer(state, signal, fail);
  };
  const requestChildren = async (row: FixtureRow, signal: AbortSignal): Promise<readonly FixtureRow[]> => {
    const attempt = (childAttempts.get(row.id) ?? 0) + 1;
    childAttempts.set(row.id, attempt);
    const fail = row.id === "tree-retry" && attempt === 1;
    const delay = row.id === "tree-remote" && attempt === 1 ? 80 : 5;
    const parameters = new URLSearchParams({ parent: row.id, attempt: String(attempt), delay: String(delay), fail: String(fail) });
    const response = await fetch(`/api/data-table-children?${parameters}`, row.id === "tree-remote" && attempt === 1 ? {} : { signal });
    if (!response.ok) throw new Error(`Child request failed (${response.status})`);
    return parseResult({ rows: await response.json(), total: 1 }).rows;
  };
  return <main class="loupe-data-table-page">
    <h1>DataTable modes</h1>
    <section aria-label="Continuous client example">
      <h2>Continuous bounded client data</h2>
        <div class="actions">
          <Button onClick={() => setCurrentContinuousRows(rows => [{ id: "client-prepended", name: "Prepended client row", amount: -5 }, ...rows])}>Prepend continuous row</Button>
          <Button onClick={() => setDensity("compact")}>Compact table</Button>
          <Button onClick={() => setDensity("spacious")}>Spacious table</Button>
        </div>
        <output aria-label="Activated client row">{activatedRow()}</output>
        <DataTable density={density()} data={currentContinuousRows()} columns={columns} getRowId={row => row.id} caption="Continuous client rows" pagination={false} initialViewportHeight={220} onRowActivate={row => setActivatedRow(row.id)} />
    </section>
    <section aria-label="Column interaction example">
      <h2>Column sizing and layout</h2>
      <Button onClick={() => setColumnDirection(direction => direction === "ltr" ? "rtl" : "ltr")}>Use {columnDirection() === "ltr" ? "RTL" : "LTR"} column layout</Button>
      <output aria-label="Accepted column layout">{columnState()}</output>
      <ThemeScope direction={columnDirection()}>
        <DataTable class="loupe-column-table" data={continuousRows.slice(0, 20)} columns={interactionColumns} getRowId={row => row.id} caption="Interactive columns" pagination={false}
          initialViewportHeight={180} onAcceptedStateChange={state => setColumnState(state.columns.map(column => `${column.id}:${column.visible ? "shown" : "hidden"}:${column.width ?? "default"}:${column.pin || "center"}`).join("|"))} />
      </ThemeScope>
    </section>
    <section aria-label="Variable-height client example">
      <h2>Measured variable-height rows</h2>
      <DataTable data={variableRows} columns={variableColumns} getRowId={row => row.id} caption="Variable-height client rows" pagination={false}
        variableRowHeight estimatedRowHeight={64} initialViewportHeight={220} />
    </section>
    <section aria-label="Grouped client example">
      <h2>Grouped client data</h2>
      <DataTable data={groupedRows} columns={groupedColumns} getRowId={row => row.id} caption="Grouped client rows" pagination={false} initialViewportHeight={300}
        grouping={{ by: "desk", getLabel: value => value === null ? "Unassigned" : String(value) }} />
    </section>
    <section aria-label="Grouped server example">
      <h2>Delegated grouped server data</h2>
      <DataTable mode="server" columns={groupedColumns} getRowId={row => row.id} caption="Grouped server rows" pagination={{ pageIndex: 0, pageSize: 10 }}
        initialResult={initialGroupedServerResult} onStateChange={requestGroupedServer} initialViewportHeight={300} grouping={{ by: "desk" }} />
    </section>
    <section aria-label="Hierarchical client example">
      <h2>Static and asynchronously loaded children</h2>
      <Button onClick={() => setHierarchyAuthority(authority => authority === "account-a" ? "account-b" : "account-a")}>Switch hierarchy authority</Button>
      <DataTable data={hierarchyRows} columns={columns} getRowId={row => row.id} caption="Hierarchical client rows" pagination={false} initialViewportHeight={220}
        hierarchy={{ getChildren: row => row.children, hasChildren: row => row.remote === true, onLoadChildren: requestChildren, defaultExpanded: ["tree-default"], resetKey: hierarchyAuthority() }} />
    </section>
    <section aria-label="Paginated client example">
      <h2>Paginated client data</h2>
      <Button onClick={() => setPagedRows(continuousRows.slice(0, 5))}>Shrink client data</Button>
      <Button onClick={() => setSelectionAuthority(authority => authority === "account-a" ? "account-b" : "account-a")}>Switch selection authority</Button>
      <output aria-label="DataTable selection payload">{selectionState()}</output>
      <DataTable data={pagedRows()} columns={columns} getRowId={row => row.id} caption="Paginated client rows" pagination={{ pageIndex: 2, pageSize: 10 }} initialViewportHeight={180}
        selection={{ mode: "multiple", resetKey: selectionAuthority(), onChange: value => setSelectionState(JSON.stringify(value)) }} />
    </section>
    <section aria-label="Paginated server example">
      <h2>Paginated server data</h2>
      <Button onClick={() => { failNextServerRequest = true; }}>Fail next server request</Button>
      <output aria-label="Server DataTable selection payload">{serverSelectionState()}</output>
      <DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Paginated server rows" pagination={{ pageIndex: 0, pageSize: 10 }}
        initialResult={{ rows: initialServerRows, total: 55 }} onStateChange={requestFallibleServer} initialViewportHeight={180}
        selection={{ mode: "multiple", onChange: value => setServerSelectionState(JSON.stringify(value)) }} />
    </section>
  </main>;
}
