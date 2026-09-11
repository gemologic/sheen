import { DataTable, defineColumns, parseFilter } from "@gemologic/sheen-table";
import { dateFilterEditor } from "@gemologic/sheen-date";
import type { DataTableResult, FilterNode, TableState } from "@gemologic/sheen-table";
import { createSignal } from "solid-js";
import { filterRows, filterSchema } from "../fixtures/filter-table";
import type { FilterFixtureRow } from "../fixtures/filter-table";

const columns = defineColumns<FilterFixtureRow>([
  { id: "name", header: "Name", accessor: row => row.name, width: "fill", filter: { type: "text" } },
  { id: "status", header: "Status", accessor: row => row.status, width: 130, filter: { type: "enum", options: ["open", "closed", "pending"], faceted: true } },
  { id: "amount", header: "Amount", accessor: row => row.amount, width: 120, numeric: true, filter: { type: "number" } },
  { id: "created", header: "Created", accessor: row => row.created, width: 150, filter: { type: "date" }, cell: value => typeof value === "number" ? new Date(value).toISOString().slice(0, 10) : "" },
]);

const initialFacets = Object.freeze({ status: Object.freeze({ open: 2, closed: 1, pending: 1 }) });
const initialResult: DataTableResult<FilterFixtureRow> = Object.freeze({ rows: filterRows, total: filterRows.length, facets: initialFacets });

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResult(value: unknown): DataTableResult<FilterFixtureRow> {
  if (!record(value) || !Array.isArray(value.rows) || typeof value.total !== "number" || !record(value.facets)) throw new Error("Invalid filter table response");
  const rows: FilterFixtureRow[] = [];
  const values: readonly unknown[] = value.rows;
  for (const candidate of values) {
    if (!record(candidate) || typeof candidate.id !== "string" || typeof candidate.name !== "string"
      || (candidate.status !== "open" && candidate.status !== "closed" && candidate.status !== "pending")
      || typeof candidate.amount !== "number" || typeof candidate.created !== "number") throw new Error("Invalid filter table row");
    rows.push({ id: candidate.id, name: candidate.name, status: candidate.status, amount: candidate.amount, created: candidate.created });
  }
  const facets: Record<string, Readonly<Record<string, number>>> = {};
  for (const [column, candidate] of Object.entries(value.facets)) {
    if (!record(candidate)) throw new Error("Invalid filter table facets");
    const options: Record<string, number> = {};
    for (const [option, count] of Object.entries(candidate)) {
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("Invalid filter table facet count");
      options[option] = count;
    }
    facets[column] = Object.freeze(options);
  }
  return Object.freeze({ rows: Object.freeze(rows), total: value.total, facets: Object.freeze(facets) });
}

async function requestRows(state: TableState, signal: AbortSignal): Promise<DataTableResult<FilterFixtureRow>> {
  if (state.pagination !== false) throw new Error("Filter fixture requires continuous mode");
  const response = await fetch("/api/filter-table", { method: "POST", body: JSON.stringify({ filter: state.filter }), headers: { "content-type": "application/json" }, signal });
  if (!response.ok) throw new Error(`Filter table request failed (${response.status})`);
  return parseResult(await response.json());
}

export default function FilterBarFixture() {
  const [clientState, setClientState] = createSignal<FilterNode>(parseFilter({ kind: "and", children: [] }, filterSchema));
  const [serverState, setServerState] = createSignal<FilterNode>(parseFilter({ kind: "and", children: [] }, filterSchema));
  return <main>
    <h1>FilterBar</h1>
    <section aria-label="Typed client filters">
      <h2>Typed client filters</h2>
      <DataTable data={filterRows} columns={columns} getRowId={row => row.id} caption="Client filter rows" pagination={false} initialViewportHeight={210}
        filterBar={{ dateEditor: dateFilterEditor }}
        onAcceptedStateChange={state => setClientState(state.filter)} />
      <output aria-label="Accepted client filter">{JSON.stringify(clientState())}</output>
    </section>
    <section aria-label="Delegated filter refresh">
      <h2>Delegated filter refresh</h2>
      <DataTable mode="server" pagination={false} columns={columns} getRowId={row => row.id} caption="Server filter rows" initialViewportHeight={210}
        filterBar={{ dateEditor: dateFilterEditor }}
        initialResult={initialResult} onStateChange={requestRows} onAcceptedStateChange={state => setServerState(state.filter)} />
      <output aria-label="Accepted server filter">{JSON.stringify(serverState())}</output>
    </section>
  </main>;
}
