import { ActivityTimeline, Badge, Button, Card, EmptyState, Input, Link, Meter, Progress, SearchInput, Select, Skeleton, Stack, Switch as ToggleSwitch, Text } from "@gemologic/sheen";
import type { ActivityTimelineItem, ThemeOverrides, ThemeState } from "@gemologic/sheen";
import { BarChart } from "@gemologic/sheen-charts/charts-svg";
import type { ChartData } from "@gemologic/sheen-charts/core";
import { Sparkline, StatGroup } from "@gemologic/sheen-charts/svg";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { accentNames, bundledThemeMetadata, isAccentName } from "@gemologic/sheen-tokens";
import type { AccentName } from "@gemologic/sheen-tokens";
import { AddIcon, ExternalLinkIcon, HomeIcon, InboxIcon, LockIcon, RefreshIcon, SettingsIcon, UserIcon, UsersIcon } from "@gemologic/sheen-icons";
import { AdminApp, adminPlacementTargets, resolveAdminAppearance, useAdminServices } from "@gemologic/sheen-patterns/admin";
import type { AdminAccountModel, AdminActionAppearance, AdminActionGroup, AdminAppearance, AdminChromeAppearance, AdminChromeTarget, AdminChromeZone, AdminDetailsModel, AdminNavigationAppearance, AdminNavigationModel, AdminNotificationModel, AdminPlacementOverride, AdminPreset, AdminResolvedAppearance, AdminWorkspaceModel } from "@gemologic/sheen-patterns/admin";
import { ErrorState, LoadingState, PageHeader, StatusBar } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { TablePagination } from "@gemologic/sheen-table";
import { For, Match, Switch, batch, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { createAdminWorkload, refreshAdminWorkload, regionCapacity, regionSeries, trafficSeries } from "./admin-app-data.ts";
import type { AdminAccountRow, AdminWorkload, AdminWorkloadSnapshot, AdminWorkloadSummary } from "./admin-app-data.ts";

const columns = defineColumns<AdminAccountRow>([
  { id: "name", header: "Account", accessor: row => row.name, search: true, filter: { type: "text" }, sort: "text", width: "fill", cell: (value, row) => <span class="loupe-admin-account-cell"><strong>{String(value)}</strong><small>{row.id}</small></span> },
  { id: "owner", header: "Owner", accessor: row => row.owner, search: true, filter: { type: "text" }, sort: "text", width: 180 },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Review", "Paused"], faceted: true }, sort: "text", width: 120, cell: value => <Badge tone={value === "Active" ? "success" : value === "Review" ? "warning" : "neutral"}>{String(value)}</Badge> },
  { id: "plan", header: "Plan", accessor: row => row.plan, search: true, filter: { type: "enum", options: ["Enterprise", "Growth", "Core"], faceted: true }, sort: "text", width: 120 },
  { id: "region", header: "Region", accessor: row => row.region, search: true, filter: { type: "enum", options: ["US East", "US West", "EU Central", "Asia Pacific"], faceted: true }, sort: "text", width: 130 },
  { id: "balance", header: "Balance", accessor: row => row.balance, filter: { type: "number" }, sort: "number", numeric: true, width: 140 },
  { id: "requests", header: "Requests", accessor: row => row.requests, filter: { type: "number" }, sort: "number", numeric: true, width: 120 },
  { id: "utilization", header: "Utilization", accessor: row => row.utilization, filter: { type: "number" }, sort: "number", numeric: true, width: 120, cell: (value, row) => <span class="loupe-admin-utilization"><Meter label={`${row.name} utilization`} value={Number(value)} min={0} max={100} low={45} high={82} optimum={55} /><span>{String(value)}%</span></span> },
  { id: "updated", header: "Updated", accessor: row => row.updated, search: true, sort: "text", width: 120 },
]);

const themeOptions = [{ value: "inherit", label: "Inherit root theme" }, ...bundledThemeMetadata.map(theme => ({ value: theme.id, label: theme.label }))];
const accentOptions = [{ value: "inherit", label: "Inherit root accent" }, ...accentNames.map(accent => ({ value: accent, label: accent[0]?.toUpperCase() + accent.slice(1) }))];
const modeOptions = [{ value: "inherit", label: "Inherit root mode" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }];
const directionOptions = [{ value: "inherit", label: "Inherit root direction" }, { value: "ltr", label: "Left to right" }, { value: "rtl", label: "Right to left" }];
const emptyWorkloadSummary: AdminWorkloadSummary = Object.freeze({ active: 0, review: 0, balance: 0, requests: 0, utilization: 0 });

interface PlacementControl {
  readonly zone: AdminChromeZone;
  readonly key: `place-${AdminChromeZone}`;
  readonly label: string;
}

const placementControls: readonly PlacementControl[] = Object.freeze([
  { zone: "product", key: "place-product", label: "Product" },
  { zone: "workspace", key: "place-workspace", label: "Workspace" },
  { zone: "primary-navigation", key: "place-primary-navigation", label: "Primary navigation" },
  { zone: "secondary-navigation", key: "place-secondary-navigation", label: "Secondary navigation" },
  { zone: "current-view", key: "place-current-view", label: "Current view" },
  { zone: "global-search", key: "place-global-search", label: "Global search" },
  { zone: "command-trigger", key: "place-command-trigger", label: "Command trigger" },
  { zone: "primary-actions", key: "place-primary-actions", label: "Primary actions" },
  { zone: "utility-actions", key: "place-utility-actions", label: "Utility actions" },
  { zone: "notifications", key: "place-notifications", label: "Notifications" },
  { zone: "help", key: "place-help", label: "Help" },
  { zone: "account", key: "place-account", label: "Account" },
]);

const placementTargetLabels: Readonly<Record<AdminChromeTarget, string>> = Object.freeze({
  "topbar-start": "Topbar start",
  "topbar-center": "Topbar center",
  "topbar-end": "Topbar end",
  "sidebar-header": "Sidebar header",
  "sidebar-navigation": "Sidebar navigation",
  "sidebar-footer": "Sidebar footer",
});

function placementOptions(zone: AdminChromeZone): readonly { readonly value: string; readonly label: string }[] {
  return [{ value: "inherit", label: "Preset default" }, ...adminPlacementTargets[zone].map(target => ({ value: target, label: placementTargetLabels[target] }))];
}

type AdminFixtureState = "ready" | "empty" | "loading" | "error" | "permission";
type AdminView = "overview" | "accounts" | "inbox" | "settings" | "audit" | "status" | "unknown";

interface ServiceHealth {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly status: "Operational" | "Degraded" | "Investigating";
  readonly latency: number;
  readonly saturation: number;
  readonly history: Float64Array;
}

interface AuditItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly time: string;
  readonly tone: "success" | "accent" | "warning";
}

