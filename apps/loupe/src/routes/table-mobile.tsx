import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { DataTableAction, DataTableActionContext, DataTableResult, TableState } from "@gemologic/sheen-table";
import { createSignal, onMount } from "solid-js";

interface MobileRow {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "paused";
  readonly amount: number;
}

const rows: readonly MobileRow[] = Array.from({ length: 45 }, (_, index) => ({
  id: `mobile-${index}`,
  name: `Account ${index}`,
  status: index % 3 === 0 ? "paused" : "active",
  amount: index * 125,
}));

const columns = defineColumns<MobileRow>([
  { id: "name", header: "Name", accessor: row => row.name, sort: "text", footer: "Total" },
  { id: "status", header: "Status", accessor: row => row.status },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, footer: values => values.reduce((sum, row) => sum + row.amount, 0) },
]);

const initiallySortedRows = Object.freeze([...rows].sort((left, right) => left.name.localeCompare(right.name)));

function parseResult(value: unknown): DataTableResult<MobileRow> {
  if (typeof value !== "object" || value === null || !("rows" in value) || !Array.isArray(value.rows) || !("total" in value) || typeof value.total !== "number") throw new Error("Invalid mobile table response");
  const parsed: MobileRow[] = [];
  for (const row of value.rows) {
    if (typeof row !== "object" || row === null || !("id" in row) || typeof row.id !== "string" || !("name" in row) || typeof row.name !== "string" || !("status" in row) || (row.status !== "active" && row.status !== "paused") || !("amount" in row) || typeof row.amount !== "number") throw new Error("Invalid mobile table row");
    parsed.push({ id: row.id, name: row.name, status: row.status, amount: row.amount });
  }
  return { rows: parsed, total: value.total };
}

async function requestRows(state: TableState, signal: AbortSignal): Promise<DataTableResult<MobileRow>> {
  const direction = state.sorting.find(entry => entry.column === "name")?.direction ?? "none";
  const response = await fetch(`/api/table-mobile?delay=650&direction=${direction}`, { signal });
  if (!response.ok) throw new Error(`Mobile table request failed (${response.status})`);
  return parseResult(await response.json());
}

function describeAction(action: string, context: DataTableActionContext<MobileRow>): string {
  const selection = context.selection.kind === "ids" ? context.selection.ids.join(",") : `query:${context.selection.excluded.join(",")}`;
  return `${action}|anchor:${context.anchor?.id ?? "none"}|selection:${selection}`;
}

export default function TableMobileFixture() {
  const [action, setAction] = createSignal("None");
  const [selection, setSelection] = createSignal("None");
  const [activation, setActivation] = createSignal("None");
  const [ready, setReady] = createSignal(false);
  const actions: readonly DataTableAction<MobileRow>[] = [
    { id: "archive", label: "Archive", tone: "danger", onSelect: context => setAction(describeAction("archive", context)) },
    { id: "review", label: "Review", onSelect: context => setAction(describeAction("review", context)) },
  ];
  onMount(() => setReady(true));
  return <main class="loupe-data-table-page">
    <h1>Phone DataTable cards</h1>
    <section aria-label="Mobile card table">
      <output aria-label="Mobile action result">{action()}</output>
      <output aria-label="Mobile selection result">{selection()}</output>
      <output aria-label="Mobile activation result">{activation()}</output>
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Mobile accounts" pagination={false}
        mobileLayout={{ pageSize: 10, titleColumn: "name" }} initialViewportHeight={180} export={false} columnControls={false}
        selection={{ mode: "multiple", onChange: value => setSelection(JSON.stringify(value)) }} actions={actions} onRowActivate={row => setActivation(row.id)} />
    </section>
    <section aria-label="Mobile refreshing table">
      <DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Refreshing mobile accounts" pagination={false}
        mobileLayout={{ pageSize: 10, titleColumn: "name" }} initialViewportHeight={180} export={false} columnControls={false}
        initialState={{ sorting: [{ column: "name", direction: "asc" }] }} initialResult={{ rows: initiallySortedRows, total: initiallySortedRows.length }} onStateChange={requestRows} />
    </section>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
