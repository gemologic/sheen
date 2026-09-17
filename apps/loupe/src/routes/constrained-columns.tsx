import { Button, Checkbox } from "@gemologic/sheen";
import { DataTable, defineColumns, serializeState } from "@gemologic/sheen-table";
import type { DataTableResult, FilterNode, TableState } from "@gemologic/sheen-table";
import { createSignal } from "solid-js";
import { constrainedInitialState, constrainedSchema, constrainedView } from "../fixtures/constrained-table-data.ts";
import type { ConstrainedRow } from "../fixtures/constrained-table-data.ts";

const columns = defineColumns<ConstrainedRow>([
  { id: "name", header: "Name", accessor: row => row.name, width: "fill" },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Paused", "Review"], faceted: true } },
  { id: "sequence", header: "Sequence", accessor: row => row.sequence, numeric: true, filter: { type: "number" } },
]);
const active: FilterNode = { kind: "enum", column: "status", operator: "in", values: ["Active"] };
function parseResult(value: unknown): DataTableResult<ConstrainedRow> {
  if (typeof value !== "object" || value === null || !("rows" in value) || !Array.isArray(value.rows) || !("total" in value) || typeof value.total !== "number" || !Number.isSafeInteger(value.total) || value.total < 0) throw new Error("Invalid constrained table response");
  const rows: ConstrainedRow[] = [];
  for (const row of value.rows) {
    if (typeof row !== "object" || row === null || typeof row.id !== "string" || typeof row.name !== "string" || typeof row.status !== "string" || typeof row.sequence !== "number") throw new Error("Invalid constrained row");
    rows.push({ id: row.id, name: row.name, status: row.status, sequence: row.sequence });
  }
  const facets: Record<string, Record<string, number>> = {};
  if (!("facets" in value) || typeof value.facets !== "object" || value.facets === null) throw new Error("Missing constrained facets");
  for (const [column, options] of Object.entries(value.facets)) {
    if (typeof options !== "object" || options === null) throw new Error("Invalid constrained facet");
    const counts: Record<string, number> = {};
    for (const [option, count] of Object.entries(options)) {
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("Invalid constrained facet count");
      counts[option] = count;
    }
    facets[column] = counts;
  }
  return { rows, total: value.total, facets };
}
export default function ConstrainedColumnsFixture() {
  const [filter, setFilter] = createSignal<FilterNode>(constrainedInitialState.filter);
  const [accepted, setAccepted] = createSignal(constrainedInitialState);
  const [fail, setFail] = createSignal(false);
  const initial = constrainedView(constrainedInitialState);
  function requestUrl(state: TableState, exporting = false): string {
    return `/api/constrained-table?${new URLSearchParams({ state: serializeState(state, constrainedSchema), fail: String(fail()), export: String(exporting) })}`;
  }
  return <main>
    <h1>Accepted constrained columns</h1>
    <p>First-page coincidence does not hide Status. An accepted exact filter can summarize it, preserving its saved width and pin.</p>
    <div><Button onClick={() => setFilter(active)}>Active only</Button><Button onClick={() => setFilter({ kind: "and", children: [] })}>All statuses</Button>
      <Button onClick={() => setFilter({ kind: "and", children: [active, { kind: "number", column: "sequence", operator: "eq", value: 1 }] })}>Single result</Button>
      <Button onClick={() => setFilter({ kind: "and", children: [active, { kind: "number", column: "sequence", operator: "eq", value: 99 }] })}>Empty result</Button>
      <Checkbox label="Fail requests" checked={fail()} onCheckedChange={setFail} /></div>
    <output aria-label="Accepted column preferences">{JSON.stringify(accepted().columns)}</output>
    <DataTable mode="server" caption="Constrained records" columns={columns} getRowId={row => row.id} summarizeColumns={["status"]} initialState={constrainedInitialState}
      filter={filter()} pagination={{ pageIndex: 0, pageSize: 3 }} initialResult={{ rows: initial.rows, total: initial.total }} initialViewportHeight={220} search={false} filterBar={false}
      onAcceptedStateChange={setAccepted} onStateChange={async (state, signal) => {
        const response = await fetch(requestUrl(state), { signal });
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return parseResult(await response.json());
      }} onExport={async (request, signal) => {
        const response = await fetch(requestUrl(request.state, true), { signal });
        if (!response.ok) throw new Error("Export failed");
        return response.blob();
      }} export={{ formats: ["json"], filename: "constrained-records" }} />
  </main>;
}
