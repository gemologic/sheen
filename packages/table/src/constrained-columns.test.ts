import { describe, expect, it } from "vitest";
import { constrainedColumnValues, summarizedColumns } from "./constrained-columns.ts";
import type { FilterNode } from "./filter.ts";
import type { ColumnState } from "./table-state.ts";

const active: FilterNode = { kind: "enum", column: "status", operator: "in", values: ["Active"] };
const paused: FilterNode = { ...active, values: ["Paused"] };
const region: FilterNode = { kind: "text", column: "region", operator: "eq", value: "US East", caseSensitive: true };

describe("accepted constrained columns", () => {
  it("requires an exact constraint, including exact text case", () => {
    expect([...constrainedColumnValues({ kind: "and", children: [active, region] }).keys()]).toEqual(["status", "region"]);
    for (const filter of [
      { ...region, caseSensitive: false },
      { ...region, operator: "contains" },
      { ...active, values: ["Active", "Paused"] },
      { kind: "not", child: paused },
      { kind: "empty", column: "status" },
      { kind: "and", children: [] },
    ] satisfies readonly FilterNode[]) expect(constrainedColumnValues(filter).size).toBe(0);
  });

  it("intersects disjunctions and refuses contradictory conjunctions", () => {
    expect([...constrainedColumnValues({ kind: "or", children: [{ kind: "and", children: [active, region] }, active] }).keys()]).toEqual(["status"]);
    expect(constrainedColumnValues({ kind: "or", children: [active, paused] }).size).toBe(0);
    expect(constrainedColumnValues({ kind: "or", children: [active, { kind: "and", children: [] }] }).size).toBe(0);
    expect(constrainedColumnValues({ kind: "and", children: [active, paused, active] }).size).toBe(0);
    expect(constrainedColumnValues({ kind: "or", children: [] }).size).toBe(0);
  });

  it("retains zero and exact dates without inferring from numeric ranges", () => {
    const count: FilterNode = { kind: "number", column: "count", operator: "eq", value: 0 };
    const date: FilterNode = { kind: "date", column: "created", operator: "eq", value: 1_700_000_000_000 };
    expect([...constrainedColumnValues({ kind: "and", children: [count, date] }).values()]).toEqual([
      { column: "count", kind: "number", value: 0 }, { column: "created", kind: "date", value: 1_700_000_000_000 },
    ]);
    expect(constrainedColumnValues({ ...count, operator: "gte" }).size).toBe(0);
  });

  it("preserves saved layout and explicit restoration, and never removes the last field", () => {
    const columns: readonly ColumnState[] = Object.freeze([
      Object.freeze({ id: "region", visible: true, width: 160, pin: "start" }),
      Object.freeze({ id: "status", visible: true, width: 120, pin: false }),
    ]);
    const before = JSON.stringify(columns);
    const constraints = constrainedColumnValues({ kind: "and", children: [region, active] });
    const eligible = new Set(["region", "status"]);
    expect(summarizedColumns(columns, constraints, eligible, new Set()).map(item => item.column)).toEqual(["status"]);
    expect(summarizedColumns(columns, constraints, eligible, new Set(["status"]))).toEqual([]);
    expect(summarizedColumns(columns, constraints, eligible, new Set(["status", "region"]))).toEqual([]);
    expect(summarizedColumns([{ id: "status", visible: false, width: 120, pin: false }], constraints, eligible, new Set())).toEqual([]);
    expect(JSON.stringify(columns)).toBe(before);
  });
});
