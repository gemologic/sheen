import { compileFilter, parseSearchQuery } from "@gemologic/sheen-table/core";
import type { BulkSelection, DataTableResult, FilterNode, SavedViewRecord, TableState } from "@gemologic/sheen-table";
import {
  ACCOUNT_COUNT, NAME_CODES, OWNER_CODES, accountBalance, accountId, accountIndex, accountPerMinute, accountPlan, accountPlans, accountRegion, accountRegions,
  accountRequests, accountSchema, accountStatuses, baseAccount, baseStatus, isOnHold, nameCode, nameFromCode, ownerCode, ownerFromCode,
} from "../lib/accounts.ts";
import type { AccountLive, AccountRow, AccountStatus } from "../lib/accounts.ts";

/**
 * Process-local synthetic backend. Columns are generated once from the seeded PRNG and stored as typed arrays,
 * so a 1,000,000-row query never materializes more row objects than the requested page.
 */
interface Columns {
  readonly status: Uint8Array;
  readonly plan: Uint8Array;
  readonly region: Uint8Array;
  readonly name: Uint16Array;
  readonly owner: Uint16Array;
  readonly balance: Float64Array;
  readonly requests: Float64Array;
  readonly nameRank: Uint16Array;
  readonly ownerRank: Uint16Array;
  readonly statusCounts: Float64Array;
}

interface Store {
  columns?: Columns;
  readonly permutations: Map<string, Uint32Array>;
  readonly views: Map<string, SavedViewRecord>;
  viewSerial: number;
}

let state: Store | undefined;
function store(): Store {
  state ??= { permutations: new Map(), views: new Map(), viewSerial: 0 };
  return state;
}

function increment(counts: Float64Array, code: number | undefined): void {
  const index = code ?? 0;
  counts[index] = (counts[index] ?? 0) + 1;
}

function rankCodes(count: number, label: (code: number) => string): Uint16Array {
  const order = Array.from({ length: count }, (_, code) => code).sort((first, second) => label(first).localeCompare(label(second), "en-US"));
  const rank = new Uint16Array(count);
  order.forEach((code, position) => { rank[code] = position; });
  return rank;
}

function columns(): Columns {
  const current = store();
  if (current.columns) return current.columns;
  const status = new Uint8Array(ACCOUNT_COUNT);
  const plan = new Uint8Array(ACCOUNT_COUNT);
  const region = new Uint8Array(ACCOUNT_COUNT);
  const name = new Uint16Array(ACCOUNT_COUNT);
  const owner = new Uint16Array(ACCOUNT_COUNT);
  const balance = new Float64Array(ACCOUNT_COUNT);
  const requests = new Float64Array(ACCOUNT_COUNT);
  const statusCounts = new Float64Array(accountStatuses.length);
  for (let index = 0; index < ACCOUNT_COUNT; index++) {
    const code = accountStatuses.indexOf(baseStatus(index));
    status[index] = code;
    increment(statusCounts, code);
    plan[index] = accountPlans.indexOf(accountPlan(index));
    region[index] = accountRegions.indexOf(accountRegion(index));
    name[index] = nameCode(index);
    owner[index] = ownerCode(index);
    balance[index] = accountBalance(index);
    requests[index] = accountRequests(index);
  }
  current.columns = { status, plan, region, name, owner, balance, requests, statusCounts, nameRank: rankCodes(NAME_CODES, nameFromCode), ownerRank: rankCodes(OWNER_CODES, ownerFromCode) };
  return current.columns;
}

function statusAt(data: Columns, index: number): AccountStatus {
  return accountStatuses[data.status[index] ?? 0] ?? "Active";
}

function row(data: Columns, index: number): AccountRow {
  return baseAccount(index, statusAt(data, index));
}

function value(data: Columns, index: number, column: string): string | number | null {
  switch (column) {
    case "name": return nameFromCode(data.name[index] ?? 0);
    case "owner": return ownerFromCode(data.owner[index] ?? 0);
    case "status": return statusAt(data, index);
    case "plan": return accountPlans[data.plan[index] ?? 0] ?? null;
    case "region": return accountRegions[data.region[index] ?? 0] ?? null;
    case "balance": return data.balance[index] ?? null;
    case "requests": return data.requests[index] ?? null;
    default: return null;
  }
}

