import { describe, expect, it } from "vitest";
import { appendFilterCondition, listFilterConditions, removeFilterColumnConditions, removeFilterCondition, replaceFilterCondition } from "./filter-bar-state.ts";
import type { FilterNode } from "./filter.ts";

const text = Object.freeze({ kind: "text", column: "name", operator: "contains", value: "alpha", caseSensitive: false }) satisfies FilterNode;
const amount = Object.freeze({ kind: "number", column: "amount", operator: "gte", value: 10 }) satisfies FilterNode;
const status = Object.freeze({ kind: "enum", column: "status", operator: "in", values: Object.freeze(["open"]) }) satisfies FilterNode;

describe("FilterBar expression edits", () => {
  it("lists direct and inherited negation without flattening nested logic", () => {
    const filter: FilterNode = { kind: "not", child: { kind: "or", children: [text, { kind: "not", child: amount }] } };
    const entries = listFilterConditions(filter);
    expect(entries).toEqual([
      { path: ["child", 0], condition: text, directNegated: false, inheritedNegated: true, groups: ["or"] },
      { path: ["child", 1], condition: amount, directNegated: true, inheritedNegated: true, groups: ["or"] },
    ]);
    expect(Object.isFrozen(entries)).toBe(true);
    expect(Object.isFrozen(entries[0]?.path)).toBe(true);
  });

  it("replaces a direct negated condition while preserving sibling identity and groups", () => {
    const filter: FilterNode = { kind: "and", children: [text, { kind: "not", child: amount }, status] };
    const next = replaceFilterCondition(filter, [1], { ...amount, value: 25 }, false);
    expect(next).toEqual({ kind: "and", children: [text, { ...amount, value: 25 }, status] });
    if (next.kind !== "and") throw new Error("Expected conjunction");
    expect(next.children[0]).toBe(text);
    expect(next.children[2]).toBe(status);
  });

  it("removes leaves and simplifies groups without leaving placeholder breadcrumbs", () => {
    const filter: FilterNode = { kind: "and", children: [text, { kind: "or", children: [amount, status] }] };
    const withoutAmount = removeFilterCondition(filter, [1, 0]);
    expect(withoutAmount).toEqual({ kind: "and", children: [text, status] });
    expect(removeFilterCondition(withoutAmount, [0])).toBe(status);
    expect(removeFilterCondition(status, [])).toEqual({ kind: "and", children: [] });
  });

  it("appends to a root conjunction and wraps other expressions intact", () => {
    const conjunction: FilterNode = { kind: "and", children: [text] };
    const appended = appendFilterCondition(conjunction, amount);
    expect(appended).toEqual({ kind: "and", children: [text, amount] });
    if (appended.kind !== "and") throw new Error("Expected conjunction");
    expect(appended.children[0]).toBe(text);
    expect(appendFilterCondition(status, amount)).toEqual({ kind: "and", children: [status, amount] });
  });

  it("rejects paths that no longer match the accepted expression", () => {
    expect(() => replaceFilterCondition(text, [0], amount, false)).toThrow("path");
    expect(() => removeFilterCondition({ kind: "not", child: text }, [0])).toThrow("path");
  });

  it("removes one facet column while preserving nested constraints on other columns", () => {
    const filter: FilterNode = { kind: "and", children: [status, { kind: "not", child: { kind: "or", children: [text, amount] } }] };
    expect(removeFilterColumnConditions(filter, "status")).toEqual({ kind: "not", child: { kind: "or", children: [text, amount] } });
    expect(removeFilterColumnConditions(filter, "name")).toEqual({ kind: "and", children: [status, { kind: "not", child: amount }] });
    expect(removeFilterColumnConditions(status, "status")).toEqual({ kind: "and", children: [] });
    expect(removeFilterColumnConditions(filter, "missing")).toBe(filter);
    expect(() => removeFilterColumnConditions(filter, "")).toThrow("nonempty");
  });
});
