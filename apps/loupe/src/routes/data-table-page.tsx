import { DataTable, createSavedViews, defineColumns } from "@gemologic/sheen-table";
import type { BulkSelection, DataTableAction, DataTableSearchOptions, DataTableVariant, SavedViewOutcome, SavedViewRecord, SavedViewsAdapter, SavedViewsSnapshot, TableState, TableStateSchema } from "@gemologic/sheen-table";
import { ShortcutProvider, Skeleton } from "@gemologic/sheen";
import { DataTablePage, StatusBar } from "@gemologic/sheen-patterns";
import type { DataTablePageState, DataTablePageViews, ToolbarGroup } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { For, batch, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import "@gemologic/sheen-patterns/styles.css";

interface Account {
  readonly id: string;
  readonly name: string;
  readonly status: "Active" | "Paused";
  readonly amount: number;
}

function createAccounts(count: number): readonly Account[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
  id: `account-${index + 1}`,
  name: `${index % 2 === 0 ? "Acme" : "Beacon"} ${String(index + 1).padStart(2, "0")}`,
  status: index % 3 === 0 ? "Paused" : "Active",
  amount: (index + 1) * 125,
  })));
}

const rows = createAccounts(80);
let largeRows: readonly Account[] | undefined;
function galleryRows(): readonly Account[] {
  largeRows ??= createAccounts(100_000);
  return largeRows;
}
const columns = defineColumns<Account>([
  { id: "name", header: "Account", accessor: row => row.name, search: true, filter: { type: "text" }, sort: "text", width: "fill" },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Paused"], faceted: true }, sort: "text", width: 150 },
  { id: "amount", header: "Balance", accessor: row => row.amount, filter: { type: "number" }, sort: "number", numeric: true, width: 160 },
]);
const schema: TableStateSchema = {
  columns: ["name", "status", "amount"],
  filterColumns: [{ id: "name", type: "text" }, { id: "status", type: "enum", options: ["Active", "Paused"] }, { id: "amount", type: "number" }],
  sortColumns: [{ id: "name", type: "text" }, { id: "status", type: "text" }, { id: "amount", type: "number" }],
};
const initialState: TableState = {
  search: "", filter: { kind: "and", children: [] }, sorting: [], pagination: false,
  columns: [{ id: "name", visible: true, width: null, pin: false }, { id: "status", visible: true, width: null, pin: false }, { id: "amount", visible: true, width: null, pin: false }],
};
const framedTable = { variant: "framed" } satisfies { readonly variant: DataTableVariant };
const search = { shortcut: "mod+f", exactMatch: true } satisfies DataTableSearchOptions;

function parseView(value: unknown): SavedViewRecord {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string" || !("name" in value) || typeof value.name !== "string" || !("state" in value) || typeof value.state !== "string") throw new Error("Invalid saved view response");
  return Object.freeze({ id: value.id, name: value.name, state: value.state });
}

