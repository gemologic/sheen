import { Card, Stack } from "@gemologic/sheen";
import { DataTable, QueryBuilder, defineColumns, deserializeFilter, queryBuilderFilterColumns, serializeFilter } from "@gemologic/sheen-table";
import type { FilterNode, QueryBuilderColumn } from "@gemologic/sheen-table";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { Show, createEffect, createSignal } from "solid-js";

interface AccountRow {
  readonly id: string;
  readonly account: string;
  readonly owner: string;
  readonly status: "Active" | "Review" | "Paused";
  readonly amount: number;
  readonly created: number;
}

const rows: readonly AccountRow[] = Object.freeze([
  { id: "aperture", account: "Aperture 001", owner: "Ada Lovelace", status: "Active", amount: 12_500, created: Date.UTC(2026, 7, 12) },
  { id: "beacon", account: "Beacon 002", owner: "Grace Hopper", status: "Review", amount: 8_750, created: Date.UTC(2026, 7, 18) },
  { id: "cinder", account: "Cinder 003", owner: "Katherine Johnson", status: "Paused", amount: 19_200, created: Date.UTC(2026, 8, 1) },
  { id: "drift", account: "Drift 004", owner: "Radia Perlman", status: "Active", amount: 25_400, created: Date.UTC(2026, 8, 8) },
]);

const tableColumns = defineColumns<AccountRow>([
  { id: "account", header: "Account", accessor: row => row.account, search: true, filter: { type: "text" }, sort: "text", width: "fill" },
  { id: "owner", header: "Owner", accessor: row => row.owner, search: true, filter: { type: "text" }, sort: "text", width: 190 },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Review", "Paused"], faceted: true }, sort: "text", width: 120 },
  { id: "amount", header: "Amount", accessor: row => row.amount, filter: { type: "number" }, sort: "number", numeric: true, width: 130 },
  { id: "created", header: "Created", accessor: row => row.created, filter: { type: "date" }, sort: "number", width: 130, cell: value => typeof value === "number" ? new Date(value).toISOString().slice(0, 10) : "" },
]);
const queryColumns = [
  { id: "account", label: "Account", type: "text" },
  { id: "owner", label: "Owner", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["Active", "Review", "Paused"] },
  { id: "amount", label: "Amount", type: "number" },
  { id: "created", label: "Created", type: "date" },
] satisfies readonly QueryBuilderColumn[];
const filterSchema = queryBuilderFilterColumns(queryColumns);
const defaultFilter: FilterNode = Object.freeze({ kind: "and", children: Object.freeze([
  Object.freeze({ kind: "enum", column: "status", operator: "in", values: Object.freeze(["Active", "Review"]) }),
]) });

function queryFromSearch(search: string): { readonly filter: FilterNode; readonly invalid: boolean } {
  const serialized = new URLSearchParams(search).get("query");
  if (serialized === null) return { filter: defaultFilter, invalid: false };
  try { return { filter: deserializeFilter(serialized, filterSchema), invalid: false }; }
  catch { return { filter: defaultFilter, invalid: true }; }
}

export default function QueryBuilderFixture() {
  const router = useSolidRouterAdapter();
  const initial = queryFromSearch(router.location().search);
  const [filter, setFilter] = createSignal(initial.filter);
  const [invalid, setInvalid] = createSignal(initial.invalid);

  createEffect(() => {
    const next = queryFromSearch(router.location().search);
    if (serializeFilter(next.filter, filterSchema) !== serializeFilter(filter(), filterSchema)) setFilter(next.filter);
    setInvalid(next.invalid);
  });

  const update = (next: FilterNode): void => {
    const serialized = serializeFilter(next, filterSchema);
    if (serialized === serializeFilter(filter(), filterSchema)) return;
    setFilter(next);
    setInvalid(false);
    const location = router.location();
    const params = new URLSearchParams(location.search);
    params.set("query", serialized);
    router.navigate(`${location.pathname}?${params.toString()}${location.hash}`, { replace: true, scroll: false });
  };

  return <main>
    <Stack gap="lg">
      <header><h1>QueryBuilder</h1><p>Nested query state is shared with the table and round-trips through a versioned URL value.</p></header>
      <Show when={invalid()}><p role="alert">The URL query was invalid. The default query is retained.</p></Show>
      <Card padding="lg" bordered><QueryBuilder columns={queryColumns} value={filter()} onChange={update} label="Account query" /></Card>
      <DataTable data={rows} columns={tableColumns} getRowId={row => row.id} caption="Query builder accounts" pagination={false}
        filter={filter()} onAcceptedStateChange={state => update(state.filter)} filterBar={false} search={{}} columnControls initialViewportHeight={260}
        mobileLayout={{ pageSize: 20, titleColumn: "account" }} />
      <output aria-label="Serialized query">{serializeFilter(filter(), filterSchema)}</output>
    </Stack>
  </main>;
}
