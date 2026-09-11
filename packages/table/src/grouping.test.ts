import { describe, expect, it } from "vitest";
import { groupClientRows, normalizeServerGroups } from "./grouping.ts";

interface Row { readonly id: string; readonly desk: string | null; readonly amount: number | null; readonly live: boolean }
const rows: readonly Row[] = [
  { id: "a", desk: "alpha", amount: 10, live: true },
  { id: "b", desk: "beta", amount: 4, live: true },
  { id: "c", desk: "alpha", amount: null, live: false },
  { id: "d", desk: null, amount: 2, live: true },
  { id: "e", desk: "alpha", amount: 20, live: true },
];

describe("client row grouping", () => {
  it("retains first-seen group and leaf order with immutable scalar identities", () => {
    const groups = groupClientRows(rows, { column: "desk", getValue: row => row.desk });
    expect(groups.map(group => ({ id: group.id, value: group.value, rows: group.rows.map(row => row.id) }))).toEqual([
      { id: 'group:desk:string:"alpha"', value: "alpha", rows: ["a", "c", "e"] },
      { id: 'group:desk:string:"beta"', value: "beta", rows: ["b"] },
      { id: "group:desk:null", value: null, rows: ["d"] },
    ]);
    expect(Object.isFrozen(groups)).toBe(true);
    expect(Object.isFrozen(groups[0]?.rows)).toBe(true);
  });

  it("calculates numeric aggregates while count excludes missing values", () => {
    const groups = groupClientRows(rows, {
      column: "desk",
      getValue: row => row.desk,
      aggregates: [
        { id: "sum", aggregate: "sum", getValue: row => row.amount },
        { id: "average", aggregate: "average", getValue: row => row.amount },
        { id: "min", aggregate: "min", getValue: row => row.amount },
        { id: "max", aggregate: "max", getValue: row => row.amount },
        { id: "present", aggregate: "count", getValue: row => row.amount },
        { id: "live", aggregate: "count", getValue: row => row.live },
      ],
    });
    expect(groups[0]?.aggregates).toEqual([
      { column: "sum", value: 30 },
      { column: "average", value: 15 },
      { column: "min", value: 10 },
      { column: "max", value: 20 },
      { column: "present", value: 2 },
      { column: "live", value: 3 },
    ]);
  });

  it("represents empty numeric aggregates as null and rejects invalid inputs atomically", () => {
    const empty = groupClientRows(rows.slice(2, 3), { column: "desk", getValue: row => row.desk, aggregates: [{ id: "amount", aggregate: "sum", getValue: row => row.amount }] });
    expect(empty[0]?.aggregates).toEqual([{ column: "amount", value: null }]);
    expect(() => groupClientRows(rows, { column: "desk", getValue: row => row.desk, aggregates: [{ id: "bad", aggregate: "sum", getValue: row => row.desk }] })).toThrow("requires numeric");
    const sparse = Array<Row>(1);
    expect(() => groupClientRows(sparse, { column: "desk", getValue: row => row.desk })).toThrow("row 0");
    expect(() => groupClientRows(rows, { column: "desk", getValue: () => Number.NaN })).toThrow("finite number");
  });

  it("validates delegated full-group totals against exact accepted page order", () => {
    const page = rows.slice(0, 3);
    const groups = normalizeServerGroups(page, [
      { value: "alpha", rowIds: ["a"], count: 20, aggregates: [{ column: "amount", value: 300 }] },
      { value: "beta", rowIds: ["b"], count: 12, aggregates: [{ column: "amount", value: 80 }] },
      { value: "alpha-page-two", rowIds: ["c"], count: 20, aggregates: [{ column: "amount", value: 300 }] },
    ], { column: "desk", aggregateColumns: ["amount"], getRowId: row => row.id });
    expect(groups.map(group => ({ value: group.value, ids: group.rows.map(row => row.id), count: group.count, aggregates: group.aggregates }))).toEqual([
      { value: "alpha", ids: ["a"], count: 20, aggregates: [{ column: "amount", value: 300 }] },
      { value: "beta", ids: ["b"], count: 12, aggregates: [{ column: "amount", value: 80 }] },
      { value: "alpha-page-two", ids: ["c"], count: 20, aggregates: [{ column: "amount", value: 300 }] },
    ]);
  });

  it("rejects incomplete, reordered, duplicated, or malformed delegated groups", () => {
    const options = { column: "desk", aggregateColumns: ["amount"], getRowId: (row: Row): string => row.id };
    expect(() => normalizeServerGroups(rows.slice(0, 2), [{ value: "alpha", rowIds: ["a"], count: 1, aggregates: [{ column: "amount", value: 10 }] }], options)).toThrow("cover every");
    expect(() => normalizeServerGroups(rows.slice(0, 2), [
      { value: "beta", rowIds: ["b"], count: 1, aggregates: [{ column: "amount", value: 4 }] },
      { value: "alpha", rowIds: ["a"], count: 1, aggregates: [{ column: "amount", value: 10 }] },
    ], options)).toThrow("server order");
    expect(() => normalizeServerGroups(rows.slice(0, 2), [
      { value: "alpha", rowIds: ["a"], count: 1, aggregates: [{ column: "amount", value: 10 }] },
      { value: "alpha", rowIds: ["b"], count: 1, aggregates: [{ column: "amount", value: 4 }] },
    ], options)).toThrow("Duplicate server group");
    expect(() => normalizeServerGroups(rows.slice(0, 1), [{ value: "alpha", rowIds: ["a"], count: 1, aggregates: [] }], options)).toThrow("every configured aggregate");
    expect(() => normalizeServerGroups(rows.slice(0, 1), [{ value: "alpha", rowIds: ["a"], count: 0, aggregates: [{ column: "amount", value: 10 }] }], options)).toThrow("count");
  });
});
