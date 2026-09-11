import { describe, expect, it } from "vitest";
import { createTableSelection } from "./selection.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";

const columns: readonly FilterColumn[] = [{ id: "status", type: "enum", options: ["open", "closed"] }];
const filter: FilterNode = { kind: "enum", column: "status", operator: "in", values: ["open"] };

describe("table selection ownership", () => {
  it("retains explicit IDs across unloaded pages but only adds loaded IDs", () => {
    const selection = createTableSelection(filter, columns);
    selection.setLoadedIds(["a", "b"]);
    selection.setSelected("a", true);
    selection.setLoadedIds(["c", "d"]);
    selection.selectLoaded();
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: ["a", "c", "d"] });
    expect(selection.isSelected("a")).toBe(true);
    expect(() => selection.setSelected("unknown", true)).toThrow("loaded matching row");
    selection.selectLoaded(false);
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: ["a"] });
  });
  it("captures select-all as a query and retains exclusions across pages", () => {
    const selection = createTableSelection(filter, columns);
    selection.setLoadedIds(["a", "b"]);
    selection.selectAllMatching();
    selection.setSelected("b", false);
    const first = selection.getPayload();
    selection.setLoadedIds(["c"]);
    expect(selection.isSelected("c")).toBe(true);
    expect(selection.isSelected("unknown")).toBe(false);
    selection.setSelected("c", false);
    expect(selection.getPayload()).toEqual({ kind: "query", filter, excluded: ["b", "c"] });
    expect(first).toEqual({ kind: "query", filter, excluded: ["b"] });
    selection.setLoadedIds(["b"]);
    selection.selectLoaded();
    expect(selection.getPayload()).toEqual({ kind: "query", filter, excluded: ["c"] });
  });
  it("copies and freezes bulk-action snapshots", () => {
    const values = ["open"];
    const selection = createTableSelection({ kind: "enum", column: "status", operator: "in", values }, columns);
    values.push("closed");
    selection.selectAllMatching();
    const payload = selection.getPayload();
    expect(payload).toEqual({ kind: "query", filter, excluded: [] });
    expect(Object.isFrozen(payload)).toBe(true);
    if (payload.kind === "query") { expect(Object.isFrozen(payload.filter)).toBe(true); expect(Object.isFrozen(payload.excluded)).toBe(true); }
    selection.clear();
    const explicit = selection.getPayload();
    if (explicit.kind === "ids") expect(Object.isFrozen(explicit.ids)).toBe(true);
  });
  it("clears eligibility and selection for changed filters but preserves identical filters", () => {
    const selection = createTableSelection(filter, columns);
    selection.setLoadedIds(["a"]);
    selection.selectLoaded();
    selection.setFilter({ kind: "enum", column: "status", operator: "in", values: ["open"] });
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: ["a"] });
    selection.setFilter({ kind: "enum", column: "status", operator: "in", values: ["closed"] });
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: [] });
    expect(() => selection.setSelected("a", true)).toThrow();
  });
  it("validates updates atomically and resets on permission boundaries", () => {
    const selection = createTableSelection(filter, columns);
    selection.setLoadedIds(["a"]);
    for (const ids of [["a", "a"], [""], Array<string>(1)]) expect(() => selection.setLoadedIds(ids)).toThrow();
    selection.setSelected("a", true);
    expect(() => selection.setFilter({ kind: "empty", column: "missing" })).toThrow();
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: ["a"] });
    selection.reset();
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: [] });
    expect(() => selection.setSelected("a", true)).toThrow();
  });
  it("selects inclusive ranges in loaded view order and rejects unloaded endpoints atomically", () => {
    const selection = createTableSelection(filter, columns);
    selection.setLoadedIds(["d", "b", "a", "c"]);
    selection.selectRange("a", "d");
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: ["d", "b", "a"] });
    expect(() => selection.selectRange("b", "missing", false)).toThrow("endpoints");
    expect(selection.getPayload()).toEqual({ kind: "ids", ids: ["d", "b", "a"] });
    selection.selectAllMatching();
    selection.selectRange("b", "c", false);
    expect(selection.getPayload()).toEqual({ kind: "query", filter, excluded: ["b", "a", "c"] });
  });
});