/** Comparable numeric sort key; enum ranks follow their English label order. */
function sortKey(data: Columns, column: string): (index: number) => number {
  const labelRank = (labels: readonly string[], codes: Uint8Array) => {
    const ranks = rankCodes(labels.length, code => labels[code] ?? "");
    return (index: number) => ranks[codes[index] ?? 0] ?? 0;
  };
  switch (column) {
    case "name": return index => data.nameRank[data.name[index] ?? 0] ?? 0;
    case "owner": return index => data.ownerRank[data.owner[index] ?? 0] ?? 0;
    case "status": return labelRank(accountStatuses, data.status);
    case "plan": return labelRank(accountPlans, data.plan);
    case "region": return labelRank(accountRegions, data.region);
    case "balance": return index => data.balance[index] ?? 0;
    case "requests": return index => data.requests[index] ?? 0;
    default: throw new Error(`Unsortable column ${column}`);
  }
}

function permutation(data: Columns, column: string, direction: "asc" | "desc"): Uint32Array {
  const key = `${column}:${direction}`;
  const cached = store().permutations.get(key);
  if (cached) return cached;
  const keyOf = sortKey(data, column);
  const keys = new Float64Array(ACCOUNT_COUNT);
  for (let index = 0; index < ACCOUNT_COUNT; index++) keys[index] = keyOf(index);
  const sign = direction === "asc" ? 1 : -1;
  const order = new Uint32Array(ACCOUNT_COUNT).map((_, index) => index);
  order.sort((first, second) => sign * ((keys[first] ?? 0) - (keys[second] ?? 0)) || first - second);
  store().permutations.set(key, order);
  return order;
}

function isEmptyFilter(filter: FilterNode): boolean {
  return filter.kind === "and" && filter.children.length === 0;
}

function matcher(data: Columns, state: Pick<TableState, "search" | "filter">): ((index: number) => boolean) | null {
  const predicates: ((index: number) => boolean)[] = [];
  if (!isEmptyFilter(state.filter)) {
    predicates.push(compileFilter<number>(state.filter, accountSchema.filterColumns, { locale: "en-US", getValue: (index, column) => value(data, index, column) }));
  }
  const query = parseSearchQuery(state.search, true);
  const text = query.value.trim().toLocaleLowerCase("en-US");
  if (text) {
    const terms = query.mode === "exact" ? [text] : text.split(/\s+/u);
    const names = Array.from({ length: NAME_CODES }, (_, code) => nameFromCode(code).toLocaleLowerCase("en-US"));
    const owners = Array.from({ length: OWNER_CODES }, (_, code) => ownerFromCode(code).toLocaleLowerCase("en-US"));
    for (const term of terms) {
      // Exact mode requires the literal phrase within one column; ranked mode requires every term in some column.
      const nameHit = Uint8Array.from(names, name => Number(name.includes(term)));
      const ownerHit = Uint8Array.from(owners, owner => Number(owner.includes(term)));
      const idTerm = /\d/u.test(term) ? term : null;
      predicates.push(index => nameHit[data.name[index] ?? 0] === 1 || ownerHit[data.owner[index] ?? 0] === 1 || (idTerm !== null && accountId(index).toLocaleLowerCase("en-US").includes(idTerm)));
    }
  }
  if (predicates.length === 0) return null;
  return index => predicates.every(predicate => predicate(index));
}

function facets(data: Columns, matched: Uint32Array | null): Readonly<Record<string, Readonly<Record<string, number>>>> {
  const status = new Float64Array(accountStatuses.length);
  const plan = new Float64Array(accountPlans.length);
  const region = new Float64Array(accountRegions.length);
  if (matched === null) {
    status.set(data.statusCounts);
    for (let index = 0; index < ACCOUNT_COUNT; index++) {
      increment(plan, data.plan[index]);
      increment(region, data.region[index]);
    }
  } else {
    for (const index of matched) {
      increment(status, data.status[index]);
      increment(plan, data.plan[index]);
      increment(region, data.region[index]);
    }
  }
  const counts = (labels: readonly string[], values: Float64Array) => Object.fromEntries(labels.map((label, code) => [label, values[code] ?? 0]));
  return { status: counts(accountStatuses, status), plan: counts(accountPlans, plan), region: counts(accountRegions, region) };
}

let allFacets: ReturnType<typeof facets> | undefined;

