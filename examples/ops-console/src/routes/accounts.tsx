import { Badge, Button, DescriptionDetails, DescriptionList, DescriptionTerm, Drawer, NumberText, Skeleton, Stack, Text, optimistic } from "@gemologic/sheen";
import { DataTablePage } from "@gemologic/sheen-patterns";
import type { DataTablePageViews, ToolbarGroup } from "@gemologic/sheen-patterns";
import { useAdminServices } from "@gemologic/sheen-patterns/admin";
import { DataTable, QueryBuilder, createSavedViews, defineColumns, parseTableState } from "@gemologic/sheen-table";
import type { BulkSelection, DataTableAction, DataTableActionContext, DataTableResult, FilterNode, QueryBuilderColumn, SavedViewOutcome, SavedViewRecord, SavedViewsAdapter, SavedViewsSnapshot, TableState } from "@gemologic/sheen-table";
import { For, Show, batch, createEffect, createMemo, createSignal, on, onCleanup, onMount, untrack } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { initialData } from "../bootstrap.ts";
import { useConsole } from "../console.tsx";
import { ACCOUNT_PAGE_SIZE, accountPlans, accountRegions, accountSchema, accountStatuses, defaultAccountState, parseAccountLive, parseAccountResult } from "../lib/accounts.ts";
import type { AccountRow, AccountStatus } from "../lib/accounts.ts";
import { canViewAccounts } from "../lib/session.ts";

interface LiveEntry {
  readonly status: AccountStatus;
  readonly perMinute: number | null;
  /** Optimistic operation that owns this status until it commits or rolls back. */
  readonly operation: number | null;
}

const queryColumns: readonly QueryBuilderColumn[] = [
  { id: "name", label: "Account", type: "text" },
  { id: "owner", label: "Owner", type: "text" },
  { id: "status", label: "Status", type: "enum", options: [...accountStatuses] },
  { id: "plan", label: "Plan", type: "enum", options: [...accountPlans] },
  { id: "region", label: "Region", type: "enum", options: [...accountRegions] },
  { id: "balance", label: "Balance (USD)", type: "number" },
  { id: "requests", label: "Requests (30 days)", type: "number" },
];

const statusTone = (status: AccountStatus) => status === "Active" ? "success" : status === "Review" ? "warning" : "neutral";
const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "medium", timeZone: "UTC" });
const emptyFilter: FilterNode = { kind: "and", children: [] };

function parseView(value: unknown): SavedViewRecord {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string" || !("name" in value) || typeof value.name !== "string" || !("state" in value) || typeof value.state !== "string") throw new Error("Invalid saved view");
  return { id: value.id, name: value.name, state: value.state };
}

