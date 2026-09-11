import { describe, expect, it } from "vitest";
import { compileFilter } from "./filter-client.ts";
import { deserializeFilter, serializeFilter } from "./filter.ts";
import type { FilterNode } from "./filter.ts";
import {
  appendQueryChild,
  defaultQueryRule,
  moveQueryNode,
  queryBuilderFilterColumns,
  queryNodeAt,
  removeQueryNode,
  replaceQueryNode,
  toggleQueryNegation,
} from "./query-builder-state.ts";
import type { QueryBuilderColumn } from "./query-builder-state.ts";

const columns = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["active", "paused"] },
  { id: "balance", label: "Balance", type: "number" },
  { id: "created", label: "Created", type: "date" },
] satisfies readonly QueryBuilderColumn[];
const schema = queryBuilderFilterColumns(columns);
const initial: FilterNode = Object.freeze({ kind: "and", children: Object.freeze([
  Object.freeze({ kind: "text", column: "name", operator: "contains", value: "acme", caseSensitive: false }),
]) });

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected fixture value");
  return value;
}

describe("query builder state", () => {
  it("edits nested rules immutably and preserves deterministic serialization", () => {
    const withStatus = appendQueryChild(initial, [], defaultQueryRule(required(columns[1])), schema);
    const moved = moveQueryNode(withStatus, [1], -1, schema);
    const negated = toggleQueryNegation(moved, [0], schema);
    const replaced = replaceQueryNode(negated, [1], { kind: "text", column: "name", operator: "startsWith", value: "A", caseSensitive: true }, schema);
    const serialized = serializeFilter(replaced, schema);

    expect(initial.children).toHaveLength(1);
    expect(queryNodeAt(replaced, [0])).toEqual({ kind: "not", child: { kind: "enum", column: "status", operator: "in", values: ["active"] } });
    expect(deserializeFilter(serialized, schema)).toEqual(replaced);
    expect(serializeFilter(deserializeFilter(serialized, schema), schema)).toBe(serialized);
    expect(removeQueryNode(replaced, [0], schema)).toEqual({ kind: "and", children: [{ kind: "text", column: "name", operator: "startsWith", value: "A", caseSensitive: true }] });
  });

  it("produces filters accepted by the client table evaluator", () => {
    const query: FilterNode = { kind: "and", children: [
      { kind: "enum", column: "status", operator: "in", values: ["active"] },
      { kind: "number", column: "balance", operator: "gte", value: 100 },
    ] };
    const evaluate = compileFilter<{ readonly name: string; readonly status: string; readonly balance: number; readonly created: number }>(query, schema, {
      locale: "en-US",
      getValue: (row, column) => column === "name" ? row.name : column === "status" ? row.status : column === "balance" ? row.balance : row.created,
    });
    expect(evaluate({ name: "Acme", status: "active", balance: 120, created: Date.UTC(2026, 0, 1) })).toBe(true);
    expect(evaluate({ name: "Beta", status: "paused", balance: 200, created: Date.UTC(2026, 0, 1) })).toBe(false);
  });

  it("rejects invalid schemas, paths, roots, and enum options", () => {
    expect(() => queryBuilderFilterColumns([{ id: "name", label: "Name", type: "text" }, { id: "name", label: "Again", type: "number" }])).toThrow("unique");
    expect(() => queryBuilderFilterColumns([{ id: "status", label: "Status", type: "enum", options: [] }])).toThrow("options");
    expect(() => queryNodeAt(initial, [4])).toThrow("outside");
    expect(() => removeQueryNode(initial, [], schema)).toThrow("root");
    expect(() => appendQueryChild(required(initial.children[0]), [], defaultQueryRule(required(columns[0])), schema)).toThrow("only to a group");
  });
});
