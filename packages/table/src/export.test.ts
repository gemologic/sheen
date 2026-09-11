import { describe, expect, it } from "vitest";
import { createClientExport } from "./export.ts";
import type { ExportColumn } from "./export.ts";

describe("client export serialization", () => {
  it("quotes commas, newlines, quotes, and Unicode with CRLF records", () => {
    const result = createClientExport([{ text: '日本語, "quoted"\nnext' }], [{ id: "text", header: 'A, "label"', value: row => row.text }]);
    expect(result.toCSV()).toBe('"A, ""label"""\r\n"日本語, ""quoted""\nnext"\r\n');
    expect(JSON.parse(result.toJSON())).toEqual([{ text: '日本語, "quoted"\nnext' }]);
  });
  it("neutralizes formula-looking strings and headers without changing numeric negatives", () => {
    const values = ["=1+1", "+SUM(A1)", "-1", "@x", "  =x", "\tcmd", "\rnext", "\u200b=x", "＝1", "＋1", "－1", "＠x"];
    for (const text of values) {
      const result = createClientExport([text], [{ id: "value", header: "=header", value: row => row }]);
      expect(result.toCSV()).toBe(`"'=header"\r\n"'${text}"\r\n`);
      expect(JSON.parse(result.toJSON())).toEqual([{ value: text }]);
    }
    expect(createClientExport([-1], [{ id: "n", header: "Number", value: row => row }]).toCSV()).toBe('"Number"\r\n"-1"\r\n');
  });
  it("snapshots primitive values and column order while never reading hidden columns", () => {
    const rows = [{ text: "original", count: 2 }];
    const result = createClientExport(rows, [
      { id: "count", header: "Count", value: row => row.count },
      { id: "secret", header: "Secret", visible: false, value: () => { throw new Error("Hidden column read"); } },
      { id: "text", header: "Text", value: row => row.text },
    ]);
    rows[0] = { text: "changed", count: 3 };
    expect(result.columnIds).toEqual(["count", "text"]);
    expect(result.rowCount).toBe(1);
    expect(JSON.parse(result.toJSON())).toEqual([{ count: 2, text: "original" }]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.columnIds)).toBe(true);
  });
  it("preserves JSON scalar types and property names without prototype collisions", () => {
    const result = createClientExport([null, true, 0, ""], [{ id: "__proto__", header: "Value", value: row => row }]);
    expect(result.toJSON()).toBe('[{"__proto__":null},{"__proto__":true},{"__proto__":0},{"__proto__":""}]');
    expect(result.toCSV()).toBe('"Value"\r\n""\r\n"true"\r\n"0"\r\n""\r\n');
  });
  it("rejects invalid schemas and values, and propagates accessor failures", () => {
    expect(() => createClientExport([], [])).toThrow("visible column");
    expect(() => createClientExport([], Array<ExportColumn<number>>(1))).toThrow("missing entry");
    expect(() => createClientExport([], [{ id: "", header: "", value: () => null }])).toThrow("column IDs");
    expect(() => createClientExport([], [{ id: "a", header: "A", value: () => null }, { id: "a", header: "B", value: () => null }])).toThrow("column IDs");
    for (const value of [Infinity, NaN]) expect(() => createClientExport([value], [{ id: "n", header: "Number", value: row => row }])).toThrow("Invalid export value");
    // @ts-expect-error Raw object exports require an app-owned formatter.
    expect(() => createClientExport([{}], [{ id: "object", header: "Object", value: row => row }])).toThrow("Invalid export value");
    expect(() => createClientExport([1], [{ id: "n", header: "N", value: () => { throw new Error("Accessor failed"); } }])).toThrow("Accessor failed");
  });
  it("exports an empty view as a CSV header or empty JSON array", () => {
    const result = createClientExport([], [{ id: "n", header: "N", value: () => null }]);
    expect(result.toCSV()).toBe('"N"\r\n');
    expect(result.toJSON()).toBe("[]");
  });
});