function deploymentState(index: number): ActivityTimelineItem["state"] {
  if (index === 2) return "current";
  if (index === 7) return "error";
  return "completed";
}

const services: readonly ServiceHealth[] = Object.freeze(Array.from({ length: 10 }, (_, index): ServiceHealth => Object.freeze({
  id: `service-${index + 1}`,
  name: ["Public API", "Identity", "Event pipeline", "Exports", "Policy engine", "Search", "Billing", "Notification delivery", "Audit archive", "Webhook relay"][index] ?? `Service ${index + 1}`,
  region: ["Global", "US East", "EU Central", "US West", "Asia Pacific"][index % 5] ?? "Global",
  status: index === 3 ? "Degraded" : index === 7 ? "Investigating" : "Operational",
  latency: 31 + index * 7,
  saturation: 42 + ((index * 11) % 49),
  history: new Float64Array(Array.from({ length: 24 }, (_, sample) => 30 + index * 5 + Math.sin(sample / 2 + index) * 9 + (sample % 4))),
})));

const deploymentActivity: readonly ActivityTimelineItem[] = Object.freeze(Array.from({ length: 12 }, (_, index): ActivityTimelineItem => Object.freeze({
  id: `deployment-${index + 1}`,
  title: ["Production rollout completed", "Canary health accepted", "Schema migration verified", "Policy bundle published"][index % 4] ?? "Deployment updated",
  description: `Revision ${1842 - index} passed ${6 + (index % 4)} regional checks without replacing accepted application state.`,
  actor: ["Ada Lovelace", "Grace Hopper", "Margaret Hamilton", "Katherine Johnson"][index % 4] ?? "Operations",
  timestamp: new Date(Date.UTC(2026, 8, 9, 16, 30) - index * 1_800_000).toISOString(),
  timeLabel: index === 0 ? "Just now" : `${index * 30} min ago`,
  state: deploymentState(index),
})));

const inboxItems = Object.freeze(Array.from({ length: 36 }, (_, index) => Object.freeze({
  id: `message-${index + 1}`,
  title: ["Owner review requested", "Production deploy completed", "Policy sync finished", "Usage threshold reached", "Export ready", "Webhook delivery recovered"][index % 6] ?? "Operations update",
  description: `${1 + (index % 12)} resources in ${["US East", "US West", "EU Central", "Asia Pacific"][index % 4] ?? "the workspace"} were updated in the accepted snapshot.`,
  time: index < 2 ? `${18 + index * 7} min` : index < 24 ? `${index + 1} hr` : `${Math.floor(index / 12)} days`,
})));

const ownersForAudit = Object.freeze(["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"]);

const auditItems: readonly AuditItem[] = Object.freeze(Array.from({ length: 80 }, (_, index): AuditItem => Object.freeze({
  id: `audit-${index + 1}`,
  title: ["Deployment completed", "Account policy updated", "Workspace exported", "Access review approved", "Key rotated", "Saved view shared"][index % 6] ?? "Workspace changed",
  description: `${ownersForAudit[index % ownersForAudit.length] ?? "Operations"} changed ${1 + (index % 9)} resources in revision ${1842 - index}.`,
  time: index < 2 ? `${4 + index * 13} min ago` : index < 24 ? `${index} hr ago` : `${Math.floor(index / 24)} days ago`,
  tone: index % 11 === 0 ? "warning" : index % 3 === 0 ? "accent" : "success",
})));

function adminView(value: string | undefined): AdminView {
  if (value === undefined) return "overview";
  if (value === "accounts" || value === "inbox" || value === "settings" || value === "audit" || value === "status") return value;
  return "unknown";
}

function adminViewLabel(view: AdminView): string {
  if (view === "overview") return "Overview";
  if (view === "accounts") return "Accounts";
  if (view === "inbox") return "Inbox";
  if (view === "settings") return "Settings";
  if (view === "audit") return "Audit log";
  if (view === "status") return "Service status";
  return "Not found";
}

function fixtureState(value: string | null): AdminFixtureState {
  return value === "empty" || value === "loading" || value === "error" || value === "permission" ? value : "ready";
}

function workloadValue(value: string | null): AdminWorkload {
  return value === "heavy" ? "heavy" : "representative";
}

function presetValue(value: string | null): AdminPreset {
  return value === "workspace" || value === "horizontal" || value === "inspector" ? value : "standard";
}

