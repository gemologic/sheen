import { describe, expect, it } from "vitest";
import { createClientView } from "./client-view.ts";
import type { ClientViewOptions, ClientViewState } from "./client-view.ts";

interface Row { readonly name: string; readonly status: string; readonly segment: string; readonly amount: number }
const rows: readonly Row[] = [
  { name: "Alpha second", status: "open", segment: "retail", amount: 2 },
  { name: "Alpha", status: "closed", segment: "enterprise", amount: 1 },
  { name: "Beta", status: "open", segment: "enterprise", amount: 10 },
  { name: "Alpha third", status: "open", segment: "retail", amount: 3 },
];
const options: ClientViewOptions<Row> = {
  locale: "en-US", searchColumns: ["name"],
  filterColumns: [{ id: "status", type: "enum", options: ["open", "closed", "archived"] }, { id: "segment", type: "enum", options: ["retail", "enterprise"] }, { id: "amount", type: "number" }],
  sortColumns: [{ id: "amount", type: "number" }],
  getValue: (row, column) => column === "name" ? row.name : column === "status" ? row.status : column === "segment" ? row.segment : row.amount,
};
const state: ClientViewState = { search: "alpha", filter: { kind: "and", children: [] }, sorting: [], pagination: { pageIndex: 0, pageSize: 1 } };

describe("complete client view", () => {
  it("ranks, filters, counts facets, sorts, and pages in the specified order", () => {
    const result = createClientView(rows, {
      ...state,
      filter: { kind: "number", column: "amount", operator: "gte", value: 2 },
      sorting: [{ column: "amount", direction: "desc" }],
    }, options);
    expect(result.total).toBe(2);
    expect(result.view).toEqual([rows[3], rows[0]]);
    expect(result.rows).toEqual([rows[3]]);
    expect(result.rows[0]).toBe(rows[3]);
    expect(result.facets[0]?.options).toEqual([{ value: "open", count: 2 }, { value: "closed", count: 0 }, { value: "archived", count: 0 }]);
    expect(result.facets[1]?.options).toEqual([{ value: "retail", count: 2 }, { value: "enterprise", count: 0 }]);
    expect(rows[0]?.name).toBe("Alpha second");
  });

  it("counts each enum facet with its own condition removed but every other condition retained", () => {
    const result = createClientView(rows, {
      ...state,
      search: "",
      filter: { kind: "and", children: [
        { kind: "enum", column: "status", operator: "in", values: ["open"] },
        { kind: "number", column: "amount", operator: "gte", value: 1 },
      ] },
      pagination: false,
    }, options);
    expect(result.rows.map(row => row.name)).toEqual(["Alpha second", "Beta", "Alpha third"]);
    expect(result.facets[0]?.options).toEqual([{ value: "open", count: 3 }, { value: "closed", count: 1 }, { value: "archived", count: 0 }]);
    expect(result.facets[1]?.options).toEqual([{ value: "retail", count: 2 }, { value: "enterprise", count: 1 }]);
  });
  it("keeps relevance order without explicit sort and uses it for equal-key ties", () => {
    expect(createClientView(rows, state, options).view).toEqual([rows[1], rows[0], rows[3]]);
    const tied = rows.map(row => ({ ...row, amount: 1 }));
    expect(createClientView(tied, { ...state, sorting: [{ column: "amount", direction: "asc" }] }, options).view).toEqual([tied[1], tied[0], tied[3]]);
  });
  it("applies literal-phrase global search before typed filters when enabled", () => {
    const result = createClientView(rows, { ...state, search: "'Alpha", pagination: false }, { ...options, exactMatch: true });
    expect(result.rows).toEqual([rows[0], rows[1], rows[3]]);
    expect(result.total).toBe(3);
  });
  it("returns the complete view in continuous mode and clamps invalidated pages without mutating state", () => {
    const continuous = createClientView(rows, { ...state, pagination: false }, options);
    expect(continuous.rows).toBe(continuous.view);
    const lastState = { ...state, pagination: { pageIndex: 100, pageSize: 2 } };
    expect(createClientView(rows, lastState, options).rows).toEqual([rows[3]]);
    expect(createClientView(rows, lastState, options).pagination).toEqual({ pageIndex: 1, pageSize: 2 });
    expect(lastState.pagination.pageIndex).toBe(100);
    const empty = createClientView(rows, { ...lastState, search: "not-found" }, options);
    expect(empty.total).toBe(0);
    expect(empty.pagination).toEqual({ pageIndex: 0, pageSize: 2 });
    expect(empty.rows).toEqual([]);
    expect(empty.facets[0]?.options.every(option => option.count === 0)).toBe(true);
  });
  it("retains the supplied row array when no client transform is active", () => {
    const result = createClientView(rows, { ...state, search: "", sorting: [], pagination: false }, { ...options, filterColumns: [], sortColumns: [] });
    expect(result.view).toBe(rows);
    expect(result.rows).toBe(rows);
  });
  it("fails invalid state instead of returning a partially computed view", () => {
    expect(() => createClientView(rows, { ...state, pagination: { pageIndex: 0, pageSize: 0 } }, options)).toThrow();
    expect(() => createClientView(rows, { ...state, filter: { kind: "empty", column: "unknown" } }, options)).toThrow();
    expect(() => createClientView(rows, { ...state, sorting: [{ column: "unknown", direction: "asc" }] }, options)).toThrow();
  });
});
