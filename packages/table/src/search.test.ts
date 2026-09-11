import { describe, expect, it } from "vitest";
import { formatSearchQuery, parseSearchQuery, searchClientRows } from "./search.ts";

type Row = Record<string, unknown>;
const options = { locale: "en-US", columns: ["name", "status"], getValue: (row: Row, column: string) => row[column] };

describe("ranked client search", () => {
  it("ranks exact, prefix, substring, and subsequence with stable ties", () => {
    const rows = ["aXbYc", "xabcx", "abcde", "abc", "abc", "acb"].map(name => ({ name }));
    const result = searchClientRows(rows, "abc", options);
    expect(result.map(match => match.row)).toEqual([rows[3], rows[4], rows[2], rows[1], rows[0]]);
    expect(result.map(match => match.rank)).toEqual([0, 0, 1, 2, 3]);
    expect(result[0]?.row).toBe(rows[3]);
    expect(rows[0]?.name).toBe("aXbYc");
  });
  it("requires all distinct terms, allowing separate configured columns", () => {
    const rows = [{ name: "Alpha", status: "open" }, { name: "Alpha", status: "closed" }, { name: "Beta", status: "open", secret: "alpha" }];
    expect(searchClientRows(rows, " alpha  open alpha ", options)).toEqual([{ row: rows[0], rank: 0 }]);
    expect(searchClientRows(rows, "alpha open", { ...options, columns: ["name"] })).toEqual([]);
  });
  it("supports an explicit literal-phrase mode without changing ranked search defaults", () => {
    const rows = [{ name: "Aperture 001" }, { name: "North Aperture team" }, { name: "Aper ture" }, { name: "'Aperture" }];
    expect(searchClientRows(rows, "'Aperture", { ...options, exactMatch: true }).map(match => match.row)).toEqual([rows[0], rows[1], rows[3]]);
    expect(searchClientRows(rows, "'Aperture", options)).toEqual([{ row: rows[3], rank: 0 }]);
    expect(searchClientRows(rows, "''Aperture", { ...options, exactMatch: true })).toEqual([{ row: rows[3], rank: 0 }]);
    expect(searchClientRows(rows, "'", { ...options, exactMatch: true }).map(match => match.row)).toEqual(rows);
  });
  it("parses and formats the portable exact-match prefix", () => {
    expect(parseSearchQuery(" ' Ada Lovelace ", true)).toEqual({ mode: "exact", value: "Ada Lovelace" });
    expect(parseSearchQuery("''Ada", true)).toEqual({ mode: "ranked", value: "'Ada" });
    expect(parseSearchQuery("'Ada", false)).toEqual({ mode: "ranked", value: "'Ada" });
    expect(formatSearchQuery("Ada Lovelace", "exact")).toBe("'Ada Lovelace");
    expect(formatSearchQuery("'Ada", "ranked")).toBe("''Ada");
  });
  it("uses explicit locale and canonical Unicode without stripping accents", () => {
    const rows = [{ name: "ı" }, { name: "i" }];
    expect(searchClientRows(rows, "I", { ...options, locale: "tr-TR" })[0]?.row).toBe(rows[0]);
    expect(searchClientRows(rows, "I", options)[0]?.row).toBe(rows[1]);
    expect(searchClientRows([{ name: "cafe\u0301" }], "CAFÉ", options)).toHaveLength(1);
    expect(searchClientRows([{ name: "café" }], "cafe", options)).toEqual([]);
    expect(searchClientRows([{ name: "😀x🦊" }], "😀🦊", options)[0]?.rank).toBe(3);
  });
  it("handles blank queries and missing/invalid values without object coercion", () => {
    const rows = [{ name: null }, { name: 123 }, { name: Infinity }, { name: { toString: () => { throw new Error("Do not coerce"); } } }];
    expect(searchClientRows(rows, "  ", { ...options, getValue: () => { throw new Error("Do not read"); } }).map(match => match.row)).toEqual(rows);
    expect(searchClientRows(rows, "123", options)).toEqual([{ row: rows[1], rank: 0 }]);
    expect(searchClientRows(rows, "Infinity", options)).toEqual([]);
    expect(searchClientRows(rows, "123", { ...options, columns: [] })).toEqual([]);
  });
  it("validates configuration and propagates accessor errors", () => {
    for (const columns of [["name", "name"], [""]]) expect(() => searchClientRows([], "x", { ...options, columns })).toThrow();
    expect(() => searchClientRows([], "x", { ...options, locale: "" })).toThrow();
    expect(() => searchClientRows([{}], "x", { ...options, getValue: () => { throw new Error("Accessor failed"); } })).toThrow("Accessor failed");
  });
});