export default function Accounts() {
  const shell = useConsole();
  const services = useAdminServices();
  const authorized = createMemo(() => canViewAccounts(shell.role()));
  const [live, setLive] = createStore<Record<string, LiveEntry>>({});
  const [liveAt, setLiveAt] = createSignal<number>();
  const [liveError, setLiveError] = createSignal(false);
  const [manualRefresh, setManualRefresh] = createSignal(false);
  const [selection, setSelection] = createSignal<BulkSelection>({ kind: "ids", ids: [] });
  const [filter, setFilter] = createSignal<FilterNode>(emptyFilter);
  const [queryDraft, setQueryDraft] = createSignal<FilterNode>(emptyFilter);
  const [queryOpen, setQueryOpen] = createSignal(false);
  const [tableState, setTableState] = createSignal<TableState>(defaultAccountState);
  const [tableInitial, setTableInitial] = createSignal<TableState>(defaultAccountState);
  const [tableVersion, setTableVersion] = createSignal(0);
  const [visibleIds, setVisibleIds] = createSignal<readonly string[]>([]);
  const initialResult = initialData("accounts");
  let operationSerial = 0;

  const liveStatus = (row: AccountRow): LiveEntry["status"] => live[row.id]?.status ?? row.status;

  const columns = defineColumns<AccountRow>([
    { id: "name", header: "Account", accessor: row => row.name, search: true, filter: { type: "text" }, sort: "text", width: 260, pin: "start", cellDependencies: ["id", "hold"],
      cell: (value, row) => <span class="ops-account-cell"><strong>{String(value)}</strong><small>{row.id}{row.hold ? " · Legal hold" : ""}</small></span> },
    { id: "owner", header: "Owner", accessor: row => row.owner, search: true, filter: { type: "text" }, sort: "text", width: "fill", minWidth: 170 },
    { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: [...accountStatuses], faceted: true }, sort: "text", width: 140, cellDependencies: ["id"],
      cell: (_value, row) => <span class="ops-status-cell"><Badge tone={statusTone(liveStatus(row))}>{liveStatus(row)}</Badge><Show when={live[row.id]?.operation != null}><Text size="caption" tone="muted">Saving</Text></Show></span> },
    { id: "plan", header: "Plan", accessor: row => row.plan, filter: { type: "enum", options: [...accountPlans], faceted: true }, sort: "text", width: 120 },
    { id: "region", header: "Region", accessor: row => row.region, filter: { type: "enum", options: [...accountRegions], faceted: true }, sort: "text", width: 140 },
    { id: "balance", header: "Balance (USD)", accessor: row => row.balance, filter: { type: "number" }, sort: "number", numeric: true, width: 150, cellDependencies: [],
      cell: value => <NumberText value={Number(value)} format={{ style: "currency", currency: "USD" }} /> },
    { id: "requests", header: "Requests (30 days)", accessor: row => row.requests, filter: { type: "number" }, sort: "number", numeric: true, width: 160, cellDependencies: [],
      cell: value => <NumberText value={Number(value)} format={{ maximumFractionDigits: 0 }} /> },
    { id: "live", header: "Requests / min (live)", numeric: true, width: 170, cellDependencies: ["id"],
      cell: (_value, row) => <span class="ops-live-cell">{live[row.id]?.perMinute == null ? "—" : <NumberText value={live[row.id]?.perMinute ?? 0} format={{ maximumFractionDigits: 0 }} />}</span> },
  ]);

  async function load(state: TableState, signal: AbortSignal): Promise<DataTableResult<AccountRow>> {
    const response = await fetch("/api/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state }), signal });
    if (!response.ok) throw new Error(`Accounts query failed (${response.status})`);
    const result = parseAccountResult(await response.json());
    // Superseded requests are aborted and token-rejected by DataTable; only track IDs for the request that resolved last.
    if (!signal.aborted) setVisibleIds(result.rows.map(row => row.id));
    return result;
  }

  if (initialResult) setVisibleIds(initialResult.rows.map(row => row.id));

  // Background revalidation: refreshes live fields for accepted rows on an interval. The table query, row DOM,
  // focus, selection, and scroll are untouched because no new table state is requested.
  let liveRequest: AbortController | undefined;
  let liveToken = 0;
  async function revalidate(manual: boolean): Promise<void> {
    const ids = visibleIds();
    if (!authorized() || ids.length === 0) return;
    liveRequest?.abort();
    const controller = new AbortController();
    liveRequest = controller;
    const token = ++liveToken;
    if (manual) setManualRefresh(true);
    try {
      const response = await fetch(`/api/accounts/live?ids=${encodeURIComponent(ids.join(","))}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Live refresh failed (${response.status})`);
      const body: unknown = await response.json();
      if (typeof body !== "object" || body === null || !("accounts" in body) || !Array.isArray(body.accounts) || !("at" in body) || typeof body.at !== "number") throw new Error("Invalid live response");
      const accounts = body.accounts.map(parseAccountLive);
      if (token !== liveToken || !authorized()) return;
      const at = body.at;
      batch(() => {
        setLive(produce(draft => {
          for (const account of accounts) {
            const current = draft[account.id];
            // Never overwrite a status owned by a pending optimistic operation.
            draft[account.id] = current?.operation != null ? { ...current, perMinute: account.perMinute } : { status: account.status, perMinute: account.perMinute, operation: null };
          }
        }));
        setLiveAt(at);
        setLiveError(false);
      });
    } catch {
      if (token === liveToken && !controller.signal.aborted) setLiveError(true);
    } finally {
      if (token === liveToken) { liveRequest = undefined; setManualRefresh(false); }
    }
  }

  onMount(() => {
    createEffect(on([shell.liveInterval, authorized], ([interval, allowed]) => {
      if (!allowed || interval <= 0) return;
      void revalidate(false);
      const timer = window.setInterval(() => { void revalidate(false); }, interval);
      onCleanup(() => window.clearInterval(timer));
    }));
  });

  // Losing access drops every account-derived value synchronously, even with requests in flight.
  createEffect(on(authorized, allowed => {
    if (allowed) return;
    liveRequest?.abort();
    liveToken++;
    batch(() => {
      setLive(produce(draft => { for (const key of Object.keys(draft)) delete draft[key]; }));
      setVisibleIds([]);
      setSelection({ kind: "ids", ids: [] });
      setLiveAt(undefined);
      setManualRefresh(false);
      setViewSnapshot({ accepted: null, pending: null, failed: null, error: null });
    });
    views.clear();
    shell.showDetails(undefined);
  }, { defer: true }));
  onCleanup(() => { liveRequest?.abort(); views.dispose(); });

  function suspend(context: DataTableActionContext<AccountRow>): void {
    const operation = ++operationSerial;
    const loaded = context.loadedRows;
    const count = context.selection.kind === "ids" ? context.selection.ids.length : null;
    void optimistic(() => {
      const previous = new Map(loaded.map(row => [row.id, live[row.id]]));
      setLive(produce(draft => {
        for (const row of loaded) draft[row.id] = { status: "Suspended", perMinute: draft[row.id]?.perMinute ?? null, operation };
      }));
      return () => setLive(produce(draft => {
        for (const row of loaded) {
          if (draft[row.id]?.operation !== operation) continue;
          const before = previous.get(row.id);
          if (before) draft[row.id] = before;
          else delete draft[row.id];
        }
      }));
    }, async () => {
      const response = await fetch("/api/accounts/suspend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ selection: context.selection }) });
      if (!response.ok) throw new Error(response.status === 409 || response.status === 413 ? await response.text() : `Suspension failed (${response.status})`);
      const body: unknown = await response.json();
      return typeof body === "object" && body !== null && "suspended" in body && typeof body.suspended === "number" ? body.suspended : 0;
    }).then(suspended => {
      setLive(produce(draft => { for (const row of loaded) { const entry = draft[row.id]; if (entry?.operation === operation) draft[row.id] = { ...entry, operation: null }; } }));
      services.toasts.show({ title: `Suspended ${suspended.toLocaleString("en-US")} ${suspended === 1 ? "account" : "accounts"}`, tone: "success" });
    }, (error: unknown) => {
      services.toasts.show({ title: "Suspension rolled back", description: error instanceof Error ? error.message : "The server rejected the change. No accounts were suspended.", tone: "danger", duration: null });
    });
    if (count !== null && count > loaded.length) services.toasts.show({ title: "Suspending selection", description: "Only loaded rows update optimistically; the rest change on the server.", tone: "neutral" });
  }

  const actions: readonly DataTableAction<AccountRow>[] = [{
    id: "suspend", label: "Suspend", tone: "danger",
    disabled: context => !authorized() || context.loadedRows.every(row => liveStatus(row) === "Suspended"),
    onSelect: context => { void services.confirm.confirm({ title: "Suspend accounts?", description: "Suspended accounts stop serving traffic until an operator restores them.", confirmLabel: "Suspend", tone: "danger" }).then(ok => { if (ok) suspend(context); }); },
  }];

  const adapter: SavedViewsAdapter = {
    async list(signal) {
      const response = await fetch("/api/views", { signal });
      if (!response.ok) throw new Error(`View list failed (${response.status})`);
      const value: unknown = await response.json();
      if (!Array.isArray(value)) throw new Error("Invalid saved view list");
      return value.map(parseView);
    },
    async save(view, signal) {
      const response = await fetch("/api/views", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(view), signal });
      if (!response.ok) throw new Error(`View save failed (${response.status})`);
      return parseView(await response.json());
    },
    async delete(id, signal) {
      const response = await fetch("/api/views", { method: "DELETE", body: id, signal });
      if (!response.ok) throw new Error(`View delete failed (${response.status})`);
    },
  };
  const views = createSavedViews(adapter, accountSchema);
  const [viewSnapshot, setViewSnapshot] = createSignal<SavedViewsSnapshot>({ accepted: null, pending: null, failed: null, error: null });
  const [viewName, setViewName] = createSignal("My accounts view");
  const [selectedView, setSelectedView] = createSignal<string | null>(null);
  const publishViews = () => { if (authorized()) setViewSnapshot(views.getSnapshot()); };
  async function finishView(pending: Promise<SavedViewOutcome>, after?: () => void): Promise<void> {
    publishViews();
    const outcome = await pending;
    batch(() => { publishViews(); if (outcome === "accepted") after?.(); });
  }
  onMount(() => { if (authorized()) void finishView(views.list()); });
  createEffect(on(authorized, allowed => { if (allowed) void finishView(views.list()); }, { defer: true }));

  /** Applying a view replaces the whole table state. DataTable has no controlled-state input, so the owner is recreated. */
  function restoreView(id: string): void {
    const restored = views.restore(id);
    if (restored.kind !== "accepted") {
      services.toasts.show({ title: "View could not be restored", description: "Its saved state no longer matches the account columns.", tone: "warning" });
      return;
    }
    const pagination = restored.state.pagination === false ? defaultAccountState.pagination : restored.state.pagination;
    const state = parseTableState({ ...restored.state, pagination }, accountSchema);
    batch(() => {
      setTableInitial(state);
      setTableState(state);
      setFilter(state.filter);
      setSelectedView(id);
      setTableVersion(version => version + 1);
    });
  }
  const viewModel = createMemo<DataTablePageViews>(() => ({
    records: viewSnapshot().accepted?.map(record => ({ id: record.id, name: record.name })) ?? [],
    selectedId: selectedView(), draftName: viewName(), pending: viewSnapshot().pending !== null,
    error: viewSnapshot().error ? "Saved view operation failed. Current results were kept." : null,
    onSelectedChange: setSelectedView, onDraftNameChange: setViewName,
    onSave: name => { void finishView(views.save(name, tableState()), () => setSelectedView(views.getSnapshot().accepted?.find(record => record.name === name)?.id ?? null)); },
    onRename: (id, name) => { const restored = views.restore(id); if (restored.kind === "accepted") void finishView(views.save(name, restored.state, id)); },
    onRestore: restoreView,
    onDelete: id => { void finishView(views.delete(id), () => setSelectedView(current => current === id ? null : current)); },
    onRetry: () => { void finishView(views.retry()); },
  }));

  const toolbarGroups = createMemo<readonly ToolbarGroup[]>(() => [{ id: "data", label: "Data", items: [
    { kind: "action", id: "refresh-live", label: "Refresh live fields", disabled: manualRefresh(), onSelect: () => { void revalidate(true); } },
    { kind: "action", id: "advanced-query", label: "Advanced query", onSelect: () => batch(() => { setQueryDraft(filter()); setQueryOpen(true); }) },
  ] }]);

  const selectionLabel = createMemo(() => {
    const current = selection();
    return current.kind === "ids" ? `${current.ids.length.toLocaleString("en-US")} selected` : "All matching selected";
  });

  return <div class="ops-fill">
    <DataTablePage title="Accounts" toolbarLabel="Account actions" toolbarGroups={toolbarGroups()} views={viewModel()}
      state={authorized() ? "ready" : "permission-denied"} errorDescription="The viewer role cannot see account data. Switch back to the operator role to continue."
      loadingPhase={manualRefresh() ? "refresh" : "idle"} loadingFallback={<Skeleton shape="rectangle" style={{ "block-size": "100%" }} />}
      status={<div class="ops-meta" data-testid="accounts-status">
        <span>{selectionLabel()}</span>
        <span>{liveError() ? "Live refresh failed; showing the last accepted values." : liveAt() === undefined ? "Live fields pending" : `Live fields updated ${timeFormat.format(liveAt() ?? 0)} UTC`}</span>
      </div>}>
      <For each={[tableVersion()]}>{version => <DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Accounts" density="compact" rowHeight="44px" estimatedRowHeight={44}
        pagination={tableInitial().pagination === false ? { pageIndex: 0, pageSize: ACCOUNT_PAGE_SIZE } : tableInitial().pagination}
        initialState={tableInitial()} filter={filter()} {...(version === 0 && initialResult ? { initialResult } : {})}
        onStateChange={load} onAcceptedStateChange={state => { batch(() => { setTableState(state); setFilter(state.filter); }); void revalidate(false); }}
        search={{ shortcut: "mod+f", exactMatch: true, placeholder: "Search name, owner, or account ID" }} filterBar columnControls export={false}
        selection={{ mode: "multiple", onChange: setSelection, resetKey: shell.role() }} actions={actions} initialViewportHeight={560}
        mobileLayout={{ titleColumn: "name" }}
        onRowActivate={row => shell.showDetails({ id: row.id, title: row.name, render: () => <AccountDetails row={row} status={liveStatus(row)} /> })} />}</For>
    </DataTablePage>
    <Drawer title="Advanced query" description="Nested conditions apply to the complete server query, not the visible page." open={queryOpen()} onOpenChange={setQueryOpen}
      footer={<Stack gap="sm"><Button variant="solid" tone="accent" onClick={() => batch(() => { setFilter(untrack(queryDraft)); setQueryOpen(false); })}>Apply query</Button></Stack>}>
      <QueryBuilder columns={queryColumns} value={queryDraft()} onChange={setQueryDraft} label="Account query" />
    </Drawer>
  </div>;
}

function AccountDetails(props: { readonly row: AccountRow; readonly status: AccountStatus }) {
  return <div class="ops-detail">
    <header><Text tone="muted">{props.row.id}</Text><Badge tone={statusTone(props.status)}>{props.status}</Badge></header>
    <DescriptionList layout="columns">
      <DescriptionTerm>Owner</DescriptionTerm><DescriptionDetails>{props.row.owner}</DescriptionDetails>
      <DescriptionTerm>Plan</DescriptionTerm><DescriptionDetails>{props.row.plan}</DescriptionDetails>
      <DescriptionTerm>Region</DescriptionTerm><DescriptionDetails>{props.row.region}</DescriptionDetails>
      <DescriptionTerm>Balance</DescriptionTerm><DescriptionDetails numeric><NumberText value={props.row.balance} format={{ style: "currency", currency: "USD" }} /></DescriptionDetails>
      <DescriptionTerm>Legal hold</DescriptionTerm><DescriptionDetails>{props.row.hold ? "Yes, suspension is blocked" : "No"}</DescriptionDetails>
    </DescriptionList>
  </div>;
}
