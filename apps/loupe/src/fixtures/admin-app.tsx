import { ActivityTimeline, Badge, Button, Card, EmptyState, Input, Link, Meter, NumberText, Progress, SearchInput, Select, Skeleton, Stack, Switch as ToggleSwitch, Text, useTheme } from "@gemologic/sheen";
import type { ActivityTimelineItem, ThemeOverrides, ThemeState } from "@gemologic/sheen";
import type { ChartData } from "@gemologic/sheen-charts/core";
import { Sparkline, StatGroup } from "@gemologic/sheen-charts/svg";
import type { StatProps } from "@gemologic/sheen-charts/svg";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { accentNames, bundledThemeMetadata, isAccentName } from "@gemologic/sheen-tokens";
import type { AccentName } from "@gemologic/sheen-tokens";
import { AddIcon, CheckIcon, ExternalLinkIcon, HomeIcon, InboxIcon, InfoIcon, LockIcon, RefreshIcon, RemoveIcon, SettingsIcon, UserIcon, UsersIcon } from "@gemologic/sheen-icons";
import { AdminApp, adminPlacementTargets, resolveAdminAppearance, useAdminServices } from "@gemologic/sheen-patterns/admin";
import type { AdminAccountModel, AdminActionAppearance, AdminActionGroup, AdminAppearance, AdminChromeAppearance, AdminChromeTarget, AdminChromeZone, AdminDetailsModel, AdminNavigationAppearance, AdminNavigationModel, AdminNotificationModel, AdminPlacementOverride, AdminPreset, AdminResolvedAppearance, AdminWorkspaceModel } from "@gemologic/sheen-patterns/admin";
import { DataTablePage, ErrorState, LoadingState, PageHeader, SettingsLayout, StatusBar } from "@gemologic/sheen-patterns";
import type { RouterAdapter } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { TablePagination } from "@gemologic/sheen-table";
import { For, Match, Show, Switch, batch, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { capacityTargetUsed, createAdminWorkload, refreshAdminWorkload, regionCapacity, trafficSeries } from "./admin-app-data.ts";
import type { AdminAccountRow, AdminWorkload, AdminWorkloadSnapshot, AdminWorkloadSummary } from "./admin-app-data.ts";
import { AdminPolicies } from "./admin-policies.tsx";

const columns = defineColumns<AdminAccountRow>([
  { id: "name", header: "Account", accessor: row => row.name, search: true, filter: { type: "text" }, sort: "text", width: "fill", cellDependencies: ["id"], cell: (value, row) => <span class="loupe-admin-account-cell"><strong>{String(value)}</strong><small>{row.id}</small></span> },
  { id: "owner", header: "Owner", accessor: row => row.owner, search: true, filter: { type: "text" }, sort: "text", width: 180 },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Review", "Paused"], faceted: true }, sort: "text", width: 120, cellDependencies: [], cell: value => <Badge tone={value === "Active" ? "success" : value === "Review" ? "warning" : "neutral"}>{value === "Active" ? <CheckIcon /> : value === "Review" ? <InfoIcon /> : <RemoveIcon />}{String(value)}</Badge> },
  { id: "plan", header: "Plan", accessor: row => row.plan, search: true, filter: { type: "enum", options: ["Enterprise", "Growth", "Core"], faceted: true }, sort: "text", width: 120 },
  { id: "region", header: "Region", accessor: row => row.region, search: true, filter: { type: "enum", options: ["US East", "US West", "EU Central", "Asia Pacific"], faceted: true }, sort: "text", width: 130 },
  { id: "balance", header: "Balance (USD)", accessor: row => row.balance, filter: { type: "number" }, sort: "number", numeric: true, width: 140, cellDependencies: [], cell: value => <NumberText value={Number(value)} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} /> },
  { id: "requests", header: "Requests", accessor: row => row.requests, filter: { type: "number" }, sort: "number", numeric: true, width: 120, cellDependencies: [], cell: value => <NumberText value={Number(value)} format={{ maximumFractionDigits: 0 }} /> },
  { id: "utilization", header: "Utilization", accessor: row => row.utilization, filter: { type: "number" }, sort: "number", numeric: true, width: 140, cellDependencies: ["name"], cell: (value, row) => <span class="loupe-admin-utilization"><Meter label={`${row.name} utilization`} value={Number(value)} min={0} max={100} low={45} high={82} optimum={55} /><NumberText value={Number(value) / 100} format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }} /></span> },
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
type AdminView = "overview" | "accounts" | "inbox" | "settings" | "audit" | "status" | "policies" | "unknown";

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
  readonly day: string;
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
  description: [
    "Public API revision 1842 is serving traffic in six regions.",
    "Identity canary stayed below the 50 ms latency budget.",
    "Account indexes are rebuilding in EU Central.",
    "Export approvals now require a second operator.",
    "Webhook retries recovered after the worker rollout.",
    "Search canary completed its US East observation window.",
    "Billing migration reconciled all account balances.",
    "Notification policy failed validation; the previous policy remains active.",
    "Audit archive retention expanded to 90 days.",
    "Event pipeline canary processed the queued backlog.",
    "Account region indexes passed integrity checks.",
    "Workspace access rules were published to all regions.",
  ][index] ?? "Deployment updated",
  actor: ["Ada Lovelace", "Grace Hopper", "Margaret Hamilton", "Katherine Johnson"][index % 4] ?? "Operations",
  timestamp: new Date(Date.UTC(2026, 8, 9, 16, 30) - index * 1_800_000).toISOString(),
  timeLabel: index === 0 ? "Just now" : `${index * 30} min ago`,
  state: deploymentState(index),
})));

