import type { ColumnState, DataTableResult, TableState, TableStateSchema } from "@gemologic/sheen-table";
import { hash32, pick, unit } from "./prng.ts";

export const ACCOUNT_COUNT = 1_000_000;
export const ACCOUNT_PAGE_SIZE = 50;
const SEED = 0x51ee7;

export const accountStatuses = ["Active", "Review", "Suspended"] as const;
export const accountPlans = ["Enterprise", "Growth", "Core", "Trial"] as const;
export const accountRegions = ["US East", "US West", "EU Central", "Asia Pacific", "South America"] as const;
export type AccountStatus = typeof accountStatuses[number];
export type AccountPlan = typeof accountPlans[number];
export type AccountRegion = typeof accountRegions[number];

export interface AccountRow {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly status: AccountStatus;
  readonly plan: AccountPlan;
  readonly region: AccountRegion;
  readonly balance: number;
  readonly requests: number;
  /** Accounts under legal hold cannot be suspended; the server rejects the whole batch. */
  readonly hold: boolean;
}

/** Fields the background revalidation refreshes for accepted rows without a new table query. */
export interface AccountLive {
  readonly id: string;
  readonly status: AccountStatus;
  readonly perMinute: number;
}

const prefixes = ["Northwind", "Bluefin", "Cobalt", "Juniper", "Halcyon", "Meridian", "Granite", "Lumen", "Sable", "Tidewater", "Quarry", "Aster", "Kestrel", "Harbor", "Vantage", "Ember", "Pioneer", "Sterling", "Orchid", "Summit"] as const;
const middles = ["Analytics", "Logistics", "Health", "Robotics", "Freight", "Capital", "Foods", "Energy", "Studios", "Systems", "Networks", "Labs", "Mobility", "Retail", "Biotech", "Media"] as const;
const suffixes = ["Inc", "LLC", "Group", "GmbH", "Ltd", "Co", "SA", "KK"] as const;
const firstNames = ["Ada", "Grace", "Katherine", "Margaret", "Alan", "Barbara", "Edsger", "Frances", "Hedy", "John", "Lynn", "Radia", "Ken", "Sophie", "Tim", "Annie"] as const;
const lastNames = ["Lovelace", "Hopper", "Johnson", "Hamilton", "Turing", "Liskov", "Dijkstra", "Allen", "Lamarr", "Backus", "Conway", "Perlman", "Thompson", "Wilson", "Berners-Lee", "Easley"] as const;

export function accountId(index: number): string {
  return `AC-${String(index + 1).padStart(7, "0")}`;
}

export function accountIndex(id: string): number | null {
  const match = /^AC-(\d{7})$/u.exec(id);
  if (!match?.[1]) return null;
  const index = Number(match[1]) - 1;
  return index >= 0 && index < ACCOUNT_COUNT ? index : null;
}

export function isOnHold(index: number): boolean {
  return index % 23 === 7;
}

/** Base status before server-side mutations. */
export function baseStatus(index: number): AccountStatus {
  const roll = unit(SEED + 3, index);
  return roll < 0.82 ? "Active" : roll < 0.95 ? "Review" : "Suspended";
}

/** Names come from a bounded vocabulary, so the server can search and rank codes instead of a million strings. */
export const NAME_CODES = prefixes.length * middles.length * suffixes.length;
export const OWNER_CODES = firstNames.length * lastNames.length;

export function nameCode(index: number): number {
  return (hash32(SEED, index) % prefixes.length) * middles.length * suffixes.length + (hash32(SEED + 1, index) % middles.length) * suffixes.length + hash32(SEED + 2, index) % suffixes.length;
}

export function nameFromCode(code: number): string {
  const suffix = code % suffixes.length;
  const middle = Math.floor(code / suffixes.length) % middles.length;
  const prefix = Math.floor(code / (suffixes.length * middles.length));
  return `${prefixes[prefix] ?? ""} ${middles[middle] ?? ""} ${suffixes[suffix] ?? ""}`;
}

export function ownerCode(index: number): number {
  return (hash32(SEED + 4, index) % firstNames.length) * lastNames.length + hash32(SEED + 5, index) % lastNames.length;
}

export function ownerFromCode(code: number): string {
  return `${firstNames[Math.floor(code / lastNames.length)] ?? ""} ${lastNames[code % lastNames.length] ?? ""}`;
}

export function accountName(index: number): string {
  return nameFromCode(nameCode(index));
}

export function accountOwner(index: number): string {
  return ownerFromCode(ownerCode(index));
}