/** Evaluates search, filter, sorting, facets, and the requested page together, as the table contract requires. */
export function queryAccounts(state: TableState): DataTableResult<AccountRow> {
  const data = columns();
  if (state.pagination === false) throw new Error("Accounts require numbered pagination");
  const { pageIndex, pageSize } = state.pagination;
  const match = matcher(data, state);
  let matched: Uint32Array | null = null;
  if (match) {
    const hits: number[] = [];
    for (let index = 0; index < ACCOUNT_COUNT; index++) if (match(index)) hits.push(index);
    matched = Uint32Array.from(hits);
  }
  const total = matched?.length ?? ACCOUNT_COUNT;
  const start = pageIndex * pageSize;
  const end = Math.min(total, start + pageSize);
  const page: number[] = [];
  const [primary, ...rest] = state.sorting;
  if (!primary) {
    for (let position = start; position < end; position++) page.push(matched ? matched[position] ?? 0 : position);
  } else if (rest.length === 0) {
    const order = permutation(data, primary.column, primary.direction);
    if (!matched) {
      for (let position = start; position < end; position++) page.push(order[position] ?? 0);
    } else {
      const mask = new Uint8Array(ACCOUNT_COUNT);
      for (const index of matched) mask[index] = 1;
      let position = 0;
      for (const index of order) {
        if (mask[index] !== 1) continue;
        if (position >= start) page.push(index);
        if (++position >= end) break;
      }
    }
  } else {
    const keys = state.sorting.map(entry => ({ key: sortKey(data, entry.column), sign: entry.direction === "asc" ? 1 : -1 }));
    const candidates = matched ?? new Uint32Array(ACCOUNT_COUNT).map((_, index) => index);
    const sorted = Uint32Array.from(candidates).sort((first, second) => {
      for (const { key, sign } of keys) {
        const difference = key(first) - key(second);
        if (difference !== 0) return sign * difference;
      }
      return first - second;
    });
    for (let position = start; position < end; position++) page.push(sorted[position] ?? 0);
  }
  allFacets ??= facets(data, null);
  return { rows: page.map(index => row(data, index)), total, facets: matched ? facets(data, matched) : allFacets };
}

export function liveAccounts(ids: readonly string[], nowMs: number): readonly AccountLive[] {
  const data = columns();
  return ids.flatMap(id => {
    const index = accountIndex(id);
    return index === null ? [] : [{ id, status: statusAt(data, index), perMinute: accountPerMinute(index, nowMs) }];
  });
}

export type SuspendOutcome =
  | { readonly kind: "accepted"; readonly suspended: number }
  | { readonly kind: "rejected"; readonly status: number; readonly message: string };

const MAX_BULK = 25_000;

/** All-or-nothing: a batch that contains a legal-hold account changes nothing. */
export function suspendAccounts(selection: BulkSelection): SuspendOutcome {
  const data = columns();
  let targets: number[];
  if (selection.kind === "ids") {
    targets = selection.ids.flatMap(id => { const index = accountIndex(id); return index === null ? [] : [index]; });
  } else {
    const excluded = new Set(selection.excluded.flatMap(id => { const index = accountIndex(id); return index === null ? [] : [index]; }));
    const match = matcher(data, { search: "", filter: selection.filter });
    targets = [];
    for (let index = 0; index < ACCOUNT_COUNT; index++) {
      if (excluded.has(index) || (match && !match(index))) continue;
      targets.push(index);
      if (targets.length > MAX_BULK) return { kind: "rejected", status: 413, message: `Bulk suspension is limited to ${MAX_BULK.toLocaleString("en-US")} accounts.` };
    }
  }
  const held = targets.filter(isOnHold);
  if (held.length > 0) return { kind: "rejected", status: 409, message: `${held.length.toLocaleString("en-US")} selected ${held.length === 1 ? "account is" : "accounts are"} on legal hold (${accountId(held[0] ?? 0)}${held.length > 1 ? ", …" : ""}).` };
  const suspended = accountStatuses.indexOf("Suspended");
  for (const index of targets) {
    const previous = data.status[index] ?? 0;
    if (previous === suspended) continue;
    data.statusCounts[previous] = (data.statusCounts[previous] ?? 0) - 1;
    data.statusCounts[suspended] = (data.statusCounts[suspended] ?? 0) + 1;
    data.status[index] = suspended;
  }
  allFacets = undefined;
  for (const key of store().permutations.keys()) if (key.startsWith("status:")) store().permutations.delete(key);
  return { kind: "accepted", suspended: targets.length };
}

export function listViews(): readonly SavedViewRecord[] {
  return [...store().views.values()];
}

export function saveView(input: { readonly id: string | null; readonly name: string; readonly state: string }): SavedViewRecord {
  const current = store();
  const id = input.id ?? `view-${++current.viewSerial}`;
  const record = Object.freeze({ id, name: input.name, state: input.state });
  current.views.set(id, record);
  return record;
}

export function deleteView(id: string): boolean {
  return store().views.delete(id);
}
