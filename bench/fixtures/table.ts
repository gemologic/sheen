export interface TableBenchmarkRow {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "paused" | "review";
  readonly region: "americas" | "emea" | "apac";
  readonly amount: number;
  readonly updatedAt: number;
}

export const tableBenchmarkFixture = Object.freeze({
  seed: "sheen-table-v2",
  rows: 100_000,
  columns: 6,
  matchingRows: 1_000,
  searchableColumns: 3,
  multiSortColumns: 2,
  complexCellColumns: 3,
  viewport: Object.freeze({ width: 1_200, height: 800, tableHeight: 600 }),
  scroll: Object.freeze({ distance: 10_000, duration: 2_000 }),
});

/** Deterministic arithmetic fixture. It never reads random, time, locale, or external data. */
export function createTableBenchmarkRows(count: number = tableBenchmarkFixture.rows): readonly TableBenchmarkRow[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > tableBenchmarkFixture.rows) throw new Error(`Table benchmark row count must be an integer from 0 to ${tableBenchmarkFixture.rows}`);
  return Object.freeze(Array.from({ length: count }, (_, index): TableBenchmarkRow => Object.freeze({
    id: `benchmark-${index}`,
    name: index % 100 === 0 ? `Needle account ${index}` : `Account ${index}`,
    status: index % 5 === 0 ? "review" : index % 3 === 0 ? "paused" : "active",
    region: index % 3 === 0 ? "americas" : index % 3 === 1 ? "emea" : "apac",
    amount: ((index * 7_919) % 2_000_000) - 1_000_000,
    updatedAt: 1_700_000_000_000 + index * 60_000,
  })));
}

/** Same stable identities with replacement row objects and deterministically changed accepted values. */
export function refreshTableBenchmarkRows(rows: readonly TableBenchmarkRow[]): readonly TableBenchmarkRow[] {
  if (!Array.isArray(rows) || rows.length > tableBenchmarkFixture.rows) throw new Error(`Table benchmark refresh requires at most ${tableBenchmarkFixture.rows} rows`);
  return Object.freeze(rows.map((row, index): TableBenchmarkRow => Object.freeze({
    ...row,
    amount: row.amount + (index % 2 === 0 ? 1 : -1),
    updatedAt: row.updatedAt + 30_000,
  })));
}
