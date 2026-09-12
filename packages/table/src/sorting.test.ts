import { describe, expect, it } from "vitest";
import { parseSorting, sortClientRows } from "./sorting.ts";
import type { SortColumn, SortState } from "./sorting.ts";
import { paginateClientRows } from "./pagination.ts";

const columns: readonly SortColumn[] = [{ id: "name", type: "text" }, { id: "amount", type: "number" }, { id: "time", type: "date" }];
type Row = Record<string, unknown>;
const options = { locale: "en-US", getValue: (row: Row, column: string) => row[column] };

describe("client sorting", () => {
  it("validates and freezes copied sort state", () => {
    const input = [{ column: "amount", direction: "asc" }];
    const state = parseSorting(input, columns);
    input[0] = { column: "name", direction: "desc" };
    expect(state).toEqual([{ column: "amount", direction: "asc" }]);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state[0])).toBe(true);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    for (const value of [null, {}, [null], Array(1), [{ column: "unknown", direction: "asc" }], [{ column: "name", direction: "up" }], [{ column: "name", direction: "asc", extra: true }], [{ column: "name", direction: "asc" }, { column: "name", direction: "desc" }]]) expect(() => parseSorting(value, columns)).toThrow("Invalid sorting");
    expect(() => parseSorting([], [{ id: "", type: "text" }])).toThrow();
    expect(() => parseSorting([], [{ id: "name", type: "text" }, { id: "name", type: "text" }])).toThrow();
  });
  it("sorts multiple keys with stable ties and without mutating source rows", () => {
    const rows = [{ name: "b", amount: 1 }, { name: "a", amount: 1 }, { name: "a", amount: 2 }, { name: "a", amount: 2 }];
    const original = [...rows];
    const result = sortClientRows(rows, [{ column: "name", direction: "asc" }, { column: "amount", direction: "desc" }], columns, options);
    expect(result).toEqual([rows[2], rows[3], rows[1], rows[0]]);
    expect(result[0]).toBe(rows[2]);
    expect(result[1]).toBe(rows[3]);
    expect(rows).toEqual(original);
    expect(sortClientRows(rows, [], columns, options)).toBe(rows);
  });
  it("keeps missing and invalid values last in both directions without coercion", () => {
    const rows = [null, 2, undefined, NaN, 1, Infinity, "3", false].map(amount => ({ amount }));
    expect(sortClientRows(rows, [{ column: "amount", direction: "asc" }], columns, options)).toEqual([rows[4], rows[1], rows[0], rows[2], rows[3], rows[5], rows[6], rows[7]]);
    expect(sortClientRows(rows, [{ column: "amount", direction: "desc" }], columns, options)).toEqual([rows[1], rows[4], rows[0], rows[2], rows[3], rows[5], rows[6], rows[7]]);
  });
  it("continues to secondary keys for identical and collation-equivalent text", () => {
    const rows = [
      { name: "item1", amount: 1 }, { name: "item01", amount: 3 }, { name: "item1", amount: 2 },
      { name: "é", amount: 1 }, { name: "e\u0301", amount: 2 }, { name: "item1", amount: 2 },
    ];
    const result = sortClientRows(rows, [{ column: "name", direction: "asc" }, { column: "amount", direction: "desc" }], columns, options);
    expect(result).toEqual([rows[4], rows[3], rows[1], rows[2], rows[5], rows[0]]);
    expect(result[3]).toBe(rows[2]);
    expect(result[4]).toBe(rows[5]);
  });
  it("uses explicit locale collation and natural embedded-number order", () => {
    const state: SortState = [{ column: "name", direction: "asc" }];
    const rows = ["z", "ä", "a", "item10", "item2", ""].map(name => ({ name }));
    expect(sortClientRows(rows, state, columns, { ...options, locale: "sv-SE" }).map(row => row.name)).toEqual(["a", "item2", "item10", "z", "ä", ""]);
    expect(sortClientRows(rows, state, columns, { ...options, locale: "de-DE" }).map(row => row.name)).toEqual(["a", "ä", "item2", "item10", "z", ""]);
    for (const locale of ["", "invalid_locale", "zz-ZZ"]) expect(() => sortClientRows(rows, state, columns, { ...options, locale })).toThrow();
  });
  it("uses finite epoch milliseconds and sorts the complete view before slicing", () => {
    const rows = [2000, 0, new Date(0), -1000, 9e15].map(time => ({ time }));
    const sorted = sortClientRows(rows, [{ column: "time", direction: "asc" }], columns, options);
    expect(sorted).toEqual([rows[3], rows[1], rows[0], rows[2], rows[4]]);
    expect(paginateClientRows(sorted, { pageIndex: 1, pageSize: 2 }).rows).toEqual([rows[0], rows[2]]);
  });
  it("reads each active key once per row and propagates accessor errors", () => {
    let reads = 0;
    const rows = Array.from({ length: 100 }, (_, amount) => ({ amount: 100 - amount }));
    sortClientRows(rows, [{ column: "amount", direction: "asc" }], columns, { locale: "en-US", getValue: row => { reads++; return row.amount; } });
    expect(reads).toBe(100);
    expect(() => sortClientRows(rows, [{ column: "amount", direction: "asc" }], columns, { locale: "en-US", getValue: () => { throw new Error("Accessor failed"); } })).toThrow("Accessor failed");
  });
});
