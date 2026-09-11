import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartData, ChartSeries } from "@gemologic/sheen-charts/core";
import type { ActivityTimelineItem } from "@gemologic/sheen";
import type { ComposerDocument, ComposerRegion, ComposerComponentNode, ComposerPlacementNode } from "./model.ts";
import { composerRegionIds, composerSchemaVersion } from "./model.ts";
import { adminChromeZones, resolveAdminPlacements } from "@gemologic/sheen-patterns/admin-config";

export interface ComposerUserFixture {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

export interface ComposerRecordFixture {
  readonly id: string;
  readonly account: string;
  readonly owner: string;
  readonly status: "Active" | "Review" | "Paused";
  readonly amount: number;
}

export interface ComposerApplicationStateFixture {
  readonly kind: "ready" | "empty" | "loading" | "error" | "permission";
  readonly title: string;
  readonly description: string;
}

export interface ComposerFixtureCatalog {
  readonly seed: string;
  readonly lorem: Readonly<{ title: string; body: string; multilingual: string }>;
  readonly users: readonly ComposerUserFixture[];
  readonly records: readonly ComposerRecordFixture[];
  readonly activity: readonly ActivityTimelineItem[];
  readonly chart: Readonly<{ series: readonly ChartSeries[]; data: ChartData }>;
  readonly states: readonly ComposerApplicationStateFixture[];
}

const firstNames = ["Ada", "Grace", "Katherine", "Edsger", "Linus", "Margaret", "Radia", "Ken"] as const;
const lastNames = ["Lovelace", "Hopper", "Johnson", "Dijkstra", "Torvalds", "Hamilton", "Perlman", "Thompson"] as const;
const accounts = ["Aperture", "Beacon", "Cinder", "Drift", "Evergreen", "Fable", "Granite", "Harbor"] as const;
const roles = ["Administrator", "Operator", "Analyst", "Reviewer"] as const;
const fixedEpoch = Date.UTC(2026, 8, 9, 12, 0, 0);

function seedNumber(seed: string): number {
  let value = 2_166_136_261;
  for (const character of seed) {
    value ^= character.codePointAt(0) ?? 0;
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}

function generator(seed: string): () => number {
  let state = seedNumber(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
}

function item<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length];
  if (value === undefined) throw new Error("Composer fixture catalog cannot be empty");
  return value;
}

export function createComposerFixtures(seed: string): ComposerFixtureCatalog {
  if (!seed.trim()) throw new Error("Composer fixture seed must be nonempty");
  const next = generator(seed);
  const users = Object.freeze(Array.from({ length: 12 }, (_, index): ComposerUserFixture => {
    const first = item(firstNames, index + Math.floor(next() * firstNames.length));
    const last = item(lastNames, index + Math.floor(next() * lastNames.length));
    return Object.freeze({ id: `user-${String(index + 1).padStart(3, "0")}`, name: `${first} ${last}`, email: `${first}.${last}.${index + 1}@northstar.example.test`.toLowerCase(), role: item(roles, Math.floor(next() * roles.length)) });
  }));
  const records = Object.freeze(Array.from({ length: 96 }, (_, index): ComposerRecordFixture => {
    const owner = item(users, index + Math.floor(next() * users.length));
    const status = index % 11 === 0 ? "Paused" : index % 5 === 0 ? "Review" : "Active";
    return Object.freeze({ id: `record-${String(index + 1).padStart(4, "0")}`, account: `${item(accounts, index)} ${String(index + 1).padStart(3, "0")}`, owner: owner.name, status, amount: Math.round((1_000 + next() * 98_000) * 100) / 100 });
  }));
  const activity: readonly ActivityTimelineItem[] = Object.freeze([
    Object.freeze({ id: "requested", title: "Change requested", description: "The release candidate entered review.", actor: item(users, 0).name, timestamp: new Date(fixedEpoch - 7_200_000).toISOString(), timeLabel: "10:00 AM", state: "completed" }),
    Object.freeze({ id: "approved", title: "Policy approved", description: "Automated and operator gates accepted the change.", actor: item(users, 1).name, timestamp: new Date(fixedEpoch - 3_600_000).toISOString(), timeLabel: "11:00 AM", state: "completed" }),
    Object.freeze({ id: "deploying", title: "Deployment running", description: "Three regions are receiving revision 1842.", actor: item(users, 2).name, timestamp: new Date(fixedEpoch).toISOString(), timeLabel: "12:00 PM", state: "current" }),
    Object.freeze({ id: "verify", title: "Verify production", description: "Confirm service health and error budgets.", state: "upcoming" }),
  ]);
  const series = defineSeries([
    { key: "p50", label: "p50", color: "chart-1" },
    { key: "p99", label: "p99", color: "chart-3", encoding: "dashed" },
  ]);
  const t = new Float64Array(48);
  const p50 = new Float64Array(48);
  const p99 = new Float64Array(48);
  for (let index = 0; index < t.length; index++) {
    t[index] = fixedEpoch + index * 60_000;
    p50[index] = 18 + Math.sin(index / 5) * 4 + next() * 2;
    p99[index] = index === 29 ? Number.NaN : 46 + Math.sin(index / 7) * 9 + next() * 4;
  }
  const states: readonly ComposerApplicationStateFixture[] = Object.freeze([
    Object.freeze({ kind: "ready", title: "Ready", description: "Accepted application content is available." }),
    Object.freeze({ kind: "empty", title: "No records", description: "Change the filters or create the first record." }),
    Object.freeze({ kind: "loading", title: "Loading", description: "The first accepted application snapshot is pending." }),
    Object.freeze({ kind: "error", title: "Service unavailable", description: "The last request failed before a snapshot was accepted." }),
    Object.freeze({ kind: "permission", title: "Access denied", description: "The current account cannot view this application." }),
  ]);
  return Object.freeze({
    seed,
    lorem: Object.freeze({
      title: "Northstar operations",
      body: "Track service health, account reviews, and deployment work from one compact application workspace.",
      multilingual: "مرحبا بالعالم · 中文測試 · 日本語テスト · नमस्ते दुनिया · 👩🏽‍💻",
    }),
    users,
    records,
    activity,
    chart: Object.freeze({ series, data: Object.freeze({ t, p50, p99 }) }),
    states,
  });
}

function component(id: string, name: ComposerComponentNode["component"], props: ComposerComponentNode["props"], children: readonly ComposerComponentNode[] = [], fixture?: string): ComposerComponentNode {
  return Object.freeze({ type: "component", id, component: name, props: Object.freeze(props), ...(fixture === undefined ? {} : { fixture }), children: Object.freeze(children) });
}

function placement(zone: ComposerPlacementNode["zone"], target: ComposerPlacementNode["target"]): ComposerPlacementNode {
  return Object.freeze({ type: "placement", id: `placement-${zone}`, zone, target });
}

function defaultRegions(): readonly ComposerRegion[] {
  const placements = resolveAdminPlacements("standard");
  const topbar = adminChromeZones.filter(zone => placements[zone].startsWith("topbar-")).map(zone => placement(zone, placements[zone]));
  const sidebar = adminChromeZones.filter(zone => placements[zone].startsWith("sidebar-")).map(zone => placement(zone, placements[zone]));
  const regions: Readonly<Record<ComposerRegion["id"], ComposerRegion["nodes"]>> = {
    topbar,
    sidebar,
    "page-header": [component("page-header", "PageHeader", { title: "Accounts", headingLevel: 1 }, [], "application-heading")],
    toolbar: [component("toolbar", "Stack", { gap: "sm" }, [
      component("search", "Input", { label: "Search accounts", placeholder: "Name, owner, or status" }, [], "workspace-name"),
      component("create", "Button", { children: "Create account", variant: "solid", tone: "accent", size: "sm" }, [], "primary-action"),
    ])],
    "main-grid": [component("dashboard-grid", "Grid", { columns: 2, gap: "lg" }, [
      component("latency-card", "Card", { variant: "raised", padding: "lg", bordered: true }, [
        component("latency-heading", "Heading", { level: 2, size: "h3", children: "API latency" }, [], "lorem-title"),
        component("latency-chart", "TimeSeries", { label: "API latency", summary: "Median latency is steady; one p99 sample is missing.", xLabel: "Time", height: 220, legend: "inline", tooltip: true }, [], "latency-chart"),
      ]),
      component("activity-card", "Card", { variant: "raised", padding: "lg", bordered: true }, [
        component("activity-heading", "Heading", { level: 2, size: "h3", children: "Recent activity" }, [], "lorem-title"),
        component("activity", "ActivityTimeline", { label: "Deployment activity", density: "compact", refreshing: false }, [], "activity"),
      ]),
      component("query", "QueryBuilder", { label: "Account query", disabled: false }, [], "query-filter"),
      component("records", "DataTable", { caption: "Northstar accounts", pagination: true }, [], "records"),
    ])],
    "details-panel": [component("details-card", "Card", { variant: "subtle", padding: "lg", bordered: true }, [
      component("details-heading", "Heading", { level: 2, size: "h3", children: "Account details" }, [], "lorem-title"),
      component("details-copy", "Text", { size: "body", tone: "muted", numeric: false, children: "Select a record to inspect ownership, status, and recent changes." }, [], "lorem-body"),
    ])],
    "status-bar": [component("status-copy", "Text", { size: "caption", tone: "muted", numeric: true, children: "96 records · revision 1842" })],
    overlays: [],
  };
  return Object.freeze(composerRegionIds.map(id => Object.freeze({ id, nodes: Object.freeze(regions[id]) })));
}

export const defaultComposerDocument: ComposerDocument = Object.freeze({
  schemaVersion: composerSchemaVersion,
  id: "northstar-admin-starter",
  title: "Northstar operations",
  preset: "standard",
  appearance: Object.freeze({ chrome: "layered", navigation: "subtle", actions: "quiet" }),
  regions: defaultRegions(),
});
