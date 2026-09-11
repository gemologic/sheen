import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartCategoricalData, ChartData, ChartSeries } from "@gemologic/sheen-charts/core";

export type AdminWorkload = "representative" | "heavy";

export interface AdminAccountRow {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly status: "Active" | "Review" | "Paused";
  readonly plan: "Enterprise" | "Growth" | "Core";
  readonly region: "US East" | "US West" | "EU Central" | "Asia Pacific";
  readonly balance: number;
  readonly requests: number;
  readonly utilization: number;
  readonly updated: string;
  readonly revision: number;
}

export interface AdminWorkloadSnapshot {
  readonly kind: AdminWorkload;
  readonly rows: readonly AdminAccountRow[];
  readonly traffic: ChartData;
  readonly rowCount: number;
  readonly chartPoints: number;
}

const workloadSizes: Readonly<Record<AdminWorkload, { readonly rows: number; readonly chartPoints: number }>> = Object.freeze({
  representative: Object.freeze({ rows: 240, chartPoints: 720 }),
  heavy: Object.freeze({ rows: 12_000, chartPoints: 20_000 }),
});

const accountNames = Object.freeze(["Aperture", "Beacon", "Cinder", "Drift", "Evergreen", "Fable"]);
const owners = Object.freeze(["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Edsger Dijkstra", "Margaret Hamilton", "Donald Knuth", "Barbara Liskov", "Alan Turing"]);
const regions: readonly AdminAccountRow["region"][] = Object.freeze(["US East", "US West", "EU Central", "Asia Pacific"]);
const plans: readonly AdminAccountRow["plan"][] = Object.freeze(["Enterprise", "Growth", "Core"]);

export const trafficSeries: readonly ChartSeries[] = defineSeries([
  { key: "requests", label: "Requests", color: "chart-1" },
  { key: "events", label: "Events", color: "chart-3", encoding: "dashed" },
  { key: "jobs", label: "Background jobs", color: "chart-5", encoding: "dotted" },
]);

export const regionSeries: readonly ChartSeries[] = defineSeries([
  { key: "used", label: "Used capacity", color: "chart-2" },
  { key: "reserved", label: "Reserved headroom", color: "chart-6" },
]);

export const regionCapacity: ChartCategoricalData = Object.freeze({
  categories: Object.freeze(["US East", "US West", "EU Central", "Asia Pacific", "South America", "Canada"]),
  values: Object.freeze({
    used: new Float64Array([74, 61, 68, 55, 47, 51]),
    reserved: new Float64Array([14, 21, 18, 24, 31, 27]),
  }),
});

function accountRows(count: number, revision: number, refreshed: boolean): readonly AdminAccountRow[] {
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    id: `account-${String(index + 1).padStart(4, "0")}`,
    name: `${accountNames[index % accountNames.length] ?? "Northstar"} ${String(index + 1).padStart(3, "0")}`,
    owner: owners[index % owners.length] ?? "Operations",
    status: index % 17 === 0 ? "Paused" : index % 7 === 0 ? "Review" : "Active",
    plan: plans[index % plans.length] ?? "Core",
    region: regions[index % regions.length] ?? "US East",
    balance: 1_250 + index * 173.25 + (refreshed ? revision * 11.25 : 0),
    requests: 18_000 + ((index * 7_919) % 920_000) + (refreshed ? revision * 101 + (index % 29) : 0),
    utilization: 35 + ((index * 37) % 61),
    updated: revision === 1 ? `${(index % 23) + 1} min ago` : "just now",
    revision,
  })));
}

function trafficData(points: number, revision: number): ChartData {
  const t = new Float64Array(points);
  const requests = new Float64Array(points);
  const events = new Float64Array(points);
  const jobs = new Float64Array(points);
  const start = Date.UTC(2026, 8, 1, 0, 0, 0);
  for (let index = 0; index < points; index += 1) {
    const wave = Math.sin(index / 31) * 2_400 + Math.cos(index / 113) * 1_100;
    t[index] = start + index * 60_000;
    requests[index] = 38_000 + wave + (index % 97) * 34 + revision * 41;
    events[index] = 24_000 + wave * 0.62 + (index % 71) * 27 + revision * 29;
    jobs[index] = index > 0 && index % 997 === 0 ? Number.NaN : 7_400 + wave * 0.18 + (index % 53) * 19 + revision * 17;
  }
  return Object.freeze({ t, requests, events, jobs });
}

const initialSnapshots = new Map<AdminWorkload, AdminWorkloadSnapshot>();

function createSnapshot(kind: AdminWorkload, revision: number, refreshed: boolean): AdminWorkloadSnapshot {
  const size = workloadSizes[kind];
  return Object.freeze({
    kind,
    rows: accountRows(size.rows, revision, refreshed),
    traffic: trafficData(size.chartPoints, revision),
    rowCount: size.rows,
    chartPoints: size.chartPoints,
  });
}

export function createAdminWorkload(kind: AdminWorkload, revision = 1): AdminWorkloadSnapshot {
  if (!Number.isInteger(revision) || revision < 1) throw new Error("Admin workload revision must be a positive integer");
  if (revision === 1) {
    const cached = initialSnapshots.get(kind);
    if (cached) return cached;
  }
  const snapshot = createSnapshot(kind, revision, false);
  if (revision === 1) initialSnapshots.set(kind, snapshot);
  return snapshot;
}

export function refreshAdminWorkload(current: AdminWorkloadSnapshot, revision: number): AdminWorkloadSnapshot {
  if (!Number.isInteger(revision) || revision < 1) throw new Error("Admin workload revision must be a positive integer");
  return createSnapshot(current.kind, revision, true);
}
