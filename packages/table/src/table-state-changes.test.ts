import { describe, expect, it } from "vitest";
import { changeTableState } from "./table-state-changes.ts";
import type { TableStateChange } from "./table-state-changes.ts";
import type { TableState, TableStateSchema } from "./table-state.ts";

const schema: TableStateSchema = { columns: ["name", "amount"], filterColumns: [{ id: "name", type: "text" }], sortColumns: [{ id: "name", type: "text" }, { id: "amount", type: "number" }] };
const state: TableState = { search: "query", filter: { kind: "and", children: [] }, sorting: [], pagination: { pageIndex: 4, pageSize: 20 }, columns: [{ id: "name", visible: true, width: 150, pin: "start" }, { id: "amount", visible: true, width: null, pin: false }] };

describe("table state changes", () => {
  it("cycles ascending, descending, unsorted and resets the requested page", () => {
    const change: TableStateChange = { kind: "sortCycle", column: "amount", multiple: false };
    const asc = changeTableState(state, change, schema);
    expect(asc.sorting).toEqual([{ column: "amount", direction: "asc" }]);
    expect(asc.pagination).toEqual({ pageIndex: 0, pageSize: 20 });
    const desc = changeTableState(asc, change, schema);
    expect(desc.sorting).toEqual([{ column: "amount", direction: "desc" }]);
    expect(changeTableState(desc, change, schema).sorting).toEqual([]);
    expect(state.sorting).toEqual([]);
  });
  it("retains multi-sort priority when cycling and appends newly sorted columns", () => {
    const name = changeTableState(state, { kind: "sortCycle", column: "name", multiple: true }, schema);
    const both = changeTableState(name, { kind: "sortCycle", column: "amount", multiple: true }, schema);
    const desc = changeTableState(both, { kind: "sortCycle", column: "name", multiple: true }, schema);
    expect(desc.sorting).toEqual([{ column: "name", direction: "desc" }, { column: "amount", direction: "asc" }]);
    expect(changeTableState(desc, { kind: "sortCycle", column: "name", multiple: true }, schema).sorting).toEqual([{ column: "amount", direction: "asc" }]);
    expect(changeTableState(both, { kind: "sortCycle", column: "amount", multiple: false }, schema).sorting).toEqual([{ column: "amount", direction: "desc" }]);
    expect(() => changeTableState(state, { kind: "sortCycle", column: "unknown", multiple: true }, schema)).toThrow("does not support sorting");
  });
  it("reorders exact column permutations without losing layout settings", () => {
    const reordered = changeTableState(state, { kind: "columnOrder", ids: ["amount", "name"] }, schema);
    expect(reordered.columns).toEqual([state.columns[1], state.columns[0]]);
    expect(reordered.pagination).toEqual(state.pagination);
    for (const ids of [["name"], ["name", "name"], ["name", "unknown"], Array<string>(2)]) expect(() => changeTableState(state, { kind: "columnOrder", ids }, schema)).toThrow();
  });
  it("changes visibility, width and logical pin without changing query/page state", () => {
    const hidden = changeTableState(state, { kind: "columnVisibility", column: "name", visible: false }, schema);
    const sized = changeTableState(hidden, { kind: "columnWidth", column: "name", width: 200.5 }, schema);
    const pinned = changeTableState(sized, { kind: "columnPin", column: "name", pin: "end" }, schema);
    expect(pinned.columns[0]).toEqual({ id: "name", visible: false, width: 200.5, pin: "end" });
    expect(pinned.pagination).toEqual(state.pagination);
    expect(pinned.search).toBe("query");
    expect(changeTableState(pinned, { kind: "columnWidth", column: "name", width: null }, schema).columns[0]?.width).toBeNull();
    expect(() => changeTableState(state, { kind: "columnWidth", column: "name", width: -1 }, schema)).toThrow();
    expect(() => changeTableState(state, { kind: "columnPin", column: "unknown", pin: false }, schema)).toThrow("Unknown table column");
  });
  it("delegates query changes while preserving complete column layout", () => {
    const next = changeTableState(state, { kind: "query", change: { kind: "search", value: "new" } }, schema);
    expect(next.columns).toEqual(state.columns);
    expect(next.search).toBe("new");
    expect(next.pagination).toEqual({ pageIndex: 0, pageSize: 20 });
    expect(Object.isFrozen(next.columns)).toBe(true);
  });
});
