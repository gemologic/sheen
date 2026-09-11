import { describe, expect, it } from "vitest";
import { deserializeState, parseTableState, serializeState } from "./table-state.ts";
import type { TableState, TableStateSchema } from "./table-state.ts";

const schema: TableStateSchema = { columns: ["name", "amount"], filterColumns: [{ id: "name", type: "text" }], sortColumns: [{ id: "amount", type: "number" }] };
const state: TableState = {
  search: "日本語 + & # 😀", filter: { kind: "not", child: { kind: "empty", column: "name" } },
  sorting: [{ column: "amount", direction: "desc" }], pagination: { pageIndex: 3, pageSize: 50 },
  columns: [{ id: "amount", visible: false, width: 123.5, pin: "end" }, { id: "name", visible: true, width: null, pin: "start" }],
};

describe("versioned table state", () => {
  it("round trips complete query and column layout through a URL parameter", () => {
    const serialized = serializeState(state, schema);
    const parameters = new URLSearchParams({ table: serialized });
    expect(deserializeState(parameters.get("table") ?? "", schema)).toEqual(state);
    expect(serializeState(deserializeState(serialized, schema), schema)).toBe(serialized);
  });
  it("copies and freezes nested state while retaining explicit hidden/pinned/width settings", () => {
    const parsed = parseTableState(state, schema);
    expect(parsed).toEqual(state);
    expect(parsed).not.toBe(state);
    expect(parsed.columns).not.toBe(state.columns);
    expect(parsed.columns[0]).not.toBe(state.columns[0]);
    for (const value of [parsed, parsed.columns, parsed.columns[0], parsed.filter, parsed.sorting, parsed.pagination]) expect(Object.isFrozen(value)).toBe(true);
  });
  it("rejects missing, duplicate, unknown, and malformed column states", () => {
    const first = { id: "name", visible: true, width: null, pin: false };
    const second = { id: "amount", visible: true, width: null, pin: false };
    for (const columns of [[], [first, first], [first, { ...second, id: "unknown" }], Array(2), [first, { ...second, visible: "yes" }], [first, { ...second, width: 0 }], [first, { ...second, width: Infinity }], [first, { ...second, pin: "left" }], [first, { ...second, extra: true }], [first, { id: "amount" }]]) expect(() => parseTableState({ ...state, columns }, schema)).toThrow();
    expect(() => parseTableState({ ...state, extra: true }, schema)).toThrow("unknown field");
    expect(() => parseTableState(state, { ...schema, columns: ["name"] })).toThrow("unavailable table column");
    expect(() => parseTableState(state, { ...schema, columns: ["name", "name"] })).toThrow("duplicate");
  });
  it("rejects unknown versions, malformed envelopes, and size violations in both directions", () => {
    for (const value of ["{", "null", "[]", "{}", JSON.stringify({ version: 2, state }), JSON.stringify({ version: 1, state, extra: true })]) expect(() => deserializeState(value, schema)).toThrow();
    expect(() => deserializeState(" ".repeat(262145), schema)).toThrow("exceeds");
    expect(() => serializeState({ ...state, search: "x".repeat(262144) }, schema)).toThrow("exceeds");
  });
  it("restores continuous mode and validates filter/sort references before applying layout", () => {
    expect(deserializeState(serializeState({ ...state, pagination: false }, schema), schema).pagination).toBe(false);
    expect(() => parseTableState({ ...state, filter: { kind: "empty", column: "missing" } }, schema)).toThrow();
    expect(() => parseTableState({ ...state, sorting: [{ column: "name", direction: "asc" }] }, schema)).toThrow();
  });
});
