import { describe, expect, it } from "vitest";
import { countClientFacets } from "./facets.ts";
import { filterClientRows } from "./filter-client.ts";
import type { FilterColumn } from "./filter.ts";
import { paginateClientRows } from "./pagination.ts";

const columns: readonly FilterColumn[] = [
  { id: "status", type: "enum", options: ["open", "closed", "archived"] },
  { id: "amount", type: "number" },
];
type Row = { readonly status?: unknown; readonly amount?: number };
const options = { getValue: (row: Row, column: string) => column === "status" ? row.status : row.amount };

describe("client facets", () => {
  it("counts enum rows, preserves declared order, and includes zero options and missing values", () => {
    const result = countClientFacets([{ status: "closed" }, { status: "open" }, { status: "open" }, {}, { status: null }], columns, options);
    expect(result).toEqual([{ column: "status", options: [{ value: "open", count: 2 }, { value: "closed", count: 1 }, { value: "archived", count: 0 }], missing: 2 }]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
    expect(Object.isFrozen(result[0]?.options)).toBe(true);
    expect(Object.isFrozen(result[0]?.options[0])).toBe(true);
  });
  it("counts all filtered rows before slicing a page", () => {
    const rows = [{ status: "open", amount: 1 }, { status: "open", amount: 2 }, { status: "closed", amount: 3 }, { status: "closed", amount: 4 }];
    const filtered = filterClientRows(rows, { kind: "number", column: "amount", operator: "gte", value: 2 }, columns, { ...options, locale: "en-US" });
    expect(paginateClientRows(filtered, { pageIndex: 0, pageSize: 1 }).rows).toHaveLength(1);
    expect(countClientFacets(filtered, columns, options)[0]?.options).toEqual([{ value: "open", count: 1 }, { value: "closed", count: 2 }, { value: "archived", count: 0 }]);
  });
  it("returns zero counts for empty results without reading accessors", () => {
    expect(countClientFacets([], columns, { getValue: () => { throw new Error("No rows"); } })[0]?.options.every(option => option.count === 0)).toBe(true);
    expect(countClientFacets([{ amount: 1 }], [{ id: "amount", type: "number" }], { getValue: () => { throw new Error("No enum columns"); } })).toEqual([]);
  });
  it("deduplicates declared options and safely counts special property names", () => {
    const schema: readonly FilterColumn[] = [{ id: "status", type: "enum", options: ["__proto__", "constructor", "", "__proto__"] }];
    expect(countClientFacets([{ status: "__proto__" }, { status: "constructor" }, { status: "" }], schema, options)[0]?.options).toEqual([{ value: "__proto__", count: 1 }, { value: "constructor", count: 1 }, { value: "", count: 1 }]);
  });
  it("rejects invalid data/schema and propagates accessor errors", () => {
    for (const status of ["unknown", "Open", "", 1, false, ["open"]]) expect(() => countClientFacets([{ status }], columns, options)).toThrow("Invalid enum value");
    expect(() => countClientFacets([], [...columns, ...columns], options)).toThrow("duplicate facet column");
    expect(() => countClientFacets([], [{ id: "", type: "enum", options: [] }], options)).toThrow();
    expect(() => countClientFacets([{}], columns, { getValue: () => { throw new Error("Accessor error"); } })).toThrow("Accessor error");
    expect(() => countClientFacets(Array<Row>(1), columns, options)).toThrow("Missing facet row");
  });
  it("counts a heavy view without changing row-major accessor order", () => {
    const rows = Array.from({ length: 12_000 }, (_, index) => ({ status: index % 3 === 0 ? "closed" : "open", region: index % 2 === 0 ? "east" : "west" }));
    const schema: readonly FilterColumn[] = [...columns, { id: "region", type: "enum", options: ["east", "west"] }];
    let calls = 0;
    const result = countClientFacets(rows, schema, { getValue: (row, column) => {
      expect(column).toBe(calls % 2 === 0 ? "status" : "region");
      expect(row).toBe(rows[Math.floor(calls / 2)]);
      calls++;
      return column === "status" ? row.status : row.region;
    } });
    expect(calls).toBe(24_000);
    expect(result).toEqual([
      { column: "status", options: [{ value: "open", count: 8_000 }, { value: "closed", count: 4_000 }, { value: "archived", count: 0 }], missing: 0 },
      { column: "region", options: [{ value: "east", count: 6_000 }, { value: "west", count: 6_000 }], missing: 0 },
    ]);
  });
});