const inboxItems = Object.freeze(Array.from({ length: 36 }, (_, index) => Object.freeze({
  id: `message-${index + 1}`,
  title: ["Owner review requested", "Production deploy completed", "Policy sync finished", "Usage threshold reached", "Export ready", "Webhook delivery recovered"][index % 6] ?? "Operations update",
  description: `${1 + (index % 12)} resources in ${["US East", "US West", "EU Central", "Asia Pacific"][index % 4] ?? "the workspace"} were updated.`,
  time: index < 2 ? `${18 + index * 7} min` : index < 24 ? `${index + 1} hr` : `${Math.floor(index / 12)} days`,
})));

const ownersForAudit = Object.freeze(["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"]);

const auditItems: readonly AuditItem[] = Object.freeze(Array.from({ length: 80 }, (_, index): AuditItem => Object.freeze({
  id: `audit-${index + 1}`,
  title: ["Deployment completed", "Account policy updated", "Workspace exported", "Access review approved", "Key rotated", "Saved view shared"][index % 6] ?? "Workspace changed",
  description: `${ownersForAudit[index % ownersForAudit.length] ?? "Operations"} changed ${1 + (index % 9)} resources in revision ${1842 - index}.`,
  time: index < 2 ? `${4 + index * 13} min ago` : index < 24 ? `${index} hr ago` : `${Math.floor(index / 24)} days ago`,
  day: index < 24 ? "Today" : index < 48 ? "Yesterday" : `${Math.floor(index / 24)} days ago`,
  tone: index % 11 === 0 ? "warning" : index % 3 === 0 ? "accent" : "success",
})));

function adminView(value: string | undefined): AdminView {
  if (value === undefined) return "overview";
  if (value === "accounts" || value === "inbox" || value === "settings" || value === "audit" || value === "status" || value === "policies") return value;
  return "unknown";
}

