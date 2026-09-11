import { describe, expect, it } from "vitest";
import { assessServerPage, getPageRange, paginateClientRows, parsePagination, resetPagination, resizePagination, resolvePagination } from "./pagination.ts";

describe("table pagination contract", () => {
  it("defaults only the client to continuous display", () => {
    expect(resolvePagination("client")).toBe(false);
    expect(resolvePagination("server", false)).toBe(false);
    expect(() => resolvePagination("server")).toThrow("explicit pagination");
  });
  it("rejects malformed state and copies caller state immutably", () => {
    for (const value of [null, true, [], {}, { pageIndex: -1, pageSize: 10 }, { pageIndex: 0, pageSize: 0 }, { pageIndex: 0.1, pageSize: 2 }, { pageIndex: 0, pageSize: Infinity }, { pageIndex: 0, pageSize: 2, cursor: "x" }]) expect(() => parsePagination(value)).toThrow();
    const value = { pageIndex: 3, pageSize: 10 };
    const parsed = parsePagination(value);
    value.pageIndex = 5;
    expect(parsed).toEqual({ pageIndex: 3, pageSize: 10 });
    expect(Object.isFrozen(parsed)).toBe(true);
  });
  it("resets filter/sort and page-size changes without mutating inputs", () => {
    const state = { pageIndex: 9, pageSize: 10 };
    expect(resetPagination(state)).toEqual({ pageIndex: 0, pageSize: 10 });
    expect(resetPagination(false)).toBe(false);
    expect(resizePagination(state, 25)).toEqual({ pageIndex: 0, pageSize: 25 });
    expect(() => resizePagination(state, 0)).toThrow("positive");
    expect(state.pageIndex).toBe(9);
  });
  it("slices client results while preserving row identity and continuous array identity", () => {
    const rows = Array.from({ length: 23 }, (_, id) => ({ id }));
    expect(paginateClientRows(rows).rows).toBe(rows);
    const last = paginateClientRows(rows, { pageIndex: 9, pageSize: 10 });
    expect(last.pagination).toEqual({ pageIndex: 2, pageSize: 10 });
    expect(last.total).toBe(23);
    expect(last.rows).toEqual(rows.slice(20));
    expect(last.rows[0]).toBe(rows[20]);
    expect(getPageRange({ pageIndex: 9, pageSize: 10 }, 0)).toEqual({ pageIndex: 0, pageSize: 10, pageCount: 0, start: 0, end: 0 });
  });
  it("keeps large offsets safe by clamping before multiplication", () => {
    const range = getPageRange({ pageIndex: Number.MAX_SAFE_INTEGER, pageSize: Number.MAX_SAFE_INTEGER }, 23);
    expect(range).toMatchObject({ pageIndex: 0, start: 0, end: 23 });
    expect(() => getPageRange({ pageIndex: 0, pageSize: 10 }, NaN)).toThrow("total");
  });
  it("rejects truncated continuous server data", () => {
    expect(() => assessServerPage(false, { rows: [1], total: 2 })).toThrow("complete");
    expect(assessServerPage(false, { rows: [1], total: 1 }).kind).toBe("accepted");
  });
  it("validates exact server page lengths including the partial last page", () => {
    expect(assessServerPage({ pageIndex: 1, pageSize: 2 }, { rows: [3], total: 3 }).kind).toBe("accepted");
    expect(() => assessServerPage({ pageIndex: 0, pageSize: 2 }, { rows: [1], total: 3 })).toThrow("row count");
    expect(() => assessServerPage({ pageIndex: 1, pageSize: 2 }, { rows: [3, 4], total: 3 })).toThrow("row count");
  });
  it("requests only the clamped valid page after deletions and settles empty results without a loop", () => {
    expect(assessServerPage({ pageIndex: 8, pageSize: 10 }, { rows: [], total: 23 })).toEqual({ kind: "refetch", pagination: { pageIndex: 2, pageSize: 10 }, total: 23 });
    expect(assessServerPage({ pageIndex: 8, pageSize: 10 }, { rows: [], total: 0 })).toMatchObject({ kind: "accepted", pagination: { pageIndex: 0, pageSize: 10 } });
    expect(() => assessServerPage({ pageIndex: 8, pageSize: 10 }, { rows: [1], total: 23 })).toThrow("Out-of-range");
  });
});