function placementTarget(zone: AdminChromeZone, value: string | null): AdminChromeTarget | undefined {
  if (value === null) return undefined;
  return adminPlacementTargets[zone].find(target => target === value);
}

function placementOverrides(parameters: URLSearchParams): readonly AdminPlacementOverride[] {
  const result: AdminPlacementOverride[] = [];
  for (const control of placementControls) {
    const target = placementTarget(control.zone, parameters.get(control.key));
    if (target !== undefined) result.push({ zone: control.zone, target });
  }
  return result;
}

function chromeAppearance(value: string | null): AdminChromeAppearance {
  return value === "unified" || value === "tonal" ? value : "layered";
}

function navigationAppearance(value: string | null): AdminNavigationAppearance {
  return value === "accent" || value === "indicator" ? value : "subtle";
}

function actionAppearance(value: string | null): AdminActionAppearance {
  return value === "quiet" || value === "outlined" ? value : "accent";
}

function themeId(value: string | null): string | undefined {
  return value && bundledThemeMetadata.some(theme => theme.id === value) ? value : undefined;
}

function themeMode(value: string | null): ThemeState["mode"] | undefined {
  return value === "dark" || value === "light" || value === "system" ? value : undefined;
}

function accentName(value: string | null): AccentName | undefined {
  return value && isAccentName(value) ? value : undefined;
}

function themeDirection(value: string | null): ThemeState["direction"] | undefined {
  return value === "ltr" || value === "rtl" ? value : undefined;
}

export interface AdminAppFixtureProps {
  readonly view?: string;
}