function adminViewLabel(view: AdminView): string {
  if (view === "overview") return "Overview";
  if (view === "accounts") return "Accounts";
  if (view === "inbox") return "Inbox";
  if (view === "settings") return "Settings";
  if (view === "audit") return "Audit log";
  if (view === "status") return "Service status";
  if (view === "policies") return "Access policies";
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
  const baseRouter = useSolidRouterAdapter();
  const appearanceKeys = ["theme", "mode", "accent", "direction", "preset", "chrome", "navigation", "actions", "sidebar", "configure", ...placementControls.map(control => control.key)];
  const router: RouterAdapter = {
    location: baseRouter.location,
    navigate: baseRouter.navigate,
    block: listener => baseRouter.block(attempt => {
      if (typeof attempt.to === "string") {
        const current = baseRouter.location();
        const from = new URL(`${current.pathname}${current.search}`, "https://sheen.invalid");
        const to = new URL(attempt.to, from);
        for (const key of appearanceKeys) { from.searchParams.delete(key); to.searchParams.delete(key); }
        from.searchParams.sort();
        to.searchParams.sort();
        to.hash = "";
        if (from.href === to.href) return;
      }
      listener(attempt);
    }),
  };
  const parameters = createMemo(() => new URLSearchParams(router.location().search));
  const shellLocation = createMemo(() => {
    const location = baseRouter.location();
    const search = new URLSearchParams(location.search);
    for (const key of appearanceKeys) search.delete(key);
    search.sort();
    const query = search.toString();
    return { ...location, search: query ? `?${query}` : "" };
  }, undefined, { equals: (previous, next) => previous.entryKey === next.entryKey && previous.pathname === next.pathname && previous.search === next.search && previous.hash === next.hash });
  const shellRouter: RouterAdapter = { ...router, location: shellLocation };
  const preset = createMemo(() => presetValue(parameters().get("preset")));
  const placements = createMemo(() => placementOverrides(parameters()), undefined, {
    equals: (previous, next) => previous.length === next.length && previous.every((placement, index) => placement.zone === next[index]?.zone && placement.target === next[index]?.target),
  });
  const appearance = createMemo((): AdminAppearance => ({
    chrome: chromeAppearance(parameters().get("chrome")),
    navigation: navigationAppearance(parameters().get("navigation")),
    actions: actionAppearance(parameters().get("actions")),
  }), undefined, { equals: (previous, next) => previous.chrome === next.chrome && previous.navigation === next.navigation && previous.actions === next.actions });
  const resolvedAppearance = createMemo(() => resolveAdminAppearance(appearance()));
  const scopedTheme = createMemo((): ThemeOverrides => {
    const theme = themeId(parameters().get("theme") ?? "studio");
    const mode = themeMode(parameters().get("mode") ?? "dark");
    const accent = accentName(parameters().get("accent") ?? "indigo");
    const direction = themeDirection(parameters().get("direction"));
    return {
      ...(theme === undefined ? {} : { theme }),
      ...(mode === undefined ? {} : { mode }),
      ...(accent === undefined ? {} : { accent }),
      ...(direction === undefined ? {} : { direction }),
    };
  }, undefined, { equals: (previous, next) => previous.theme === next.theme && previous.mode === next.mode && previous.accent === next.accent && previous.direction === next.direction });
  const configurationHref = (key: string, value: string): string => {
    const next = new URLSearchParams(parameters());
    if (value === "inherit" && key !== "theme" && key !== "mode" && key !== "accent") next.delete(key);
    else next.set(key, value);
    return `?${next.toString()}`;
  };
  const configure = (key: string, value: string): void => router.navigate(configurationHref(key, value), appearanceKeys.includes(key) ? { replace: true, scroll: false } : undefined);
  const resetAppearance = (): void => {
    const next = new URLSearchParams(parameters());
    for (const key of ["theme", "mode", "accent", "direction", "preset", "chrome", "navigation", "actions", ...placementControls.map(control => control.key)]) next.delete(key);
    router.navigate(`?${next.toString()}`, { replace: true, scroll: false });
  };
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
  const [refreshError, setRefreshError] = createSignal<string | null>(null);
  const [revision, setRevision] = createSignal(1);
  const [workspaceId, setWorkspaceId] = createSignal("production");
  const [inboxUnread, setInboxUnread] = createSignal(8);
  const [selectedId, setSelectedId] = createSignal<string>();
  const [detailsOpen, setDetailsOpen] = createSignal(false);
  const [state, setState] = createSignal<AdminFixtureState>(fixtureState(parameters().get("state")));
  const authorized = () => state() !== "permission";
  const longContent = createMemo(() => parameters().get("content") === "long");
  const displayedRows = createMemo(() => longContent() ? snapshot().rows.map((row, index) => index === 0 ? { ...row, name: "Northstar International Research and Reliability Operations, Enterprise Production Account" } : row) : snapshot().rows);
  const [applicationSearch, setApplicationSearch] = createSignal("");
  const overviewIcon = <HomeIcon decorative />;
  const accountsIcon = <UsersIcon decorative />;
  const inboxIcon = <InboxIcon decorative />;
  const settingsIcon = <SettingsIcon decorative />;
  const policiesIcon = <LockIcon decorative />;
  const auditIcon = <InboxIcon decorative />;
  const serviceStatusIcon = <SettingsIcon decorative />;
  const accountsBadge = <Badge>{(state() === "empty" ? 0 : rowCount()).toLocaleString("en-US")}</Badge>;
  const inboxBadge = <Badge tone="accent">{inboxUnread()}</Badge>;
  const productMark = <span>N</span>;
  const navigation = createMemo<AdminNavigationModel>(() => ({ id: "primary", label: "Primary navigation", items: [
    { kind: "link", id: "overview", label: "Overview", get href() { return routeHref("/admin"); }, icon: overviewIcon, actions: { label: "Overview actions", items: [
      { kind: "action", id: "refresh-overview", label: "Refresh dashboard", get disabled() { return refreshing(); }, onSelect: () => { void refresh(); } },
    ] } },
    { kind: "link", id: "accounts", label: longContent() ? "Accounts requiring unusually detailed operational review" : "Accounts", get href() { return routeHref("/admin/accounts"); }, match: "prefix", icon: accountsIcon, badge: accountsBadge, actions: { label: "Accounts actions", items: [
      { kind: "action", id: "preview-account", label: "Preview first account", onSelect: () => openDetails(snapshot().rows[0]?.id ?? "") },
    ] } },
    { kind: "link", id: "inbox", label: "Inbox", get href() { return routeHref("/admin/inbox"); }, match: "prefix", icon: inboxIcon, badge: inboxUnread() > 0 ? inboxBadge : undefined, actions: { label: "Inbox actions", items: [
      { kind: "action", id: "mark-inbox-read", label: "Mark inbox read", disabled: inboxUnread() === 0, onSelect: () => setInboxUnread(0) },
    ] } },
    { kind: "group", id: "configuration", label: "Configuration", items: [
      { kind: "link", id: "policies", label: "Access policies", get href() { return routeHref("/admin/policies"); }, match: "prefix", icon: policiesIcon },
      { kind: "link", id: "settings", label: "Settings", get href() { return routeHref("/admin/settings"); }, match: "prefix", icon: settingsIcon },
    ] },
  ] }));
  const secondaryNavigation = createMemo<AdminNavigationModel>(() => ({ id: "secondary", label: "Secondary navigation", items: [
    { kind: "link", id: "audit", label: "Audit log", get href() { return routeHref("/admin/audit"); }, match: "prefix", icon: auditIcon },
    { kind: "link", id: "service-status", label: "Service status", get href() { return routeHref("/admin/status"); }, match: "prefix", icon: serviceStatusIcon },
  ] }));
  const product = createMemo(() => ({ name: longContent() ? "Northstar International Operations and Reliability" : "Northstar", get href() { return routeHref("/admin"); }, mark: productMark }));
  let refreshRequest: AbortController | undefined;
  let refreshToken = 0;
  let refreshAttempts = 0;
  const cancelRefresh = (): void => {
    refreshRequest?.abort();
    refreshRequest = undefined;
    refreshToken++;
    setRefreshing(false);
    setRefreshError(null);
  };
  const pathname = createMemo(() => props.view ? `/admin/${props.view}` : "/admin");
  const selected = createMemo(() => displayedRows().find(row => row.id === selectedId()));
  const openDetails = (id: string): void => batch(() => { setSelectedId(id); setDetailsOpen(true); });
  const revokeAccess = (): void => batch(() => { cancelRefresh(); setDetailsOpen(false); setSelectedId(undefined); setState("permission"); });
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
      cancelRefresh();
      setSnapshot(createAdminWorkload(next));
      setRevision(1);
      setDetailsOpen(false);
      setSelectedId(undefined);
    });
  }, { defer: true }));
  const selectWorkspace = (id: string): void => {
    if (id === workspaceId()) return;
    batch(() => {
      cancelRefresh();
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
    { kind: "action", id: "review", title: "Account review", description: `${state() === "empty" ? 0 : snapshot().summary.review} accounts need review.`, timeLabel: "18 minutes ago", onSelect: () => router.navigate("/admin/accounts") },
    { kind: "link", id: "policy", title: "Policy synchronized", description: "No permission changes detected.", timeLabel: "Yesterday", read: true, href: "/admin/settings" },
  ] } : undefined);
  async function refresh(): Promise<void> {
    if (!authorized()) return;
    refreshRequest?.abort();
    const controller = new AbortController();
    refreshRequest = controller;
    const token = ++refreshToken;
    let accepted = false;
    setRefreshError(null);
    setRefreshing(true);
    try {
      const fail = parameters().get("refresh") === "fail-first" && ++refreshAttempts === 1;
      const response = await fetch(`/api/admin-controls?delay=650&revision=${revision() + 1}&fail=${fail}`, { signal: controller.signal });
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
    } catch (error) {
      if (token === refreshToken && !controller.signal.aborted) setRefreshError(error instanceof Error ? error.message : "Workspace refresh failed.");
    } finally {
      if (token === refreshToken) {
        refreshRequest = undefined;
        if (!accepted) setRefreshing(false);
      }
    }
  }
  const actions = createMemo<readonly AdminActionGroup[]>(() => {
    if (!authorized()) return [];
    return [{ id: "create", label: "Create", role: "primary", items: props.view === "policies" || props.view === "settings" ? [] : [
      { kind: "link", id: "create-policy", label: "Create policy", icon: <AddIcon decorative />, get href() { return routeHref("/admin/policies") + "#create-policy"; } },
    ] }, { id: "operations", label: "Operations", role: "utility", items: [
      { kind: "action", id: "refresh", label: "Refresh", icon: <RefreshIcon decorative />, get disabled() { return refreshing(); }, onSelect: () => { void refresh(); } },
    ] }, { id: "help", label: "More", role: "help", presentation: "overflow", items: [
      { kind: "link", id: "component-docs", label: "Docs", icon: () => <ExternalLinkIcon decorative />, href: "/components" },
      { kind: "link", id: "preferences", label: "Workspace settings", icon: () => <SettingsIcon decorative />, href: "/admin/settings" },
      { kind: "link", id: "style-lab", label: "Design lab", href: "/lab" },
    ] }];
  });
  onCleanup(() => refreshRequest?.abort());
  return <AdminApp label="Northstar operations" documentTitle="Admin starter · Sheen" preset={preset()} placements={placements()} appearance={appearance()} theme={scopedTheme()}
    pathname={pathname()} router={shellRouter} product={product()} workspace={workspace()} contentReady={state() !== "loading"}
    defaultSidebarCollapsed={parameters().get("sidebar") === "collapsed"}
    onSidebarCollapsedChange={setSidebarCollapsed}
    primaryNavigation={navigation()} secondaryNavigation={secondaryNavigation()}
    currentView={parameters().has("place-current-view") ? <strong>{adminViewLabel(view())}</strong> : undefined}
    globalSearch={<SearchInput label="Search application" placeholder={`Search ${workspaceName().toLocaleLowerCase("en-US")}`} value={applicationSearch()} onValueChange={setApplicationSearch} />}
    actionGroups={actions()} notifications={notifications()} account={account()} commandPalette={authorized() ? { sources: [{ kind: "static", id: "admin", commands: [
      { id: "accounts", label: "Open accounts", group: "Navigation", run: () => router.navigate("/admin/accounts") },
      { id: "refresh", label: "Refresh workspace", group: "Operations", run: refresh },
    ] }] } : undefined} details={details()} refreshing={refreshing()} authorizationKey={authorized() ? "operator" : "revoked"}
    statusBar={<StatusBar connection={authorized() ? "connected" : "disconnected"} tasks={refreshing() ? 1 : 0} counts={[{ label: "Accounts", value: authorized() && state() !== "empty" ? rowCount() : 0 }, { label: "Needs review", value: authorized() && state() !== "empty" ? snapshot().summary.review : 0 }]}><span>{workspaceName()} workspace</span><Show when={parameters().get("configure") === "1"}><span>Revision {revision()} · {chartPoints()} chart samples</span></Show></StatusBar>}>
    <AdminStarterPage configure={parameters().get("configure") === "1"} view={view()} rows={state() === "empty" ? [] : displayedRows()} summary={state() === "empty" ? emptyWorkloadSummary : snapshot().summary} traffic={snapshot().traffic} workload={workload()} chartPoints={chartPoints()}
      pagination={pagination()} state={state()} refreshing={refreshing()} revision={revision()} preset={preset()}
      appearance={resolvedAppearance()} theme={parameters().get("theme") ?? "studio"} mode={parameters().get("mode") ?? "dark"}
      accent={parameters().get("accent") ?? "indigo"} direction={parameters().get("direction") ?? "inherit"} table={parameters().get("table") === "continuous" ? "continuous" : "paged"}
      workspaceId={workspaceId()} workspaceName={workspaceName()} inboxUnread={inboxUnread()} placementOverrides={placements()} onConfigure={configure} onResetAppearance={resetAppearance} refreshError={refreshError()} onRefresh={refresh} onStateChange={setState} onOpenDetails={openDetails} />
  </AdminApp>;
}

