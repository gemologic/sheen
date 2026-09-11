import { describe, expect, it } from "vitest";
import { deserializeFilter, parseFilter, serializeFilter } from "./filter.ts";
import type { FilterColumn } from "./filter.ts";

const columns: readonly FilterColumn[] = [
  { id: "name", type: "text" }, { id: "amount", type: "number" },
  { id: "created", type: "date" }, { id: "status", type: "enum", options: ["open", "closed"] },
];

describe("versioned filter AST", () => {
  it("round-trips nested groups and negation through a URL parameter", () => {
    const filter = parseFilter({ kind: "and", children: [
      { kind: "text", column: "name", operator: "contains", value: 'Arabic عربي & emoji 💎 "quote"' },
      { kind: "not", child: { kind: "enum", column: "status", operator: "in", values: ["closed"] } },
      { kind: "or", children: [{ kind: "number", column: "amount", operator: "between", min: -10, max: 10 }, { kind: "date", column: "created", operator: "gte", value: 1720000000000 }] },
    ] }, columns);
    const params = new URLSearchParams({ filter: serializeFilter(filter, columns) });
    expect(deserializeFilter(params.get("filter") ?? "", columns)).toEqual(filter);
    expect(Object.isFrozen(filter)).toBe(true);
  });
  it("copies nested values and normalizes duplicate enum choices", () => {
    const values = ["open", "open"];
    const filter = parseFilter({ kind: "enum", column: "status", operator: "in", values }, columns);
    values.push("closed");
    expect(filter).toEqual({ kind: "enum", column: "status", operator: "in", values: ["open"] });
    if (filter.kind === "enum") expect(Object.isFrozen(filter.values)).toBe(true);
    const zero = parseFilter({ kind: "number", column: "amount", operator: "eq", value: -0 }, columns);
    expect(deserializeFilter(serializeFilter(zero, columns), columns)).toEqual(zero);
  });
  it("rejects unknown columns, options, operators, fields, and mismatched kinds", () => {
    for (const value of [
      { kind: "empty", column: "missing" },
      { kind: "number", column: "name", operator: "eq", value: 1 },
      { kind: "enum", column: "status", operator: "in", values: ["unknown"] },
      { kind: "text", column: "name", operator: "regex", value: ".*" },
      { kind: "empty", column: "name", ignored: true },
      { kind: "text", column: "name", operator: "eq", value: 3 },
    ]) expect(() => parseFilter(value, columns)).toThrow("Invalid filter");
  });
  it("rejects nonfinite numbers, reversed ranges, and invalid timestamps", () => {
    for (const value of [NaN, Infinity, -Infinity]) expect(() => parseFilter({ kind: "number", column: "amount", operator: "eq", value }, columns)).toThrow("finite");
    expect(() => parseFilter({ kind: "number", column: "amount", operator: "between", min: 2, max: 1 }, columns)).toThrow("minimum");
    expect(() => parseFilter({ kind: "date", column: "created", operator: "eq", value: 9e15 }, columns)).toThrow("timestamp");
  });
  it("rejects invalid JSON, unknown versions, and oversized payloads", () => {
    expect(() => deserializeFilter("{", columns)).toThrow("JSON");
    expect(() => deserializeFilter('{"version":2,"filter":{}}', columns)).toThrow("version");
    expect(() => deserializeFilter(" ".repeat(262145), columns)).toThrow("characters");
    const oversized = parseFilter({ kind: "text", column: "name", operator: "eq", value: "x".repeat(262144) }, columns);
    expect(() => serializeFilter(oversized, columns)).toThrow("characters");
  });
  it("bounds cycles, nesting, and node count with actionable paths", () => {
    const cycle: { kind: string; children: unknown[] } = { kind: "and", children: [] };
    cycle.children.push(cycle);
    expect(() => parseFilter(cycle, columns)).toThrow("64 levels");
    expect(() => parseFilter({ kind: "or", children: Array.from({ length: 4096 }, () => ({ kind: "empty", column: "name" })) }, columns)).toThrow("4096 nodes");
    expect(() => parseFilter({ kind: "and", children: [{ kind: "empty", column: "missing" }] }, columns)).toThrow("$.children[0]");
    expect(() => parseFilter({ kind: "and", children: new Array(1) }, columns)).toThrow("node object");
  });
  it("accepts empty logical groups and validates schema IDs", () => {
    expect(parseFilter({ kind: "and", children: [] }, columns)).toEqual({ kind: "and", children: [] });
    expect(() => parseFilter({ kind: "and", children: [] }, [{ id: "x", type: "text" }, { id: "x", type: "number" }])).toThrow("duplicate");
  });
  it("rejects sparse enum declarations even when no predicate references them", () => {
    const sparse: readonly FilterColumn[] = [{ id: "status", type: "enum", options: Array<string>(1) }];
    expect(() => parseFilter({ kind: "and", children: [] }, sparse)).toThrow("Invalid enum options");
  });
});
