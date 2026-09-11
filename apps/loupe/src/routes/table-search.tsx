import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { changeClientViewState, createClientView, createDebouncedSearch, parseClientViewState } from "@gemologic/sheen-table";
import type { ClientStateChange, ClientView, ClientViewOptions } from "@gemologic/sheen-table";
import { Button, Input, Pagination, SearchInput, Table, TableBody, TableCaption, TableCell, TableRow } from "@gemologic/sheen";

interface Row { id: string; name: string; status: string }

export default function TableSearchFixture() {
  const source: Row[] = [{ id: "a", name: "Alpha", status: "open" }, { id: "b", name: "Alpha second", status: "closed" }, { id: "c", name: "Beta", status: "open" }];
  const options: ClientViewOptions<Row> = {
    locale: "en-US", searchColumns: ["name"], filterColumns: [{ id: "status", type: "enum", options: ["open", "closed"] }], sortColumns: [{ id: "name", type: "text" }], getValue: (row, column) => column === "name" ? row.name : row.status,
  };
  const [state, setState] = createSignal(parseClientViewState({ search: "", filter: { kind: "and", children: [] }, sorting: [], pagination: false }, options));
  const [evaluations, setEvaluations] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  const controller = createDebouncedSearch<ClientView<Row>>(query => {
    setEvaluations(value => value + 1);
    return createClientView(source, { ...state(), search: query }, options);
  }, 120, { query: "", result: { view: source, rows: source, total: source.length, pagination: false, facets: [{ column: "status", options: [{ value: "open", count: 2 }, { value: "closed", count: 1 }], missing: 0 }] } });
  const [snapshot, setSnapshot] = createSignal(controller.getSnapshot());
  let alive = true;
  onCleanup(() => { alive = false; controller.dispose(); });
  onMount(() => setReady(true));
  async function request(query: string) {
    const completion = controller.request(query);
    setSnapshot(controller.getSnapshot());
    const outcome = await completion;
    if (alive) {
      setSnapshot(controller.getSnapshot());
      const accepted = controller.getSnapshot();
      const result = accepted.accepted?.result;
      if (outcome === "accepted" && !accepted.pending && result) setState(current => parseClientViewState({ ...current, pagination: result.pagination }, options));
    }
  }
  function change(value: ClientStateChange) { setState(current => changeClientViewState(current, value, options)); void request(state().search); }
  const rows = createMemo(() => new Map(snapshot().accepted?.result.rows.map(row => [row.id, row]) ?? []));
  const previous = () => snapshot().requested !== null && snapshot().requested !== snapshot().accepted?.query;
  return <main onKeyDown={event => {
    if (event.altKey && event.key.toLowerCase() === "r") { event.preventDefault(); void request(state().search); }
  }}>
    <SearchInput label="Search rows" onValueChange={value => change({ kind: "search", value })} />
    <Button aria-pressed={state().filter.kind === "enum"} onClick={() => change({ kind: "filter", value: state().filter.kind === "enum" ? { kind: "and", children: [] } : { kind: "enum", column: "status", operator: "in", values: ["open"] } })}>Only open</Button>
    <Button aria-pressed={state().sorting.length > 0} onClick={() => change({ kind: "sorting", value: state().sorting.length ? [] : [{ column: "name", direction: "desc" }] })}>Sort descending</Button>
    <Button aria-pressed={state().pagination !== false} onClick={() => change({ kind: "pagination", value: state().pagination === false ? { pageIndex: 0, pageSize: 1 } : false })}>Paginate</Button>
    <Button onClick={() => { controller.clear(); setSnapshot(controller.getSnapshot()); }}>Clear accepted results</Button>
    <p role="status" aria-label="Search activity">{snapshot().pending ? "Pending" : "Settled"}</p>
    <p role="status" aria-label="Result query">{snapshot().pending || previous() ? "Previous results" : `Accepted: ${snapshot().accepted?.query ?? "none"}`}</p>
    <Table aria-label="Search results" aria-busy={snapshot().pending || undefined}>
      <TableCaption>Ranked client results</TableCaption>
      <TableBody><For each={[...rows().keys()]}>{id => <TableRow data-row-id={id}>
        <TableCell>{rows().get(id)?.name}</TableCell>
        <TableCell><Input label={`Draft ${id}`} value="Initial draft" /></TableCell>
        <TableCell><Button disabled={snapshot().pending || previous()}>Archive {id}</Button></TableCell>
      </TableRow>}</For></TableBody>
    </Table>
    <Show when={snapshot().accepted?.result.pagination}>{page => <Pagination
      pageIndex={page().pageIndex}
      pageCount={Math.ceil((snapshot().accepted?.result.total ?? 0) / page().pageSize)}
      pending={snapshot().pending}
      onPageChange={pageIndex => change({ kind: "pagination", value: { pageIndex, pageSize: page().pageSize } })}
    />}</Show>
    <output aria-label="Matching total">{snapshot().accepted?.result.total ?? 0}</output>
    <output aria-label="Status facets">{snapshot().accepted?.result.facets[0]?.options.map(option => `${option.value}: ${option.count}`).join(", ") ?? ""}</output>
    <output aria-label="Search evaluations">{evaluations()}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
