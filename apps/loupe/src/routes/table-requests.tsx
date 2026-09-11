import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createTableRequests } from "@gemologic/sheen-table";
import { Button, Input, Table, TableBody, TableCaption, TableCell, TableRow } from "@gemologic/sheen";

interface Query { pagination: false; dataset: "a" | "b"; revision: number; delay: number; reject: boolean }
interface Row { id: string; label: string }
interface Result { rows: Row[]; total: number }

export default function TableRequestsFixture() {
  const controller = createTableRequests<Query, Result>(async (query, signal) => {
    const parameters = new URLSearchParams({ dataset: query.dataset, revision: String(query.revision), delay: String(query.delay), reject: String(query.reject) });
    // Slow requests deliberately exercise a transport that cannot cancel an in-flight result.
    const response = await fetch(`/api/table-requests?${parameters}`, query.delay === 1500 ? {} : { signal });
    if (!response.ok) throw new Error(`Table request failed (${response.status})`);
    const value: unknown = await response.json();
    if (typeof value !== "object" || !value || !("rows" in value) || !Array.isArray(value.rows) || !("total" in value) || typeof value.total !== "number") throw new Error("Invalid response");
    const rows: Row[] = [];
    for (const row of value.rows) {
      if (typeof row !== "object" || !row || !("id" in row) || typeof row.id !== "string" || !("label" in row) || typeof row.label !== "string") throw new Error("Invalid row");
      rows.push({ id: row.id, label: row.label });
    }
    return { rows, total: value.total };
  }, {
    state: { pagination: false, dataset: "a", revision: 0, delay: 0, reject: false },
    result: { rows: Array.from({ length: 3 }, (_, index) => ({ id: `a-${index + 1}`, label: `a-${index + 1} revision 0` })), total: 3 },
  });
  const [snapshot, setSnapshot] = createSignal(controller.getSnapshot());
  const [actions, setActions] = createSignal(0);
  const [completions, setCompletions] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  let alive = true;
  let revision = 1;
  onCleanup(() => { alive = false; controller.dispose(); });
  async function request(dataset: "a" | "b", delay = 500, reject = false) {
    const completion = controller.request({ pagination: false, dataset, revision: revision++, delay, reject });
    setSnapshot(controller.getSnapshot());
    await completion;
    if (alive) { setSnapshot(controller.getSnapshot()); setCompletions(value => value + 1); }
  }
  onMount(() => setReady(true));
  const rows = createMemo(() => new Map(snapshot().accepted?.result.rows.map(row => [row.id, row]) ?? []));
  const previous = () => snapshot().requested !== null && snapshot().accepted?.state.dataset !== snapshot().requested?.dataset;
  return <main>
    <Button onClick={() => void request(snapshot().accepted?.state.dataset ?? "a")}>Refresh current</Button>
    <Button onClick={() => void request("a", 1500)}>Slow A</Button>
    <Button onClick={() => void request("b", 50)}>Fast B</Button>
    <Button onClick={() => void request("b", 500, true)}>Fail B</Button>
    <Button onClick={() => { controller.clear(); setSnapshot(controller.getSnapshot()); }}>Clear results</Button>
    <p role="status" aria-label="Query state">{snapshot().accepted === null ? "No accepted results" : previous() ? "Showing previous query results" : "Accepted query results"}</p>
    <p role="status" aria-label="Request activity">{snapshot().pending ? "Pending" : "Settled"}</p>
    <Show when={snapshot().error}><p role="alert">Request failed. Existing results retained.</p></Show>
    <Table aria-label="Request rows" aria-busy={snapshot().pending || undefined} data-pending={snapshot().pending ? "" : undefined}>
      <TableCaption>Accepted server rows</TableCaption>
      <TableBody><For each={[...rows().keys()]}>{id => <TableRow data-row-id={id}>
        <TableCell>{rows().get(id)?.label}</TableCell>
        <TableCell><Input label={`Draft ${id}`} value="Initial draft" /></TableCell>
        <TableCell><Button disabled={previous()} onClick={() => setActions(value => value + 1)}>Archive {id}</Button></TableCell>
      </TableRow>}</For></TableBody>
    </Table>
    <output aria-label="Archive count">{actions()}</output>
    <output aria-label="Request completions">{completions()}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
