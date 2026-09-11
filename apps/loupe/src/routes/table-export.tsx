import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { DataTable, createServerExport, defineColumns, serializeState } from "@gemologic/sheen-table";
import type { DataTableResult, TableExportRequest } from "@gemologic/sheen-table";
import { Button, Checkbox, Input, Link } from "@gemologic/sheen";
import { exportSchema, exportState } from "../fixtures/table-export";

interface ExportRow { readonly id: string; readonly name: string; readonly note: string }
const dataTableRows: readonly ExportRow[] = [
  { id: "alpha", name: "Alpha", note: "ready" },
  { id: "alpha-second", name: "Alpha second", note: "=2+2" },
  { id: "beta", name: "Beta", note: "held" },
];
const dataTableColumns = defineColumns<ExportRow>([
  { id: "name", header: "Name", accessor: row => row.name, search: true, filter: { type: "text" }, sort: "text" },
  { id: "note", header: "Note", accessor: row => row.note },
]);
const serverDataTableColumns = defineColumns<ExportRow>([
  { id: "name", header: "Name", accessor: row => row.name, filter: { type: "text" }, sort: "text" },
]);
const serverInitialResult: DataTableResult<ExportRow> = { rows: dataTableRows.slice(0, 1), total: 2 };

export default function TableExportFixture() {
  const [query, setQuery] = createSignal(exportState.search);
  const [reject, setReject] = createSignal(false);
  const [ready, setReady] = createSignal(false);
  const [calls, setCalls] = createSignal(0);
  const [tableCalls, setTableCalls] = createSignal(0);
  const [tableRequest, setTableRequest] = createSignal("");
  const unavailable = createServerExport(exportSchema);
  const controller = createServerExport(exportSchema, async (request, signal) => {
    setCalls(count => count + 1);
    const parameters = new URLSearchParams({ state: serializeState(request.state, exportSchema), format: request.format, reject: String(reject()) });
    const response = await fetch(`/api/table-export?${parameters}`, { signal });
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    return response.blob();
  });
  const [snapshot, setSnapshot] = createSignal(controller.getSnapshot());
  const [download, setDownload] = createSignal<{ url: string; filename: string; query: string }>();
  let objectURL: string | undefined;
  let disposed = false;
  function revoke(remove = true) {
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = undefined;
    if (remove) setDownload(undefined);
  }
  function publish() {
    if (!disposed) setSnapshot(controller.getSnapshot());
  }
  async function finish(pending: ReturnType<typeof controller.request>) {
    publish();
    const outcome = await pending;
    if (disposed) return;
    publish();
    if (outcome !== "accepted") return;
    const accepted = controller.getSnapshot().accepted;
    if (!accepted) return;
    const next = URL.createObjectURL(accepted.artifact);
    revoke(false);
    objectURL = next;
    setDownload({ url: next, filename: `server.${accepted.request.format}`, query: accepted.request.state.search });
  }
  function prepare(format: "csv" | "json") {
    void finish(controller.request({ format, state: { ...exportState, search: query() }, selection: null }));
  }
  async function exportTable(request: TableExportRequest, signal: AbortSignal): Promise<Blob> {
    setTableCalls(count => count + 1);
    setTableRequest(JSON.stringify({ format: request.format, search: request.state.search, selection: request.selection }));
    const parameters = new URLSearchParams({ state: serializeState(request.state, exportSchema), format: request.format, reject: String(reject()) });
    const response = await fetch(`/api/table-export?${parameters}`, { signal });
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    return response.blob();
  }
  onMount(() => setReady(true));
  onCleanup(() => { disposed = true; controller.dispose(); unavailable.dispose(); revoke(); });
  return <main>
    <h1>Server export ownership</h1>
    <section aria-label="Client DataTable export">
      <DataTable data={dataTableRows} columns={dataTableColumns} getRowId={row => row.id} caption="Client orders" pagination={{ pageIndex: 0, pageSize: 1 }} initialViewportHeight={120}
        initialState={{ search: "Alpha", columns: [{ id: "name", visible: true, width: null, pin: false }, { id: "note", visible: false, width: null, pin: false }] }} export={{ filename: "client-orders" }} columnControls={false}
        search={false} selection={{ mode: "multiple", onChange: () => {} }} />
    </section>
    <section aria-label="Without export adapter">
      <DataTable mode="server" columns={serverDataTableColumns} getRowId={row => row.id} caption="Unavailable server export" pagination={{ pageIndex: 0, pageSize: 1 }} initialViewportHeight={120}
        initialState={{ search: "Alpha" }} initialResult={serverInitialResult} onStateChange={async () => serverInitialResult} search={false} columnControls={false} />
      <Show when={unavailable.available}><Button>Unavailable export</Button></Show>
    </section>
    <section aria-label="Server DataTable export">
      <DataTable mode="server" columns={serverDataTableColumns} getRowId={row => row.id} caption="Server orders" pagination={{ pageIndex: 0, pageSize: 1 }} initialViewportHeight={120}
        initialState={{ search: "Alpha" }} initialResult={serverInitialResult} onStateChange={async () => serverInitialResult} onExport={exportTable} export={{ filename: "server-orders" }} search={false} columnControls={false} />
      <output aria-label="DataTable export calls">{tableCalls()}</output>
      <output aria-label="DataTable export request">{tableRequest()}</output>
    </section>
    <Input label="Export query" value={query()} onInput={event => setQuery(event.currentTarget.value)} />
    <Checkbox label="Reject exports" checked={reject()} onCheckedChange={setReject} />
    <Button disabled={snapshot().pending} onClick={() => prepare("csv")}>Prepare server CSV</Button>
    <Button disabled={snapshot().pending} onClick={() => prepare("json")}>Prepare server JSON</Button>
    <Button onClick={() => { controller.clear(); revoke(); publish(); }}>Clear exports</Button>
    <Show when={snapshot().error}><p role="alert">Export failed. The previous download still uses its captured query.</p><Button onClick={() => void finish(controller.retry())}>Retry export</Button></Show>
    <Show when={download()}>{file => <p>Prepared query: <span data-testid="prepared-query">{file().query}</span> <Link href={file().url} download={file().filename}>Download server export</Link></p>}</Show>
    <output aria-label="Export state">{snapshot().pending ? "Preparing" : "Idle"}</output>
    <output aria-label="Adapter calls">{calls()}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