function AccountDetails(props: { readonly row: () => AdminAccountRow | undefined }) {
  const [note, setNote] = createSignal(`Review ${props.row()?.name ?? "account"}`);
  const activity = createMemo(() => {
    const row = props.row();
    if (!row) return [];
    return [
      { id: `${row.id}-updated`, title: "Account usage updated", description: `Billing and usage updated ${row.updated}.`, actor: row.owner, state: "completed" as const },
      { id: `${row.id}-review`, title: "Automated review running", description: "Usage, billing, and access controls are being checked.", state: "current" as const },
      { id: `${row.id}-renewal`, title: "Quarterly review", description: "Owner approval is required before the next renewal.", state: "upcoming" as const },
    ];
  });
  return <Stack gap="lg">
    <div class="loupe-admin-details-summary"><div><Text tone="muted">{props.row()?.id}</Text><strong>{props.row()?.plan} · {props.row()?.region}</strong></div><Badge tone={props.row()?.status === "Active" ? "success" : props.row()?.status === "Review" ? "warning" : "neutral"}>{props.row()?.status}</Badge></div>
    <Input label="Account note" value={note()} onInput={event => setNote(event.currentTarget.value)} />
    <Card><div class="loupe-admin-details-grid">
      <div><Text tone="muted">Owner</Text><strong>{props.row()?.owner}</strong></div>
      <div><Text tone="muted">Managed balance (USD)</Text><strong><NumberText value={props.row()?.balance ?? 0} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} /></strong></div>
      <div><Text tone="muted">Monthly requests</Text><strong><NumberText value={props.row()?.requests ?? 0} format={{ maximumFractionDigits: 0 }} /></strong></div>
      <div><Text tone="muted">Last updated</Text><strong>{props.row()?.updated}</strong></div>
    </div></Card>
    <Card><Stack gap="sm"><div class="loupe-admin-service-heading"><strong>Capacity</strong><NumberText value={(props.row()?.utilization ?? 0) / 100} format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }} /></div><Meter label="Account capacity utilization" value={props.row()?.utilization ?? 0} min={0} max={100} low={45} high={82} optimum={55} /><Progress label="Quarterly review completion" value={72} max={100} /></Stack></Card>
    <section aria-labelledby="account-activity-heading"><h3 id="account-activity-heading">Account activity</h3><ActivityTimeline label="Account activity" items={activity()} density="compact" /></section>
  </Stack>;
}

