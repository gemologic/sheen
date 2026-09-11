import { describe, expect, it } from "vitest";
import { compileFilter, filterClientRows } from "./filter-client.ts";
import { parseFilter } from "./filter.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { paginateClientRows } from "./pagination.ts";

type Row = Record<string, unknown>;
const columns: readonly FilterColumn[] = [{ id: "text", type: "text" }, { id: "amount", type: "number" }, { id: "time", type: "date" }, { id: "status", type: "enum", options: ["open", "closed"] }];
const options = { locale: "en-US", getValue: (row: Row, column: string) => row[column] };
const predicate = (value: unknown) => compileFilter(parseFilter(value, columns), columns, options);

describe("compiled client filters", () => {
  it("evaluates groups and negation with explicit empty-group identities", () => {
    expect(predicate({ kind: "and", children: [] })({})).toBe(true);
    expect(predicate({ kind: "or", children: [] })({})).toBe(false);
    const test = predicate({ kind: "and", children: [
      { kind: "number", column: "amount", operator: "gte", value: 5 },
      { kind: "not", child: { kind: "enum", column: "status", operator: "in", values: ["closed"] } },
    ] });
    expect(test({ amount: 5, status: "open" })).toBe(true);
    expect(test({ amount: 5, status: "closed" })).toBe(false);
  });
  it("short-circuits and compiles a stable copy of caller filter data", () => {
    const filter = { kind: "text", column: "text", operator: "eq", value: "original", caseSensitive: true } satisfies FilterNode;
    const test = compileFilter(filter, columns, options);
    filter.value = "changed";
    expect(test({ text: "original" })).toBe(true);
    let reads = 0;
    const short = compileFilter<Row>({ kind: "or", children: [{ kind: "and", children: [] }, { kind: "empty", column: "text" }] }, columns, { locale: "en-US", getValue: () => { reads++; return null; } });
    expect(short({})).toBe(true);
    expect(reads).toBe(0);
  });
  it("uses explicit Turkish casing, NFC normalization, and no accent stripping", () => {
    const filter = parseFilter({ kind: "text", column: "text", operator: "eq", value: "I" }, columns);
    const turkish = compileFilter(filter, columns, { ...options, locale: "tr-TR" });
    expect(turkish({ text: "ı" })).toBe(true);
    expect(turkish({ text: "i" })).toBe(false);
    expect(compileFilter(filter, columns, options)({ text: "i" })).toBe(true);
    const accent = predicate({ kind: "text", column: "text", operator: "eq", value: "CAFÉ" });
    expect(accent({ text: "cafe\u0301" })).toBe(true);
    expect(accent({ text: "cafe" })).toBe(false);
    expect(() => compileFilter(filter, columns, { ...options, locale: "" })).toThrow();
  });
  it("implements every text operator without coercing non-text values", () => {
    for (const operator of ["contains", "startsWith", "endsWith"]) {
      const test = predicate({ kind: "text", column: "text", operator, value: "Ab", caseSensitive: true });
      expect(test({ text: "Ab" })).toBe(true);
      expect(test({ text: "ab" })).toBe(false);
      expect(test({ text: 123 })).toBe(false);
    }
    expect(predicate({ kind: "text", column: "text", operator: "contains", value: "b" })({ text: "abc" })).toBe(true);
    expect(predicate({ kind: "text", column: "text", operator: "startsWith", value: "b" })({ text: "abc" })).toBe(false);
    expect(predicate({ kind: "text", column: "text", operator: "endsWith", value: "b" })({ text: "abc" })).toBe(false);
  });
  it("distinguishes missing values from zero, whitespace, false, and invalid numbers", () => {
    const empty = predicate({ kind: "empty", column: "amount" });
    for (const amount of [null, undefined, ""]) expect(empty({ amount })).toBe(true);
    for (const amount of [0, false, " ", NaN]) expect(empty({ amount })).toBe(false);
    const equal = predicate({ kind: "number", column: "amount", operator: "eq", value: 0 });
    for (const amount of [null, undefined, "0", false, NaN, Infinity]) expect(equal({ amount })).toBe(false);
    expect(equal({ amount: 0 })).toBe(true);
    expect(predicate({ kind: "not", child: { kind: "number", column: "amount", operator: "gt", value: 0 } })({ amount: null })).toBe(true);
  });
  it("implements numeric comparisons and inclusive date ranges", () => {
    for (const [operator, expected] of [["lt", false], ["lte", true], ["gt", false], ["gte", true], ["eq", true]]) expect(predicate({ kind: "number", column: "amount", operator, value: 5 })({ amount: 5 })).toBe(expected);
    const range = predicate({ kind: "date", column: "time", operator: "between", min: 1000, max: 2000 });
    expect(range({ time: 1000 })).toBe(true);
    expect(range({ time: 2000 })).toBe(true);
    expect(range({ time: 2001 })).toBe(false);
    expect(range({ time: new Date(1000) })).toBe(false);
    expect(predicate({ kind: "date", column: "time", operator: "gt", value: 0 })({ time: 9e15 })).toBe(false);
  });
  it("filters the full client view before pagination without replacing rows", () => {
    const rows = Array.from({ length: 10 }, (_, amount) => ({ amount }));
    const result = filterClientRows(rows, parseFilter({ kind: "number", column: "amount", operator: "gte", value: 5 }, columns), columns, options);
    expect(result).toEqual(rows.slice(5));
    expect(result[0]).toBe(rows[5]);
    const page = paginateClientRows(result, { pageIndex: 1, pageSize: 2 });
    expect(page.rows).toEqual([rows[7], rows[8]]);
    expect(page.total).toBe(5);
  });
  it("matches enum values exactly and treats an empty selection as match-none", () => {
    const selected = predicate({ kind: "enum", column: "status", operator: "in", values: ["open"] });
    expect(selected({ status: "open" })).toBe(true);
    for (const status of ["Open", "closed", null, undefined, ["open"]]) expect(selected({ status })).toBe(false);
    expect(predicate({ kind: "enum", column: "status", operator: "in", values: [] })({ status: "open" })).toBe(false);
  });
  it("validates before reading rows and propagates accessor failures", () => {
    let reads = 0;
    const evaluation = { locale: "en-US", getValue: () => { reads++; throw new Error("Accessor failure"); } };
    const filter: FilterNode = { kind: "empty", column: "unknown" };
    expect(() => compileFilter(filter, columns, evaluation)).toThrow();
    expect(reads).toBe(0);
    const test = compileFilter({ kind: "empty", column: "text" }, columns, evaluation);
    expect(() => test({})).toThrow("Accessor failure");
    expect(reads).toBe(1);
  });
});