export default function DataTablePageFixture() {
  const router = useSolidRouterAdapter();
  const parameters = createMemo(() => new URLSearchParams(router.location().search));
  const data = createMemo(() => parameters().get("rows") === "100000" ? galleryRows() : parameters().get("rows") === "empty" ? [] : rows);
  const session = createMemo(() => parameters().get("session") ?? "data-table-page");
  const startingTableState: TableState = Object.freeze({
    ...initialState,
    pagination: parameters().get("table") === "paged" ? Object.freeze({ pageIndex: 0, pageSize: 10 }) : false,
  });
  const initialPageState = (): DataTablePageState => {
    const value = parameters().get("page");
    return value === "not-found" || value === "server-error" || value === "permission-denied" ? value : "ready";
  };
  const [pageState, setPageState] = createSignal<DataTablePageState>(initialPageState());
  const [phase, setPhase] = createSignal<"idle" | "cold" | "refresh">(parameters().get("page") === "cold" ? "cold" : "idle");
  const [revision, setRevision] = createSignal(0);
  const [selection, setSelection] = createSignal<BulkSelection>({ kind: "ids", ids: [] });
  const [lastAction, setLastAction] = createSignal("None");
  const [tableState, setTableState] = createSignal(startingTableState);
  const [tableInitial, setTableInitial] = createSignal(startingTableState);
  const [tableVersion, setTableVersion] = createSignal(0);
  const [viewName, setViewName] = createSignal("Operations view");
  const [selectedView, setSelectedView] = createSignal<string | null>(null);
  const [viewSnapshot, setViewSnapshot] = createSignal<SavedViewsSnapshot>({ accepted: null, pending: null, failed: null, error: null });
  let alive = true;
  let refreshRequest: AbortController | undefined;
  let refreshToken = 0;
  const endpoint = () => `/api/table-views?${new URLSearchParams({ session: session(), reject: parameters().get("views") === "fail-once" ? "once" : "false" })}`;
  const adapter: SavedViewsAdapter = {
    async list(signal) {
      const response = await fetch(endpoint(), { signal });
      if (!response.ok) throw new Error(`View list failed (${response.status})`);
      const value: unknown = await response.json();
      if (!Array.isArray(value)) throw new Error("Invalid saved view list");
      return value.map(parseView);
    },
    async save(view, signal) {
      const response = await fetch(endpoint(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(view), signal });
      if (!response.ok) throw new Error(`View save failed (${response.status})`);
      return parseView(await response.json());
    },
    async delete(id, signal) {
      const response = await fetch(endpoint(), { method: "DELETE", body: id, signal });
      if (!response.ok) throw new Error(`View delete failed (${response.status})`);
    },
  };
  const views = createSavedViews(adapter, schema);
  const publishViews = () => { if (alive) setViewSnapshot(views.getSnapshot()); };
  async function finishView(pending: Promise<SavedViewOutcome>, after?: () => void): Promise<void> {
    publishViews();
    const outcome = await pending;
    batch(() => {
      publishViews();
      if (outcome === "accepted") after?.();
    });
  }
  function saveView(name: string): void {
    void finishView(views.save(name, tableState()), () => {
      const saved = views.getSnapshot().accepted?.find(record => record.name === name);
      if (saved) setSelectedView(saved.id);
    });
  }
  function restoreView(id: string): void {
    const restored = views.restore(id);
    if (restored.kind !== "accepted") return;
    setTableInitial(restored.state);
    setTableState(restored.state);
    setTableVersion(value => value + 1);
  }
  function renameView(id: string, name: string): void {
    const restored = views.restore(id);
    if (restored.kind !== "accepted") return;
    void finishView(views.save(name, restored.state, id));
  }
  function deleteView(id: string): void {
    void finishView(views.delete(id), () => setSelectedView(current => current === id ? null : current));
  }
  function retryView(): void {
    const failed = views.getSnapshot().failed;
    const acceptedIds = new Set(views.getSnapshot().accepted?.map(record => record.id) ?? []);
    void finishView(views.retry(), () => {
      if (failed?.kind === "delete") {
        setSelectedView(current => current === failed.id ? null : current);
        return;
      }
      if (failed?.kind !== "save") return;
      const id = failed.view.id ?? views.getSnapshot().accepted?.find(record =>
        !acceptedIds.has(record.id) && record.name === failed.view.name && record.state === failed.view.state)?.id;
      if (id) setSelectedView(id);
    });
  }
  const viewModel = createMemo<DataTablePageViews>(() => ({
    records: viewSnapshot().accepted?.map(record => ({ id: record.id, name: record.name })) ?? [],
    selectedId: selectedView(), draftName: viewName(), pending: viewSnapshot().pending !== null,
    error: viewSnapshot().error ? "Saved view operation failed. Existing results were retained." : null,
    onSelectedChange: setSelectedView, onDraftNameChange: setViewName, onSave: saveView, onRename: renameView, onRestore: restoreView, onDelete: deleteView,
    onRetry: retryView,
  }));
  async function refresh(): Promise<void> {
    refreshRequest?.abort();
    const controller = new AbortController();
    refreshRequest = controller;
    const token = ++refreshToken;
    setPhase("refresh");
    try {
      const response = await fetch(`/api/list-detail?id=message-1&delay=650&revision=${revision() + 1}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Refresh failed (${response.status})`);
      if (token === refreshToken) setRevision(value => value + 1);
    } catch (error) {
      if (!controller.signal.aborted && token === refreshToken) setLastAction(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      if (token === refreshToken) { refreshRequest = undefined; setPhase("idle"); }
    }
  }
  onMount(() => {
    if (phase() !== "cold") return;
    const controller = new AbortController();
    refreshRequest = controller;
    const token = ++refreshToken;
    void fetch("/api/list-detail?id=message-1&delay=650&revision=1", { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`Cold load failed (${response.status})`);
      if (token === refreshToken) setRevision(1);
    }).catch(() => {
      if (!controller.signal.aborted && token === refreshToken) setPageState("server-error");
    }).finally(() => {
      if (token === refreshToken) { refreshRequest = undefined; setPhase("idle"); }
    });
  });
  const actions: readonly DataTableAction<Account>[] = [{ id: "archive", label: "Archive", onSelect: context => setLastAction(`Archived ${context.selection.kind === "ids" ? context.selection.ids.length : "query"}`) }];
  const toolbarGroups = createMemo<readonly ToolbarGroup[]>(() => [{ id: "data", label: "Data", items: [
    { kind: "action", id: "refresh", label: "Refresh accounts", disabled: phase() !== "idle", onSelect: () => { void refresh(); } },
    { kind: "action", id: "revoke", label: "Revoke access", onSelect: () => setPageState("permission-denied") },
  ] }]);
  const selectionStatus = createMemo(() => {
    const current = selection();
    return current.kind === "ids" ? `${current.ids.length} IDs` : "Query";
  });
  onCleanup(() => { alive = false; refreshRequest?.abort(); views.dispose(); });

  return <ShortcutProvider platform="other" development={true}><DataTablePage title="Accounts" toolbarLabel="Account page actions" toolbarGroups={toolbarGroups()} views={viewModel()} state={pageState()} loadingPhase={phase()}
    loadingFallback={<div class="loupe-data-table-page-skeleton"><For each={[1, 2, 3, 4, 5, 6]}>{() => <Skeleton />}</For></div>}
    errorDescription={pageState() === "permission-denied" ? "Account access was revoked." : "The account page is unavailable."}
    onRetry={() => { setPageState("ready"); }}
    status={<StatusBar><output aria-label="Accepted revision">Revision {revision()}</output><output aria-label="Last table action">{lastAction()}</output><output aria-label="Selection snapshot">{selectionStatus()}</output></StatusBar>}>
    <For each={[tableVersion()]}>{() => <DataTable data={data()} columns={columns} getRowId={row => row.id} caption="Accounts" pagination={tableInitial().pagination} initialState={tableInitial()}
      {...(parameters().get("variant") === "framed" ? framedTable : {})}
      search={search} initialViewportHeight={420} mobileLayout={{ pageSize: 12, titleColumn: "name" }} selection={{ mode: "multiple", onChange: setSelection }} actions={actions} onAcceptedStateChange={setTableState} />}</For>
  </DataTablePage></ShortcutProvider>;
}
