import { describe, expect, it } from "vitest";
import { createTableBenchmarkRows, refreshTableBenchmarkRows, tableBenchmarkFixture } from "./table.ts";

describe("table benchmark fixture", () => {
  it("is deterministic, bounded, and carries the frozen benchmark dimensions", () => {
    const first = createTableBenchmarkRows(1_001);
    const second = createTableBenchmarkRows(1_001);
    expect(first).toEqual(second);
    expect(first.filter(row => row.name.startsWith("Needle "))).toHaveLength(11);
    expect(first[0]).toEqual({ id: "benchmark-0", name: "Needle account 0", status: "review", region: "americas", amount: -1_000_000, updatedAt: 1_700_000_000_000 });
    expect(first[1_000]?.updatedAt).toBe(1_700_060_000_000);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(tableBenchmarkFixture).toMatchObject({ seed: "sheen-table-v2", rows: 100_000, columns: 6, matchingRows: 1_000, searchableColumns: 3, multiSortColumns: 2, complexCellColumns: 3 });
    const refreshed = refreshTableBenchmarkRows(first);
    expect(refreshed[0]).toMatchObject({ id: first[0]?.id, amount: -999_999, updatedAt: 1_700_000_030_000 });
    expect(refreshed[1]).not.toBe(first[1]);
    expect(Object.isFrozen(refreshed)).toBe(true);
    expect(() => createTableBenchmarkRows(100_001)).toThrow("0 to 100000");
  });
});