interface AdminStarterPageProps {
  readonly configure: boolean;
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
  readonly onResetAppearance: () => void;
  readonly refreshError: string | null;
  readonly onRefresh: () => Promise<void>;
  readonly onStateChange: (state: AdminFixtureState) => void;
  readonly onOpenDetails: (id: string) => void;
}

function AccountsTable(props: Pick<AdminStarterPageProps, "rows" | "pagination" | "onOpenDetails">) {
  return <DataTable data={props.rows} columns={columns} getRowId={row => row.id} caption="Northstar accounts" variant="integrated" density="compact" pagination={props.pagination}
    class="loupe-admin-accounts" estimatedRowHeight={48} rowHeight="var(--sheen-admin-account-row-height)" search={{ shortcut: "mod+f", exactMatch: true, placeholder: "Search accounts" }} filterBar columnControls summarizeColumns={["status", "plan", "region"]} export={{ filename: "northstar-accounts" }} initialViewportHeight={560}
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
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const trafficFormatter = createMemo(() => new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }));
  const trafficRange = createMemo(() => {
    const start = props.traffic.t[0];
    const end = props.traffic.t.at(-1);
    if (start === undefined || end === undefined) return "No traffic samples";
    return `${trafficFormatter().formatRange(start, end)} UTC`;
  });
  const utilizationVisual = <Meter label="Mean account utilization" value={props.summary.utilization} min={0} max={100} />;
  const stats: readonly StatProps[] = [
    { label: "Accounts", get value() { return props.rows.length; }, format: { maximumFractionDigits: 0 } },
    { label: "Active", get value() { return props.summary.active; }, format: { maximumFractionDigits: 0 } },
    { label: "Needs review", get value() { return props.summary.review; }, format: { maximumFractionDigits: 0 } },
    { label: "Managed balance (USD)", get value() { return props.summary.balance; }, format: { notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 1 } },
    { label: "Monthly requests", get value() { return props.summary.requests; }, format: { notation: "compact", maximumFractionDigits: 1 } },
    { label: "Mean utilization", get value() { return props.summary.utilization / 100; }, format: { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }, visual: utilizationVisual },
  ];
  return <div class="loupe-admin-overview" data-admin-workload={props.workload} data-admin-row-count={props.rows.length} data-admin-chart-points={props.chartPoints}>
    <Text class="loupe-admin-overview-context" tone="muted">Current account snapshot · Traffic: {trafficRange()}</Text>
    <StatGroup class="loupe-admin-stat-group" label="Operational summary" stats={stats} />
    <section class="loupe-admin-dashboard-grid" aria-label="Traffic and service health">
      <div class="loupe-admin-chart-card loupe-admin-chart-card-wide">
        <TimeSeries label="Workspace traffic" summary="Requests, events, and background jobs per minute." xLabel="UTC time" series={trafficSeries} data={props.traffic}
          x={{ type: "time", tz: "UTC" }} y={{ format: { maximumFractionDigits: 0 }, zero: false }} height={360} loading={props.refreshing} table={{ pageSize: 12, viewLabel: "View traffic samples" }} />
      </div>
      <div class="loupe-admin-content-card loupe-admin-service-panel"><header><div><h2>Service health</h2><Text tone="muted">{services.filter(service => service.status === "Operational").length} healthy · {services.filter(service => service.status !== "Operational").length} need attention<br />Median response latency</Text></div><Link href="/admin/status">Open status</Link></header>
        <ul><For each={services}>{service => <li data-service-id={service.id}><div><strong>{service.name}</strong><small>{service.region}</small></div><NumberText value={service.latency} format={{ style: "unit", unit: "millisecond", maximumFractionDigits: 0 }} /><Badge tone={service.status === "Operational" ? "success" : "warning"}><span aria-hidden="true">{service.status === "Operational" ? "✓" : "!"}</span> {service.status}</Badge></li>}</For></ul>
      </div>
    </section>
    <section class="loupe-admin-operations-grid" aria-label="Live operations">
      <section class="loupe-admin-content-card loupe-admin-capacity" aria-labelledby="capacity-heading">
        <header><div><h2 id="capacity-heading">Regional capacity</h2><Text tone="muted">Keep at least <NumberText value={(100 - capacityTargetUsed) / 100} format={{ style: "percent" }} /> available capacity</Text></div></header>
        <ul><For each={regionCapacity}>{region => <li>
          <strong>{region.name}</strong><span><NumberText value={region.used / 100} format={{ style: "percent" }} /> used · <NumberText value={(100 - region.used) / 100} format={{ style: "percent" }} /> available</span>
          <div class="loupe-admin-capacity-track" style={{ "--capacity-target": `${capacityTargetUsed}%` }}><Meter label={`${region.name} used capacity; maximum target ${capacityTargetUsed} percent`} value={region.used} min={0} max={100} low={0} high={capacityTargetUsed} optimum={0} /><span class="loupe-admin-capacity-threshold" aria-hidden="true" /></div>
        </li>}</For></ul>
      </section>
      <div class="loupe-admin-content-card loupe-admin-activity-panel"><header><div><h2>Deployment activity</h2><Text tone="muted">Latest outcomes across regions</Text></div><Link href="/admin/audit">Audit log</Link></header><ActivityTimeline label="Deployment activity" items={deploymentActivity} density="compact" refreshing={props.refreshing} /></div>
    </section>
    <section class="loupe-admin-overview-table" aria-labelledby="overview-accounts-heading">
      <header><h2 id="overview-accounts-heading">Accounts</h2><Link href="/admin/accounts">View all</Link></header>
      <AccountsTable rows={props.rows} pagination={props.pagination} onOpenDetails={props.onOpenDetails} />
    </section>
  </div>;
}