export function accountPlan(index: number): AccountPlan {
  const roll = unit(SEED + 6, index);
  return roll < 0.08 ? "Enterprise" : roll < 0.3 ? "Growth" : roll < 0.8 ? "Core" : "Trial";
}

export function accountRegion(index: number): AccountRegion {
  return pick(accountRegions, SEED + 7, index);
}

export function accountBalance(index: number): number {
  const scale = accountPlan(index) === "Enterprise" ? 250_000 : accountPlan(index) === "Growth" ? 40_000 : 6_000;
  return Math.round(scale * (0.05 + unit(SEED + 8, index) ** 2 * 1.6) * 100) / 100;
}

export function accountRequests(index: number): number {
  return Math.floor(2_000 + unit(SEED + 9, index) ** 3 * 4_800_000);
}

/** Live per-minute request rate, bucketed to five-second windows so concurrent readers agree. */
export function accountPerMinute(index: number, nowMs: number): number {
  const bucket = Math.floor(nowMs / 5_000);
  const base = accountRequests(index) / 43_200;
  return Math.round(base * (0.7 + unit(hash32(SEED + 10, index), bucket) * 0.6));
}

export function baseAccount(index: number, status: AccountStatus = baseStatus(index)): AccountRow {
  return Object.freeze({
    id: accountId(index),
    name: accountName(index),
    owner: accountOwner(index),
    status,
    plan: accountPlan(index),
    region: accountRegion(index),
    balance: accountBalance(index),
    requests: accountRequests(index),
    hold: isOnHold(index),
  });
}

export const accountColumnIds = ["name", "owner", "status", "plan", "region", "balance", "requests", "live"] as const;

export const accountSchema: TableStateSchema = {
  columns: [...accountColumnIds],
  filterColumns: [
    { id: "name", type: "text" },
    { id: "owner", type: "text" },
    { id: "status", type: "enum", options: [...accountStatuses] },
    { id: "plan", type: "enum", options: [...accountPlans] },
    { id: "region", type: "enum", options: [...accountRegions] },
    { id: "balance", type: "number" },
    { id: "requests", type: "number" },
  ],
  sortColumns: [
    { id: "name", type: "text" },
    { id: "owner", type: "text" },
    { id: "status", type: "text" },
    { id: "plan", type: "text" },
    { id: "region", type: "text" },
    { id: "balance", type: "number" },
    { id: "requests", type: "number" },
  ],
};

export const defaultAccountState: TableState = {
  search: "",
  filter: { kind: "and", children: [] },
  sorting: [],
  pagination: { pageIndex: 0, pageSize: ACCOUNT_PAGE_SIZE },
  columns: accountColumnIds.map((id): ColumnState => ({ id, visible: true, width: null, pin: id === "name" ? "start" : false })),
};

function isMember<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.some(candidate => candidate === value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseAccountRow(value: unknown): AccountRow {
  if (!record(value)) throw new Error("Invalid account row");
  const { id, name, owner, status, plan, region, balance, requests, hold } = value;
  if (typeof id !== "string" || typeof name !== "string" || typeof owner !== "string" || !isMember(accountStatuses, status) || !isMember(accountPlans, plan)
    || !isMember(accountRegions, region) || typeof balance !== "number" || typeof requests !== "number" || typeof hold !== "boolean") throw new Error("Invalid account row");
  return Object.freeze({ id, name, owner, status, plan, region, balance, requests, hold });
}

export function parseAccountLive(value: unknown): AccountLive {
  if (!record(value) || typeof value.id !== "string" || !isMember(accountStatuses, value.status) || typeof value.perMinute !== "number") throw new Error("Invalid live account");
  return Object.freeze({ id: value.id, status: value.status, perMinute: value.perMinute });
}

function parseFacets(value: unknown): Readonly<Record<string, Readonly<Record<string, number>>>> | undefined {
  if (value === undefined) return undefined;
  if (!record(value)) throw new Error("Invalid facets");
  const result: Record<string, Record<string, number>> = {};
  for (const [column, counts] of Object.entries(value)) {
    if (!record(counts)) throw new Error("Invalid facets");
    const parsed: Record<string, number> = {};
    for (const [option, count] of Object.entries(counts)) {
      if (typeof count !== "number") throw new Error("Invalid facets");
      parsed[option] = count;
    }
    result[column] = parsed;
  }
  return result;
}

export function parseAccountResult(value: unknown): DataTableResult<AccountRow> {
  if (!record(value) || !Array.isArray(value.rows) || typeof value.total !== "number") throw new Error("Invalid account page");
  const facets = parseFacets(value.facets);
  return { rows: value.rows.map(parseAccountRow), total: value.total, ...(facets ? { facets } : {}) };
}
