import { createSignal, onMount } from "solid-js";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { CellCommitResult, ColumnValue, DataTableCellCommitRequest } from "@gemologic/sheen-table";
import { Button } from "@gemologic/sheen";

interface EditRow {
  readonly id: string;
  readonly title: string;
  readonly amount: number;
  readonly status: string;
  readonly enabled: boolean;
}

function scalar(value: unknown): value is ColumnValue {
  return value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
}

function parseResult(value: unknown): CellCommitResult<ColumnValue, string> {
  if (typeof value !== "object" || value === null || !("kind" in value)) throw new Error("Invalid cell commit response");
  if (value.kind === "accepted" && "value" in value && scalar(value.value)) return { kind: "accepted", value: value.value };
  if (value.kind === "conflict" && "current" in value && scalar(value.current) && "detail" in value && typeof value.detail === "string") return { kind: "conflict", current: value.current, detail: value.detail };
  throw new Error("Invalid cell commit response");
}

const columns = defineColumns<EditRow>([
  { id: "title", header: "Title", accessor: row => row.title, editor: { type: "text", validate: value => typeof value === "string" && value.trim() ? null : "Title is required" } },
  { id: "amount", header: "Amount", accessor: row => row.amount, numeric: true, editor: { type: "number", validate: value => typeof value === "number" && value >= 0 ? null : "Amount cannot be negative" } },
  { id: "status", header: "Status", accessor: row => row.status, editor: { type: "select", options: ["open", "closed"] } },
  { id: "enabled", header: "Enabled", accessor: row => row.enabled, editor: { type: "boolean" } },
]);

export default function TableEditFixture() {
  const [rows, setRows] = createSignal<readonly EditRow[]>([{ id: "row-1", title: "Initial title", amount: 12, status: "open", enabled: true }]);
  const [requests, setRequests] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  const [resetKey, setResetKey] = createSignal(0);

  async function commit(request: DataTableCellCommitRequest<EditRow>, signal: AbortSignal): Promise<CellCommitResult<ColumnValue, string>> {
    setRequests(value => value + 1);
    const response = await fetch("/api/table-edit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ commitId: String(request.commitId), value: request.value, previous: request.previous }),
      ...(request.value === "slow" ? {} : { signal }),
    });
    if (!response.ok) throw new Error(`Cell commit failed (${response.status})`);
    return parseResult(await response.json());
  }

  onMount(() => setReady(true));
  return <main>
    <h1>Inline DataTable editing</h1>
    <Button onClick={() => setRows(current => current.map(row => row.id === "row-1" ? { ...row, title: "Server refresh" } : row))}>Refetch server value</Button>
    <Button onClick={() => setResetKey(value => value + 1)}>Change edit boundary</Button>
    <section aria-label="Editable DataTable">
      <DataTable data={rows()} columns={columns} getRowId={row => row.id} caption="Conflict-safe inline editing" pagination={false} initialViewportHeight={140}
        columnControls={false} export={false} onCellCommit={commit} editResetKey={resetKey()} />
    </section>
    <output aria-label="Committed title">{rows()[0]?.title}</output>
    <output aria-label="Commit requests">{requests()}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
