import { Button } from "@gemologic/sheen";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { DataTableAction, DataTableActionContext, DataTableResult, TableState } from "@gemologic/sheen-table";
import { createSignal, onMount } from "solid-js";

interface ChromeRow { readonly id: string; readonly name: string; readonly amount: number }

const rows: readonly ChromeRow[] = [
  { id: "alpha", name: "Alpha", amount: 10 },
  { id: "beta", name: "Beta", amount: 20 },
  { id: "gamma", name: "Gamma", amount: 30 },
];

const columns = defineColumns<ChromeRow>([
  { id: "name", header: "Name", accessor: row => row.name, filter: { type: "text" }, sort: "text", footer: "Total" },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, footer: values => values.reduce((sum, row) => sum + row.amount, 0) },
]);

const refreshColumns = defineColumns<ChromeRow>([
  { id: "name", header: "Name", accessor: row => row.name, sort: "text" },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true },
  { id: "draft", header: "Local draft", cellDependencies: [], cell: (_, row) => <details><summary>Notes for {row.id}</summary><input aria-label={`Draft for ${row.id}`} /></details> },
]);

function describeAction(action: string, context: DataTableActionContext<ChromeRow>): string {
  const selection = context.selection.kind === "ids" ? context.selection.ids.join(",") : `query excluding ${context.selection.excluded.join(",")}`;
  return `${action}|anchor:${context.anchor?.id ?? "none"}|selection:${selection}|loaded:${context.loadedRows.map(row => row.id).join(",")}`;
}

function parseResult(value: unknown): DataTableResult<ChromeRow> {
  if (typeof value !== "object" || value === null || !("rows" in value) || !Array.isArray(value.rows) || !("total" in value) || typeof value.total !== "number") throw new Error("Invalid table chrome response");
  const parsed: ChromeRow[] = [];
  for (const row of value.rows) {
    if (typeof row !== "object" || row === null || !("id" in row) || typeof row.id !== "string" || !("name" in row) || typeof row.name !== "string" || !("amount" in row) || typeof row.amount !== "number") throw new Error("Invalid table chrome row");
    parsed.push({ id: row.id, name: row.name, amount: row.amount });
  }
  return { rows: parsed, total: value.total };
}

async function requestRows(state: TableState, signal: AbortSignal, delay: number, fail: boolean): Promise<DataTableResult<ChromeRow>> {
  const direction = state.sorting.find(entry => entry.column === "name")?.direction ?? "none";
  const response = await fetch(`/api/table-chrome?delay=${delay}&fail=${String(fail)}&direction=${direction}`, { signal });
  if (!response.ok) throw new Error(`Chrome request failed (${response.status})`);
  return parseResult(await response.json());
}

export default function TableChromeFixture() {
  const [actionResult, setActionResult] = createSignal("None");
  const [selectionResult, setSelectionResult] = createSignal("None");
  const [failNext, setFailNext] = createSignal(false);
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [refreshSelection, setRefreshSelection] = createSignal("");
  const [ready, setReady] = createSignal(false);
  const actions: readonly DataTableAction<ChromeRow>[] = [
    { id: "archive", label: "Archive", tone: "danger", shortcut: "A", onSelect: context => setActionResult(describeAction("archive", context)) },
    { id: "review", label: "Review", onSelect: context => setActionResult(describeAction("review", context)) },
  ];
  const refresh = (state: TableState, signal: AbortSignal): Promise<DataTableResult<ChromeRow>> => {
    const fail = failNext();
    setFailNext(false);
    return requestRows(state, signal, 650, fail);
  };
  onMount(() => setReady(true));
  return <main>
    <h1>DataTable chrome</h1>
    <section aria-label="Action and footer table">
      <output aria-label="Action result">{actionResult()}</output>
      <output aria-label="Action selection">{selectionResult()}</output>
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Action accounts" pagination={{ pageIndex: 0, pageSize: 2 }} initialViewportHeight={150}
        selection={{ mode: "multiple", onChange: selection => setSelectionResult(JSON.stringify(selection)) }} actions={actions} />
    </section>
    <section aria-label="Native context table">
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Native context accounts" pagination={false} initialViewportHeight={120} />
    </section>
    <section aria-label="Empty table">
      <DataTable data={[]} columns={columns} getRowId={row => row.id} caption="Empty accounts" pagination={false} initialViewportHeight={120} />
    </section>
    <section aria-label="No results table">
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="No matching accounts" pagination={false} initialViewportHeight={150}
        initialState={{ filter: { kind: "text", column: "name", operator: "eq", value: "missing", caseSensitive: false } }} />
    </section>
    <section aria-label="Cold table">
      <DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Cold accounts" pagination={false} initialViewportHeight={150}
        onStateChange={(state, signal) => requestRows(state, signal, 450, false)} />
    </section>
    <section aria-label="Refresh table">
      <Button onClick={() => setFailNext(true)}>Fail next refresh</Button>
      <Button onClick={() => setRefreshKey(value => value + 1)}>Revalidate accounts</Button>
      <output aria-label="Refresh selection">{refreshSelection()}</output>
      <DataTable mode="server" columns={refreshColumns} getRowId={row => row.id} caption="Refresh accounts" pagination={false} initialViewportHeight={150}
        selection={{ mode: "multiple", onChange: selection => setRefreshSelection(JSON.stringify(selection)) }}
        initialResult={{ rows, total: rows.length }} onStateChange={refresh} refreshKey={refreshKey()} />
    </section>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