function InboxContent(props: { readonly unread: number }) {
  return <section class="loupe-admin-content-card" aria-labelledby="inbox-heading"><header><div><h2 id="inbox-heading">Recent messages</h2><Text tone="muted">Operational updates that need your attention.</Text></div><Badge tone={props.unread > 0 ? "accent" : "neutral"}>{props.unread > 0 ? `${props.unread} unread` : "Inbox reviewed"}</Badge></header>
    <ul class="loupe-admin-inbox"><For each={inboxItems}>{(item, index) => <li data-unread={index() < props.unread || undefined}><details><summary><strong>{item.title}</strong><time>{item.time}</time></summary><p>{item.description}</p></details></li>}</For></ul>
  </section>;
}

function SettingsContent() {
  const services = useAdminServices();
  const initial = { organization: "Northstar", region: "us-east", retention: "90", deployments: true, reviews: true, usage: true, reports: false, hardware: true, exports: true };
  const [draft, setDraft] = createSignal(initial);
  const [saved, setSaved] = createSignal(initial);
  const [error, setError] = createSignal<string | null>(null);
  const sections = [
    { id: "workspace", label: "Workspace", description: "Changes are saved for this demo page session.", content:
      <div class="loupe-admin-form-grid"><Input label="Organization name" value={draft().organization} onInput={event => setDraft(previous => ({ ...previous, organization: event.currentTarget.value }))} {...(error() ? { error: error() ?? "" } : {})} /><Input label="Workspace slug" value="northstar-production" readonly />
        <Select label="Primary region" value={draft().region} options={[{ value: "us-east", label: "US East" }, { value: "us-west", label: "US West" }, { value: "eu-central", label: "EU Central" }]} onValueChange={value => { if (value) setDraft(previous => ({ ...previous, region: value })); }} />
        <Select label="Audit retention" value={draft().retention} options={[{ value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "365", label: "One year" }]} onValueChange={value => { if (value) setDraft(previous => ({ ...previous, retention: value })); }} /></div> },
    { id: "notifications", label: "Notifications", description: "Choose which updates this workspace receives.", content: <div class="loupe-admin-setting-list">
      <ToggleSwitch label="Deployment notifications" checked={draft().deployments} onCheckedChange={deployments => setDraft(previous => ({ ...previous, deployments }))} description="Production rollout outcomes." />
      <ToggleSwitch label="Account review digest" checked={draft().reviews} onCheckedChange={reviews => setDraft(previous => ({ ...previous, reviews }))} description="Daily accounts needing owner action." />
      <ToggleSwitch label="Usage warnings" checked={draft().usage} onCheckedChange={usage => setDraft(previous => ({ ...previous, usage }))} description="Warnings at 70, 85, and 95 percent of a contracted limit." />
      <ToggleSwitch label="Weekly executive report" checked={draft().reports} onCheckedChange={reports => setDraft(previous => ({ ...previous, reports }))} description="Weekly performance summary." />
    </div> },
    { id: "security", label: "Security", description: "Example policy preferences. This demo does not change authentication or enforce access.", content: <div class="loupe-admin-setting-list">
      <ToggleSwitch label="Require hardware-backed authentication" checked={draft().hardware} onCheckedChange={hardware => setDraft(previous => ({ ...previous, hardware }))} description="Require passkeys or security keys for administrators." />
      <ToggleSwitch label="Require approval for exports" checked={draft().exports} onCheckedChange={exports => setDraft(previous => ({ ...previous, exports }))} description="Require approval from a second operator." />
      <Link href="/admin/policies">Manage access policies</Link>
    </div> },
  ];
  return <SettingsLayout label="Workspace settings" sections={sections} dirty={JSON.stringify(draft()) !== JSON.stringify(saved())} saveError={error()} onDiscard={() => { setDraft(saved()); setError(null); }} onSave={() => {
    if (!draft().organization.trim()) { setError("Enter an organization name."); throw new Error("Organization name required"); }
    setSaved({ ...draft(), organization: draft().organization.trim() });
    setDraft(saved());
    setError(null);
    services.toasts.show({ title: "Settings saved", description: "Saved for this demo page session.", tone: "success" });
  }} />;
}

