import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createClientExport, createTableSelection, filterClientRows, paginateClientRows, selectClientRows } from "@gemologic/sheen-table";
import type { FilterColumn, FilterNode } from "@gemologic/sheen-table";
import { Button, Checkbox, Link, Pagination, Table, TableBody, TableCaption, TableCell, TableRow } from "@gemologic/sheen";

export default function TableSelectionFixture() {
  const source = [{ id: "a", status: "open" }, { id: "b", status: "open" }, { id: "c", status: "open" }, { id: "d", status: "closed" }];
  const columns: readonly FilterColumn[] = [{ id: "status", type: "enum", options: ["open", "closed"] }];
  const [filter, setFilter] = createSignal<FilterNode>({ kind: "and", children: [] });
  const [index, setIndex] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  const selection = createTableSelection(filter(), columns);
  const [payload, setPayload] = createSignal(selection.getPayload());
  const [captured, setCaptured] = createSignal("");
  const [exported, setExported] = createSignal("");
  const [download, setDownload] = createSignal<{ url: string; filename: string }>();
  let objectURL: string | undefined;
  onCleanup(() => { if (objectURL) URL.revokeObjectURL(objectURL); });
  const view = createMemo(() => filterClientRows(source, filter(), columns, { locale: "en-US", getValue: row => row.status }));
  const page = createMemo(() => paginateClientRows(view(), { pageIndex: index(), pageSize: 2 }));
  function publish() { setPayload(selection.getPayload()); }
  function loadPage() { selection.setLoadedIds(page().rows.map(row => row.id)); publish(); }
  loadPage();
  onMount(() => setReady(true));
  const selected = (id: string) => { payload(); return selection.isSelected(id); };
  const selectedOnPage = () => page().rows.filter(row => selected(row.id)).length;
  function prepare(format: "csv" | "json") {
    const selected = selectClientRows(view(), selection.getPayload(), { locale: "en-US", filterColumns: columns, getRowId: row => row.id, getValue: row => row.status });
    const snapshot = createClientExport(selected, [{ id: "id", header: "ID", value: row => row.id }, { id: "status", header: "Status", visible: false, value: row => row.status }]);
    const text = format === "csv" ? snapshot.toCSV() : snapshot.toJSON();
    const next = URL.createObjectURL(new Blob([text], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8" }));
    const previous = objectURL;
    objectURL = next;
    setDownload({ url: next, filename: `selection.${format}` });
    setExported(snapshot.toCSV());
    if (previous) URL.revokeObjectURL(previous);
  }
  return <main>
    <Checkbox label="Select page" checked={page().rows.length > 0 && selectedOnPage() === page().rows.length} indeterminate={selectedOnPage() > 0 && selectedOnPage() < page().rows.length} onCheckedChange={checked => { selection.selectLoaded(checked); publish(); }} />
    <Button onClick={() => { selection.selectAllMatching(); publish(); }}>Select all matching</Button>
    <Button onClick={() => setCaptured(JSON.stringify(selection.getPayload()))}>Capture bulk selection</Button>
    <Button onClick={() => prepare("csv")}>Prepare selected CSV</Button>
    <Button onClick={() => prepare("json")}>Prepare selected JSON</Button>
    <Show when={download()}>{file => <Link href={file().url} download={file().filename}>Download prepared selection</Link>}</Show>
    <Button onClick={() => { const next: FilterNode = { kind: "enum", column: "status", operator: "in", values: ["closed"] }; selection.setFilter(next); setFilter(next); setIndex(0); loadPage(); }}>Only closed</Button>
    <Table aria-label="Selection rows"><TableCaption>Selection across pages</TableCaption><TableBody>
      <For each={page().rows}>{row => <TableRow data-selected={selected(row.id) ? "" : undefined}>
        <TableCell><Checkbox label={`Select ${row.id}`} checked={selected(row.id)} onCheckedChange={checked => { selection.setSelected(row.id, checked); publish(); }} /></TableCell>
        <TableCell>{row.id}</TableCell><TableCell>{row.status}</TableCell>
      </TableRow>}</For>
    </TableBody></Table>
    <Pagination pageIndex={index()} pageCount={Math.ceil(page().total / 2)} onPageChange={value => { setIndex(value); loadPage(); }} />
    <output aria-label="Selection payload">{JSON.stringify(payload())}</output>
    <output aria-label="Captured selection">{captured()}</output>
    <output aria-label="Selected CSV">{exported()}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
