import { describe, expect, it } from "vitest";
import { changeClientViewState, parseClientViewState } from "./client-state.ts";
import type { ClientStateChange, ClientStateSchema } from "./client-state.ts";
import type { ClientViewState } from "./client-view.ts";

const schema: ClientStateSchema = { filterColumns: [{ id: "name", type: "text" }], sortColumns: [{ id: "name", type: "text" }] };
const state: ClientViewState = { search: "", filter: { kind: "and", children: [] }, sorting: [], pagination: { pageIndex: 4, pageSize: 20 } };

describe("client query state", () => {
  it("validates complete query fragments and makes deeply immutable copies", () => {
    const copy = parseClientViewState(state, schema);
    expect(copy).toEqual(state);
    expect(copy).not.toBe(state);
    expect(copy.filter).not.toBe(state.filter);
    expect(copy.sorting).not.toBe(state.sorting);
    expect(copy.pagination).not.toBe(state.pagination);
    for (const value of [copy, copy.filter, copy.sorting, copy.pagination]) expect(Object.isFrozen(value)).toBe(true);
    expect(parseClientViewState(JSON.parse(JSON.stringify(copy)), schema)).toEqual(copy);
  });
  it("rejects malformed, incomplete, unknown, and schema-invalid state", () => {
    for (const value of [null, [], {}, { ...state, search: 1 }, { ...state, unexpected: true }, { ...state, pagination: undefined }, { ...state, filter: { kind: "empty", column: "unknown" } }, { ...state, sorting: [{ column: "unknown", direction: "asc" }] }]) expect(() => parseClientViewState(value, schema)).toThrow();
  });
  it("resets page zero for search/filter/sort changes and preserves continuous mode", () => {
    const changes: readonly ClientStateChange[] = [
      { kind: "search", value: "new query" },
      { kind: "filter", value: { kind: "empty", column: "name" } },
      { kind: "sorting", value: [{ column: "name", direction: "desc" }] },
    ];
    for (const change of changes) {
      expect(changeClientViewState(state, change, schema).pagination).toEqual({ pageIndex: 0, pageSize: 20 });
      expect(changeClientViewState({ ...state, pagination: false }, change, schema).pagination).toBe(false);
    }
    expect(state.pagination).toEqual({ pageIndex: 4, pageSize: 20 });
  });
  it("supports explicit page/mode changes and resets on a validated page-size change", () => {
    expect(changeClientViewState(state, { kind: "pagination", value: { pageIndex: 2, pageSize: 20 } }, schema).pagination).toEqual({ pageIndex: 2, pageSize: 20 });
    expect(changeClientViewState(state, { kind: "pagination", value: false }, schema).pagination).toBe(false);
    expect(changeClientViewState(state, { kind: "pageSize", value: 50 }, schema).pagination).toEqual({ pageIndex: 0, pageSize: 50 });
    expect(changeClientViewState(state, { kind: "pagination", value: { pageIndex: 4, pageSize: 50 } }, schema).pagination).toEqual({ pageIndex: 0, pageSize: 50 });
    expect(() => changeClientViewState(state, { kind: "pageSize", value: 0 }, schema)).toThrow();
    expect(() => changeClientViewState({ ...state, pagination: false }, { kind: "pageSize", value: 50 }, schema)).toThrow();
  });
});