function AuditContent() {
  const days = [...new Set(auditItems.map(item => item.day))];
  const exportHref = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(auditItems, null, 2))}`;
  return <section class="loupe-admin-content-card" aria-labelledby="audit-heading"><header><div><h2 id="audit-heading">Recent activity</h2><Text tone="muted">80 recorded events, grouped by day.</Text></div><Link variant="button" download="northstar-audit.json" href={exportHref}>Export log</Link></header>
    <For each={days}>{(day, index) => <section class="loupe-admin-audit-day" aria-labelledby={`audit-day-${index()}`}><h3 id={`audit-day-${index()}`}>{day}</h3><ol class="loupe-admin-audit"><For each={auditItems.filter(item => item.day === day)}>{item => <li data-audit-id={item.id}><span class="loupe-admin-event-dot" data-tone={item.tone} aria-hidden="true" /><div><strong>{item.title}</strong><small>{item.description}</small></div><time>{item.time}</time></li>}</For></ol></section>}</For>
  </section>;
}

function StatusContent() {
  return <div class="loupe-admin-status-grid" aria-label="Service health"><For each={services}>{service => <Card data-service-id={service.id}><div class="loupe-admin-service-heading"><div><strong>{service.name}</strong><Text tone="muted">{service.region}</Text></div><Badge tone={service.status === "Operational" ? "success" : "warning"}>{service.status}</Badge></div><Sparkline values={service.history} label={`${service.name} latency history`} color={service.status === "Operational" ? "chart-2" : "chart-4"} /><div class="loupe-admin-service-meter"><Meter label={`${service.name} saturation`} value={service.saturation} min={0} max={100} low={55} high={82} optimum={45} /><span>{service.saturation}%</span></div><Text tone="muted">{service.latency} ms median response</Text></Card>}</For></div>;
}

function AdminStarterPage(props: AdminStarterPageProps) {
  const services = useAdminServices();
  let previousRevision = props.revision;
  createEffect(on(() => props.revision, next => {
    if (next > previousRevision && props.state !== "permission") services.toasts.show({ title: "Workspace refreshed", description: "Workspace data is up to date.", tone: "success" });
    previousRevision = next;
  }));
  async function confirmReset(): Promise<void> {
    if (await services.confirm.confirm({ title: "Reset starter appearance?", description: "Restore dark Studio, indigo, and the standard layout. Page data and drafts are kept.", confirmLabel: "Reset" })) {
      props.onResetAppearance();
      services.toasts.show({ title: "Starter appearance reset", tone: "neutral" });
    }
  }
  const pageActions = () => <div class="loupe-admin-page-actions">
    {props.workload === "heavy" ? <Badge tone="warning">Heavy workload</Badge> : undefined}
    <Show when={props.configure}><StarterConfiguration preset={props.preset} appearance={props.appearance} theme={props.theme} mode={props.mode} accent={props.accent} direction={props.direction}
      table={props.table} workload={props.workload} placementOverrides={props.placementOverrides} onConfigure={props.onConfigure} />
      <Button variant="ghost" onClick={() => { void confirmReset(); }}>Reset appearance</Button>
    </Show>
  </div>;
  return <Switch>
    <Match when={props.state === "permission"}><EmptyState heading="Access revoked" description="You no longer have access to this workspace."><Button onClick={() => props.onStateChange("ready")}>Restore demo access</Button></EmptyState></Match>
    <Match when={props.state === "error"}><ErrorState kind="server" description="Accounts could not be loaded. Try again." onRetry={() => props.onStateChange("ready")} /></Match>
    <Match when={props.state === "loading"}><LoadingState label="Northstar accounts" phase="cold" fallback={<Skeleton shape="rectangle" style={{ height: "28rem", width: "100%" }} />} /></Match>
    <Match when={true}>
    <div class="loupe-admin-page" data-admin-starter-content data-admin-view={props.view} data-admin-workspace-id={props.workspaceId} data-admin-workload={props.workload} data-admin-row-count={props.rows.length} data-admin-chart-points={props.chartPoints}>
      <Show when={props.view !== "accounts"}><PageHeader title={adminViewLabel(props.view)} actions={pageActions()} /></Show>
      <Show when={props.refreshError}><div class="loupe-admin-refresh-error" role="alert"><Text>Could not refresh workspace data. Your current data and drafts are kept.</Text><Button variant="outline" onClick={() => { void props.onRefresh(); }}>Retry refresh</Button></div></Show>
      <Switch>
        <Match when={props.view === "overview"}><OverviewContent rows={props.rows} summary={props.summary} traffic={props.traffic} chartPoints={props.chartPoints} workload={props.workload} pagination={props.pagination} refreshing={props.refreshing} onOpenDetails={props.onOpenDetails} /></Match>
        <Match when={props.view === "accounts"}><DataTablePage title="Accounts" toolbarLabel="Account actions" headerActions={pageActions()}
          loadingPhase={props.refreshing ? "refresh" : "idle"} loadingFallback={<Skeleton shape="rectangle" style={{ height: "100%" }} />}>
          <AccountsTable rows={props.rows} pagination={props.pagination} onOpenDetails={props.onOpenDetails} />
        </DataTablePage></Match>
        <Match when={props.view === "inbox"}><div class="loupe-admin-content"><InboxContent unread={props.inboxUnread} /></div></Match>
        <Match when={props.view === "settings"}><div class="loupe-admin-content"><SettingsContent /></div></Match>
        <Match when={props.view === "policies"}><div class="loupe-admin-content"><AdminPolicies /></div></Match>
        <Match when={props.view === "audit"}><div class="loupe-admin-content"><AuditContent /></div></Match>
        <Match when={props.view === "status"}><div class="loupe-admin-content"><StatusContent /></div></Match>
        <Match when={true}><div class="loupe-admin-content"><EmptyState heading="Page not found" description="Choose a destination from the application navigation." /></div></Match>
      </Switch>
    </div>
    </Match>
  </Switch>;
}