export function AdminAppFixture(props: AdminAppFixtureProps) {
  const router = useSolidRouterAdapter();
  const parameters = createMemo(() => new URLSearchParams(router.location().search));
  const preset = createMemo(() => presetValue(parameters().get("preset")));
  const placements = createMemo(() => placementOverrides(parameters()));
  const appearance = createMemo<AdminAppearance>(() => ({
    chrome: chromeAppearance(parameters().get("chrome")),
    navigation: navigationAppearance(parameters().get("navigation")),
    actions: actionAppearance(parameters().get("actions")),
  }));
  const resolvedAppearance = createMemo(() => resolveAdminAppearance(appearance()));
  const scopedTheme = createMemo<ThemeOverrides>(() => {
    const theme = themeId(parameters().get("theme"));
    const mode = themeMode(parameters().get("mode"));
    const accent = accentName(parameters().get("accent"));
    const direction = themeDirection(parameters().get("direction"));
    return {
      ...(theme === undefined ? {} : { theme }),
      ...(mode === undefined ? {} : { mode }),
      ...(accent === undefined ? {} : { accent }),
      ...(direction === undefined ? {} : { direction }),
    };
  });
  const configurationHref = (key: string, value: string): string => {
    const next = new URLSearchParams(parameters());
    if (value === "inherit") next.delete(key);
    else next.set(key, value);
    return `?${next.toString()}`;
  };
  const configure = (key: string, value: string): void => router.navigate(configurationHref(key, value));
  const routeHref = (pathname: string): string => {
    const search = parameters().toString();
    return search ? `${pathname}?${search}` : pathname;
  };
  const setSidebarCollapsed = (collapsed: boolean): void => router.navigate(configurationHref("sidebar", collapsed ? "collapsed" : "inherit"), { replace: true, scroll: false });
  const workload = createMemo(() => workloadValue(parameters().get("workload")));
  const pagination = createMemo<TablePagination>(() => parameters().get("table") === "continuous" ? false : { pageIndex: 0, pageSize: 25 });
  const view = createMemo(() => adminView(props.view));
  const [snapshot, setSnapshot] = createSignal<AdminWorkloadSnapshot>(createAdminWorkload(workload()));
  const rowCount = createMemo(() => snapshot().rowCount);
  const chartPoints = createMemo(() => snapshot().chartPoints);
  const [refreshing, setRefreshing] = createSignal(false);
  const [revision, setRevision] = createSignal(1);
  const [workspaceId, setWorkspaceId] = createSignal("production");
  const [inboxUnread, setInboxUnread] = createSignal(8);
  const [selectedId, setSelectedId] = createSignal<string>();
  const [detailsOpen, setDetailsOpen] = createSignal(false);
  const [state, setState] = createSignal<AdminFixtureState>(fixtureState(parameters().get("state")));
  const authorized = () => state() !== "permission";
  const longContent = createMemo(() => parameters().get("content") === "long");
  const [applicationSearch, setApplicationSearch] = createSignal("");
  const navigation = createMemo<AdminNavigationModel>(() => ({ id: "primary", label: "Primary navigation", items: [
    { kind: "link", id: "overview", label: "Overview", href: routeHref("/admin"), icon: <HomeIcon decorative />, actions: { label: "Overview actions", items: [
      { kind: "action", id: "refresh-overview", label: "Refresh dashboard", get disabled() { return refreshing(); }, onSelect: () => { void refresh(); } },
    ] } },
    { kind: "link", id: "accounts", label: longContent() ? "Accounts requiring unusually detailed operational review" : "Accounts", href: routeHref("/admin/accounts"), match: "prefix", icon: <UsersIcon decorative />, badge: <Badge>{rowCount().toLocaleString("en-US")}</Badge>, actions: { label: "Accounts actions", items: [
      { kind: "action", id: "preview-account", label: "Preview first account", onSelect: () => openDetails(snapshot().rows[0]?.id ?? "") },
    ] } },
    { kind: "link", id: "inbox", label: "Inbox", href: routeHref("/admin/inbox"), match: "prefix", icon: <InboxIcon decorative />, badge: inboxUnread() > 0 ? <Badge tone="accent">{inboxUnread()}</Badge> : undefined, actions: { label: "Inbox actions", items: [
      { kind: "action", id: "mark-inbox-read", label: "Mark inbox read", disabled: inboxUnread() === 0, onSelect: () => setInboxUnread(0) },
    ] } },
    { kind: "group", id: "configuration", label: "Configuration", items: [
      { kind: "link", id: "settings", label: "Settings", href: routeHref("/admin/settings"), match: "prefix", icon: <SettingsIcon decorative /> },
    ] },
  ] }));
  const secondaryNavigation = createMemo<AdminNavigationModel>(() => ({ id: "secondary", label: "Secondary navigation", items: [
    { kind: "link", id: "audit", label: "Audit log", href: routeHref("/admin/audit"), match: "prefix", icon: <InboxIcon decorative /> },
    { kind: "link", id: "service-status", label: "Service status", href: routeHref("/admin/status"), match: "prefix", icon: <SettingsIcon decorative /> },
  ] }));
  const product = createMemo(() => ({ name: longContent() ? "Northstar International Operations and Reliability" : "Northstar", href: routeHref("/admin"), mark: <span>N</span> }));
  let refreshRequest: AbortController | undefined;
  let refreshToken = 0;
  const pathname = createMemo(() => props.view ? `/admin/${props.view}` : "/admin");
  const selected = createMemo(() => snapshot().rows.find(row => row.id === selectedId()));
  const openDetails = (id: string): void => { setSelectedId(id); setDetailsOpen(true); };
  const revokeAccess = (): void => batch(() => { setDetailsOpen(false); setSelectedId(undefined); setState("permission"); });
  const selectedName = createMemo(() => selected()?.name);
  const detailsContent = createMemo(() => selectedId() ? <AccountDetails row={selected} /> : undefined);
  const details = createMemo<AdminDetailsModel | undefined>(() => {
    const id = selectedId();
    const title = selectedName();
    const content = detailsContent();
    if (!authorized() || !id || !title || !content) return undefined;
    return {
      id, title, open: detailsOpen(), resizable: true, onOpenChange: setDetailsOpen, content,
    };
  });
  createEffect(on(() => props.view, () => { setDetailsOpen(false); }, { defer: true }));
  createEffect(on(workload, next => {
    batch(() => {
      setSnapshot(createAdminWorkload(next));
      setRevision(1);
      setDetailsOpen(false);
      setSelectedId(undefined);
    });
  }, { defer: true }));
  const selectWorkspace = (id: string): void => {
    if (id === workspaceId()) return;
    batch(() => {
      setWorkspaceId(id);
      setApplicationSearch("");
      setDetailsOpen(false);
      setSelectedId(undefined);
      setRevision(1);
    });
  };
  const workspace = createMemo<AdminWorkspaceModel>(() => ({ label: "Workspace", currentId: workspaceId(), items: [
    { id: "production", label: longContent() ? "Production for the International Reliability Organization" : "Production", description: "US East" },
    { id: "staging", label: "Staging", description: "Internal" },
    { id: "sandbox", label: "Sandbox", description: "Personal" },
  ], onChange: selectWorkspace }));
  const workspaceName = createMemo(() => workspace().items.find(item => item.id === workspaceId())?.label ?? workspaceId());
  const account = createMemo<AdminAccountModel | undefined>(() => authorized() ? {
    id: "ada", name: longContent() ? "Ada Lovelace, Principal Reliability Administrator" : "Ada Lovelace", email: longContent() ? "ada.lovelace+international-operations@northstar.example.test" : "ada@northstar.test", menuLabel: "Open Ada Lovelace account menu",
    items: [
      { kind: "action", id: "profile", label: "Profile settings", icon: () => <UserIcon decorative />, onSelect: () => router.navigate("/admin/settings") },
      { kind: "separator", id: "account-separator" },
      { kind: "action", id: "sign-out", label: "Revoke demo access", icon: () => <LockIcon decorative />, onSelect: revokeAccess },
    ],
  } : undefined);
  const notifications = createMemo<AdminNotificationModel | undefined>(() => authorized() ? { items: [
    { kind: "link", id: "deploy", title: longContent() ? "International production deployment completed after multi-region verification" : "Deploy completed", description: "Production is serving revision 1842.", timeLabel: "4 minutes ago", href: "/admin" },
    { kind: "action", id: "review", title: "Review requested", description: "Eight accounts need an owner.", timeLabel: "18 minutes ago", onSelect: () => router.navigate("/admin/accounts") },
    { kind: "link", id: "policy", title: "Policy synchronized", description: "No permission changes detected.", timeLabel: "Yesterday", read: true, href: "/admin/settings" },
  ] } : undefined);
  async function refresh(): Promise<void> {
    refreshRequest?.abort();
    const controller = new AbortController();
    refreshRequest = controller;
    const token = ++refreshToken;
    let accepted = false;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/list-detail?id=message-1&delay=650&revision=${revision() + 1}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Refresh failed (${response.status})`);
      if (token !== refreshToken) return;
      const nextRevision = revision() + 1;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const nextSnapshot = refreshAdminWorkload(snapshot(), nextRevision);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (token !== refreshToken) return;
      batch(() => {
        setSnapshot(nextSnapshot);
        setRevision(nextRevision);
        setRefreshing(false);
      });
      accepted = true;
    } finally {
      if (token === refreshToken) {
        refreshRequest = undefined;
        if (!accepted) setRefreshing(false);
      }
    }
  }
  const actions = createMemo<readonly AdminActionGroup[]>(() => {
    if (!authorized()) return [];
    return [{ id: "create", label: "Create", role: "primary", items: [
      { kind: "action", id: "new-account", label: "New account", icon: <AddIcon decorative />, onSelect: () => openDetails(snapshot().rows[0]?.id ?? "") },
    ] }, { id: "operations", label: "Operations", role: "utility", items: [
      { kind: "action", id: "refresh", label: "Refresh", icon: <RefreshIcon decorative />, get disabled() { return refreshing(); }, onSelect: () => { void refresh(); } },
    ] }, { id: "help", label: "Help", role: "help", items: [
      { kind: "link", id: "component-docs", label: "Docs", icon: <ExternalLinkIcon decorative />, href: "/components" },
    ] }];
  });
  onCleanup(() => refreshRequest?.abort());
  return <AdminApp label="Northstar operations" documentTitle="Admin starter · Sheen" preset={preset()} placements={placements()} appearance={appearance()} theme={scopedTheme()}
    pathname={pathname()} router={router} product={product()} workspace={workspace()} contentReady={state() !== "loading"}
    defaultSidebarCollapsed={parameters().get("sidebar") === "collapsed"}
    onSidebarCollapsedChange={setSidebarCollapsed}
    primaryNavigation={navigation()} secondaryNavigation={secondaryNavigation()}
    currentView={parameters().has("place-current-view") ? <strong>{adminViewLabel(view())}</strong> : undefined}
    globalSearch={<SearchInput label="Search application" placeholder={`Search ${workspaceName().toLocaleLowerCase("en-US")}`} value={applicationSearch()} onValueChange={setApplicationSearch} />}
    actionGroups={actions()} notifications={notifications()} account={account()} commandPalette={authorized() ? { sources: [{ kind: "static", id: "admin", commands: [
      { id: "accounts", label: "Open accounts", group: "Navigation", run: () => router.navigate("/admin/accounts") },
      { id: "refresh", label: "Refresh accepted data", group: "Operations", run: refresh },
    ] }] } : undefined} details={details()} refreshing={refreshing()} authorizationKey={authorized() ? "operator" : "revoked"}
    statusBar={<StatusBar connection={authorized() ? "connected" : "disconnected"} tasks={refreshing() ? 1 : 0} counts={[{ label: "Rows", value: authorized() ? rowCount() : 0 }, { label: "Chart points", value: authorized() ? chartPoints() : 0 }]}><span>{workspaceName()} workspace</span><span>Revision {revision()}</span></StatusBar>}>
    <AdminStarterPage view={view()} rows={state() === "empty" ? [] : snapshot().rows} summary={state() === "empty" ? emptyWorkloadSummary : snapshot().summary} traffic={snapshot().traffic} workload={workload()} chartPoints={chartPoints()}
      pagination={pagination()} state={state()} refreshing={refreshing()} revision={revision()} preset={preset()}
      appearance={resolvedAppearance()} theme={parameters().get("theme") ?? "inherit"} mode={parameters().get("mode") ?? "inherit"}
      accent={parameters().get("accent") ?? "inherit"} direction={parameters().get("direction") ?? "inherit"} table={parameters().get("table") === "continuous" ? "continuous" : "paged"}
      workspaceId={workspaceId()} workspaceName={workspaceName()} inboxUnread={inboxUnread()} placementOverrides={placements()} onConfigure={configure} onStateChange={setState} onOpenDetails={openDetails} />
  </AdminApp>;
}

function AccountDetails(props: { readonly row: () => AdminAccountRow | undefined }) {
  const [note, setNote] = createSignal(`Review ${props.row()?.name ?? "account"}`);
  const activity = createMemo(() => {
    const row = props.row();
    if (!row) return [];
    return [
      { id: `${row.id}-accepted`, title: `Revision ${row.revision} accepted`, description: "Metrics and policy state were published atomically.", actor: row.owner, state: "completed" as const },
      { id: `${row.id}-review`, title: "Automated review running", description: "Usage, billing, and access controls are being checked.", state: "current" as const },
      { id: `${row.id}-renewal`, title: "Quarterly review", description: "Owner approval is required before the next renewal.", state: "upcoming" as const },
    ];
  });
  return <Stack gap="lg">
    <div class="loupe-admin-details-summary"><div><Text tone="muted">{props.row()?.id}</Text><strong>{props.row()?.plan} · {props.row()?.region}</strong></div><Badge tone={props.row()?.status === "Active" ? "success" : props.row()?.status === "Review" ? "warning" : "neutral"}>{props.row()?.status}</Badge></div>
    <Input label="Account note" value={note()} onInput={event => setNote(event.currentTarget.value)} />
    <Card><div class="loupe-admin-details-grid">
      <div><Text tone="muted">Owner</Text><strong>{props.row()?.owner}</strong></div>
      <div><Text tone="muted">Managed balance</Text><strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(props.row()?.balance ?? 0)}</strong></div>
      <div><Text tone="muted">Monthly requests</Text><strong>{new Intl.NumberFormat("en-US", { notation: "compact" }).format(props.row()?.requests ?? 0)}</strong></div>
      <div><Text tone="muted">Accepted revision</Text><strong>{props.row()?.revision}</strong></div>
    </div></Card>
    <Card><Stack gap="sm"><div class="loupe-admin-service-heading"><strong>Capacity</strong><span>{props.row()?.utilization}%</span></div><Meter label="Account capacity utilization" value={props.row()?.utilization ?? 0} min={0} max={100} low={45} high={82} optimum={55} /><Progress label="Quarterly review completion" value={72} max={100} /></Stack></Card>
    <section aria-labelledby="account-activity-heading"><h3 id="account-activity-heading">Account activity</h3><ActivityTimeline label="Account activity" items={activity()} density="compact" /></section>
  </Stack>;
}

interface AdminStarterPageProps {
  readonly view: AdminView;
  readonly rows: readonly AdminAccountRow[];
  readonly summary: AdminWorkloadSummary;
  readonly traffic: ChartData;
  readonly workload: AdminWorkload;
  readonly chartPoints: number;
  readonly pagination: TablePagination;
  readonly state: AdminFixtureState;
  readonly refreshing: boolean;
  readonly revision: number;
  readonly preset: AdminPreset;
  readonly appearance: AdminResolvedAppearance;
  readonly theme: string;
  readonly mode: string;
  readonly accent: string;
  readonly direction: string;
  readonly table: "paged" | "continuous";
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly inboxUnread: number;
  readonly placementOverrides: readonly AdminPlacementOverride[];
  readonly onConfigure: (key: string, value: string) => void;
  readonly onStateChange: (state: AdminFixtureState) => void;
  readonly onOpenDetails: (id: string) => void;
}

function AccountsTable(props: Pick<AdminStarterPageProps, "rows" | "pagination" | "onOpenDetails">) {
  return <DataTable data={props.rows} columns={columns} getRowId={row => row.id} caption="Northstar accounts" variant="integrated" density="compact" pagination={props.pagination}
    search={{ shortcut: "mod+f", exactMatch: true, placeholder: "Search accounts" }} filterBar columnControls export={{ filename: "northstar-accounts" }} initialViewportHeight={560}
    mobileLayout={{ pageSize: 12, titleColumn: "name" }} onRowActivate={row => props.onOpenDetails(row.id)} />;
}

function StarterConfiguration(props: Pick<AdminStarterPageProps, "preset" | "appearance" | "theme" | "mode" | "accent" | "direction" | "table" | "workload" | "placementOverrides" | "onConfigure">) {
  return <details class="loupe-admin-customize" aria-label="Starter configuration"><summary>Customize starter</summary><div class="loupe-admin-config-grid">
      <Select label="Workload" value={props.workload} options={[{ value: "representative", label: "Representative · 240 rows" }, { value: "heavy", label: "Heavy · 12,000 rows" }]} onValueChange={value => { if (value) props.onConfigure("workload", value); }} />
      <Select label="Theme" value={props.theme} options={themeOptions} onValueChange={value => { if (value) props.onConfigure("theme", value); }} />
      <Select label="Mode" value={props.mode} options={modeOptions} onValueChange={value => { if (value) props.onConfigure("mode", value); }} />
      <Select label="Accent" value={props.accent} options={accentOptions} onValueChange={value => { if (value) props.onConfigure("accent", value); }} />
      <Select label="Direction" value={props.direction} options={directionOptions} onValueChange={value => { if (value) props.onConfigure("direction", value); }} />
      <Select label="Layout" value={props.preset} options={[{ value: "standard", label: "Standard" }, { value: "workspace", label: "Workspace" }, { value: "horizontal", label: "Horizontal" }, { value: "inspector", label: "Inspector" }]} onValueChange={value => { if (value) props.onConfigure("preset", value); }} />
      <Select label="Chrome" value={props.appearance.chrome} options={[{ value: "layered", label: "Layered" }, { value: "unified", label: "Unified" }, { value: "tonal", label: "Tonal" }]} onValueChange={value => { if (value) props.onConfigure("chrome", value); }} />
      <Select label="Navigation" value={props.appearance.navigation} options={[{ value: "subtle", label: "Subtle" }, { value: "accent", label: "Accent" }, { value: "indicator", label: "Indicator" }]} onValueChange={value => { if (value) props.onConfigure("navigation", value); }} />
      <Select label="Chrome controls" value={props.appearance.actions} options={[{ value: "quiet", label: "Quiet" }, { value: "outlined", label: "Outlined" }, { value: "accent", label: "Accent" }]} onValueChange={value => { if (value) props.onConfigure("actions", value); }} />
      <For each={placementControls}>{control => <Select label={`${control.label} placement`} value={props.placementOverrides.find(override => override.zone === control.zone)?.target ?? "inherit"}
        options={placementOptions(control.zone)} onValueChange={value => { if (value) props.onConfigure(control.key, value); }} />}</For>
      <Select label="Table paging" value={props.table} options={[{ value: "paged", label: "Numbered" }, { value: "continuous", label: "Continuous" }]} onValueChange={value => { if (value) props.onConfigure("table", value); }} />
    </div></details>;
}

function OverviewContent(props: Pick<AdminStarterPageProps, "rows" | "summary" | "traffic" | "chartPoints" | "workload" | "pagination" | "refreshing" | "onOpenDetails">) {
  return <div class="loupe-admin-overview" data-admin-workload={props.workload} data-admin-row-count={props.rows.length} data-admin-chart-points={props.chartPoints}>
    <StatGroup class="loupe-admin-stat-group" label="Operational summary" stats={[
      { label: "Accounts", value: props.rows.length.toLocaleString("en-US"), trend: "up", trendLabel: "3.8% this quarter" },
      { label: "Active", value: props.summary.active.toLocaleString("en-US"), trend: "flat", trendLabel: "Within target" },
      { label: "Needs review", value: props.summary.review.toLocaleString("en-US"), trend: "down", trendLabel: "12 fewer today" },
      { label: "Managed balance", value: new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD" }).format(props.summary.balance), trend: "up", trendLabel: "6.1% this month" },
      { label: "Monthly requests", value: new Intl.NumberFormat("en-US", { notation: "compact" }).format(props.summary.requests), trend: "up", trendLabel: "9.4% over forecast" },
      { label: "Utilization", value: `${props.summary.utilization.toFixed(1)}%`, trend: "flat", trendLabel: "Capacity healthy" },
    ]} />
    <section class="loupe-admin-dashboard-grid" aria-label="Traffic and capacity">
      <div class="loupe-admin-chart-card loupe-admin-chart-card-wide">
        <TimeSeries label="Workspace traffic" summary={`${props.chartPoints.toLocaleString("en-US")} accepted one-minute samples across requests, events, and jobs.`} xLabel="UTC time" series={trafficSeries} data={props.traffic}
          x={{ type: "time", tz: "UTC" }} y={{ format: "number", zero: false }} height={280} loading={props.refreshing} table={{ pageSize: 12, viewLabel: "View traffic samples" }} />
      </div>
      <div class="loupe-admin-chart-card">
        <BarChart label="Regional capacity" summary="Every region retains at least fourteen percent reserved headroom." categoryLabel="Region" valueLabel="Capacity percent"
          series={regionSeries} data={regionCapacity} y={{ format: "number" }} height={280} layout="horizontal" arrangement="stacked" loading={props.refreshing} table={{ pageSize: 6, viewLabel: "View regional capacity" }} />
      </div>
    </section>
    <section class="loupe-admin-operations-grid" aria-label="Live operations">
      <div class="loupe-admin-content-card loupe-admin-service-panel"><header><div><h2>Service health</h2><Text tone="muted">Ten production dependencies with bounded history.</Text></div><Link href="/admin/status">Open status</Link></header>
        <ul><For each={services}>{service => <li data-service-id={service.id}><div><strong>{service.name}</strong><small>{service.region} · {service.latency} ms</small></div><Sparkline values={service.history} label={`${service.name} latency history`} color={service.status === "Operational" ? "chart-2" : service.status === "Degraded" ? "chart-4" : "chart-6"} /><div class="loupe-admin-service-meter"><Meter label={`${service.name} saturation`} value={service.saturation} min={0} max={100} low={55} high={82} optimum={45} /><span>{service.saturation}%</span></div><Badge tone={service.status === "Operational" ? "success" : "warning"}>{service.status}</Badge></li>}</For></ul>
      </div>
      <div class="loupe-admin-content-card loupe-admin-activity-panel"><header><div><h2>Deployment activity</h2><Text tone="muted">Stable owners remain mounted while revisions refresh.</Text></div><Link href="/admin/audit">Audit log</Link></header><ActivityTimeline label="Deployment activity" items={deploymentActivity} density="compact" refreshing={props.refreshing} /></div>
    </section>
    <section class="loupe-admin-overview-table" aria-labelledby="overview-accounts-heading">
      <header><div><h2 id="overview-accounts-heading">Accounts</h2><Text tone="muted">Search, filter, sort, select, export, resize, and open retained details.</Text></div><Link href="/admin/accounts">View all</Link></header>
      <AccountsTable rows={props.rows} pagination={props.pagination} onOpenDetails={props.onOpenDetails} />
    </section>
  </div>;
}

function InboxContent(props: { readonly unread: number }) {
  return <section class="loupe-admin-content-card" aria-labelledby="inbox-heading"><header><div><h2 id="inbox-heading">Recent messages</h2><Text tone="muted">Operational updates that need your attention.</Text></div><Badge tone={props.unread > 0 ? "accent" : "neutral"}>{props.unread > 0 ? `${props.unread} unread` : "Inbox reviewed"}</Badge></header>
    <ul class="loupe-admin-inbox"><For each={inboxItems}>{(item, index) => <li data-unread={index() < props.unread || undefined}><Button variant="ghost"><span><strong>{item.title}</strong><small>{item.description}</small></span><time>{item.time}</time></Button></li>}</For></ul>
  </section>;
}

function SettingsContent() {
  const [organization, setOrganization] = createSignal("Northstar");
  const [region, setRegion] = createSignal("us-east");
  const [retention, setRetention] = createSignal("90");
  return <div class="loupe-admin-settings">
    <section class="loupe-admin-content-card" aria-labelledby="workspace-settings-heading"><header><div><h2 id="workspace-settings-heading">Workspace</h2><Text tone="muted">Identity and operational defaults for this workspace.</Text></div></header>
      <div class="loupe-admin-form-grid"><Input label="Organization name" value={organization()} onInput={event => setOrganization(event.currentTarget.value)} /><Input label="Workspace slug" value="northstar-production" />
        <Select label="Primary region" value={region()} options={[{ value: "us-east", label: "US East" }, { value: "us-west", label: "US West" }, { value: "eu-central", label: "EU Central" }]} onValueChange={value => { if (value) setRegion(value); }} />
        <Select label="Audit retention" value={retention()} options={[{ value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "365", label: "One year" }]} onValueChange={value => { if (value) setRetention(value); }} /></div>
    </section>
    <section class="loupe-admin-content-card" aria-labelledby="notification-settings-heading"><header><div><h2 id="notification-settings-heading">Notifications</h2><Text tone="muted">Delivery settings remain app-owned and can be connected here.</Text></div><Button>Configure delivery</Button></header><div class="loupe-admin-setting-list">
      <ToggleSwitch label="Deployment notifications" defaultChecked description="Notify workspace members when a production revision is accepted." />
      <ToggleSwitch label="Account review digest" defaultChecked description="Send a daily summary of accounts that need owner action." />
      <ToggleSwitch label="Usage warnings" defaultChecked description="Notify at 70, 85, and 95 percent of a contracted limit." />
      <ToggleSwitch label="Weekly executive report" description="Send a weekly cross-region performance summary." />
    </div></section>
    <section class="loupe-admin-content-card" aria-labelledby="security-settings-heading"><header><div><h2 id="security-settings-heading">Security</h2><Text tone="muted">Authentication and authorization remain application-owned.</Text></div><Badge tone="success">All checks pass</Badge></header><div class="loupe-admin-setting-list">
      <ToggleSwitch label="Require hardware-backed authentication" defaultChecked description="Enforce passkeys or security keys for administrators." />
      <ToggleSwitch label="Require approval for exports" defaultChecked description="Route sensitive exports through a second operator." />
      <Button variant="outline">Review active sessions</Button>
    </div></section>
  </div>;
}

function AuditContent() {
  return <section class="loupe-admin-content-card" aria-labelledby="audit-heading"><header><div><h2 id="audit-heading">Recent activity</h2><Text tone="muted">Immutable administrative events for the accepted revision.</Text></div><Button variant="outline">Export log</Button></header>
    <ol class="loupe-admin-audit"><For each={auditItems}>{item => <li data-audit-id={item.id}><span class="loupe-admin-event-dot" data-tone={item.tone} /><div><strong>{item.title}</strong><small>{item.description}</small></div><time>{item.time}</time></li>}</For></ol>
  </section>;
}

function StatusContent() {
  return <div class="loupe-admin-status-grid" aria-label="Service health"><For each={services}>{service => <Card data-service-id={service.id}><div class="loupe-admin-service-heading"><div><strong>{service.name}</strong><Text tone="muted">{service.region}</Text></div><Badge tone={service.status === "Operational" ? "success" : "warning"}>{service.status}</Badge></div><Sparkline values={service.history} label={`${service.name} latency history`} color={service.status === "Operational" ? "chart-2" : "chart-4"} /><div class="loupe-admin-service-meter"><Meter label={`${service.name} saturation`} value={service.saturation} min={0} max={100} low={55} high={82} optimum={45} /><span>{service.saturation}%</span></div><Text tone="muted">{service.latency} ms median response</Text></Card>}</For></div>;
}

function AdminStarterPage(props: AdminStarterPageProps) {
  const services = useAdminServices();
  let previousRefreshing = props.refreshing;
  createEffect(on(() => props.refreshing, next => {
    if (previousRefreshing && !next) services.toasts.show({ title: `Revision ${props.revision} accepted`, description: "Existing controls and table rows stayed mounted.", tone: "success" });
    previousRefreshing = next;
  }));
  async function confirmReset(): Promise<void> {
    if (await services.confirm.confirm({ title: "Reset demo view?", description: "This demonstrates the scoped confirm service without owning arbitrary modal content.", confirmLabel: "Reset" })) {
      services.toasts.show({ title: "Demo view reset", tone: "neutral" });
    }
  }
  return <Switch>
    <Match when={props.state === "permission"}><EmptyState heading="Access revoked" description="Account, notifications, table data, and details were cleared immediately."><Button onClick={() => props.onStateChange("ready")}>Restore demo access</Button></EmptyState></Match>
    <Match when={props.state === "error"}><ErrorState kind="server" description="The account service did not return an accepted snapshot." onRetry={() => props.onStateChange("ready")} /></Match>
    <Match when={props.state === "loading"}><LoadingState label="Northstar accounts" phase="cold" fallback={<Skeleton shape="rectangle" style={{ height: "28rem", width: "100%" }} />} /></Match>
    <Match when={true}>
    <div class="loupe-admin-page" data-admin-starter-content data-admin-view={props.view} data-admin-workspace-id={props.workspaceId} data-admin-workload={props.workload} data-admin-row-count={props.rows.length} data-admin-chart-points={props.chartPoints}>
      <PageHeader title={adminViewLabel(props.view)} actions={<div class="loupe-admin-page-actions">
        {props.workload === "heavy" ? <Badge tone="warning">Heavy workload</Badge> : undefined}
        <StarterConfiguration preset={props.preset} appearance={props.appearance} theme={props.theme} mode={props.mode} accent={props.accent} direction={props.direction}
          table={props.table} workload={props.workload} placementOverrides={props.placementOverrides} onConfigure={props.onConfigure} />
        <Button onClick={() => { void confirmReset(); }}>Reset view</Button>
      </div>} />
      <Switch>
        <Match when={props.view === "overview"}><OverviewContent rows={props.rows} summary={props.summary} traffic={props.traffic} chartPoints={props.chartPoints} workload={props.workload} pagination={props.pagination} refreshing={props.refreshing} onOpenDetails={props.onOpenDetails} /></Match>
        <Match when={props.view === "accounts"}><AccountsTable rows={props.rows} pagination={props.pagination} onOpenDetails={props.onOpenDetails} /></Match>
        <Match when={props.view === "inbox"}><div class="loupe-admin-content"><InboxContent unread={props.inboxUnread} /></div></Match>
        <Match when={props.view === "settings"}><div class="loupe-admin-content"><SettingsContent /></div></Match>
        <Match when={props.view === "audit"}><div class="loupe-admin-content"><AuditContent /></div></Match>
        <Match when={props.view === "status"}><div class="loupe-admin-content"><StatusContent /></div></Match>
        <Match when={true}><div class="loupe-admin-content"><EmptyState heading="Page not found" description="Choose a destination from the application navigation." /></div></Match>
      </Switch>
    </div>
    </Match>
  </Switch>;
}
