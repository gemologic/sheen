import { describe, expect, it } from "vitest";
import { chartColumnAnalysis, defineSeries, resolveChartSeriesEncoding, toCategorical, toColumnar, validateCategorical, validateColumnar } from "./chart-types.ts";
import type { ChartCategoricalData, ChartData } from "./chart-types.ts";

interface Row { readonly at: number; readonly p50: number; readonly p99: number }

const series = defineSeries([
  { key: "p50", label: "p50", color: "chart-1" },
  { key: "p99", label: "p99", color: "chart-3" },
]);

describe("columnar chart data", () => {
  it("converts rows to frozen equal-length Float64 columns and retains NaN gaps", () => {
    const rows: readonly Row[] = [{ at: 1_700_000_000_000, p50: 12, p99: 25 }, { at: 1_700_000_001_000, p50: Number.NaN, p99: 30 }];
    const data = toColumnar(rows, { timestamp: row => row.at, series: [
      { key: "p50", label: "p50", color: "chart-1", value: row => row.p50 },
      { key: "p99", label: "p99", color: "chart-3", value: row => row.p99 },
    ] });
    expect(Object.isFrozen(data)).toBe(true);
    expect(data.t).toBeInstanceOf(Float64Array);
    expect([...data.t]).toEqual([1_700_000_000_000, 1_700_000_001_000]);
    expect([...data.p50 ?? []]).toEqual([12, Number.NaN]);
    expect([...data.p99 ?? []]).toEqual([25, 30]);
    expect(validateColumnar(data, series)).toBe(data);
  });

  it("rejects invalid timestamps with row-specific diagnostics", () => {
    const convert = (rows: readonly Row[]) => toColumnar(rows, { timestamp: row => row.at, series: [{ key: "p50", label: "p50", color: "chart-1", value: row => row.p50 }] });
    expect(() => convert([{ at: Number.POSITIVE_INFINITY, p50: 1, p99: 2 }])).toThrow("row 0");
    expect(() => convert([{ at: 10, p50: 1, p99: 2 }, { at: 10, p50: 2, p99: 3 }])).toThrow("duplicate or out of order");
    expect(() => convert([{ at: 10, p50: 1, p99: 2 }, { at: 9, p50: 2, p99: 3 }])).toThrow("duplicate or out of order");
  });

  it("accepts only finite values or NaN and never coerces undefined or strings", () => {
    const make = (value: number) => toColumnar([{ at: 10, p50: value, p99: 0 }], { timestamp: row => row.at, series: [{ key: "p50", label: "p50", color: "chart-1", value: row => row.p50 }] });
    expect(() => make(Number.POSITIVE_INFINITY)).toThrow("finite or NaN");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => make("12")).toThrow("finite or NaN");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => make(undefined)).toThrow("finite or NaN");
    expect([...make(Number.NaN).p50 ?? []]).toEqual([Number.NaN]);
  });

  it("validates external columns, declared keys, types, and equal lengths", () => {
    const valid: ChartData = { t: new Float64Array([10, 20]), p50: new Float64Array([1, 2]), p99: new Float64Array([2, Number.NaN]) };
    expect(validateColumnar(valid, series)).toBe(valid);
    expect(() => validateColumnar({ ...valid, p50: new Float64Array([1]) }, series)).toThrow("length");
    expect(() => validateColumnar({ ...valid, p50: new Float64Array([Number.NEGATIVE_INFINITY, 2]) }, series)).toThrow("finite or NaN");
    expect(() => validateColumnar({ ...valid, extra: new Float64Array([1, 2]) }, series)).toThrow("undeclared");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => validateColumnar({ t: new Float64Array([10, 20]), p50: [1, 2], p99: valid.p99 }, series)).toThrow("Float64Array");
  });

  it("retains immutable-column extrema and gap segments by typed-array identity", () => {
    const column = new Float64Array([3, Number.NaN, -2, 8, Number.NaN]);
    const analysis = chartColumnAnalysis(column, "p50");
    expect(analysis).toEqual({ minimum: -2, maximum: 8, segments: [[0, 0], [2, 3]], hasGap: true });
    expect(chartColumnAnalysis(column, "p50")).toBe(analysis);
  });

  it("restricts series to explicit semantic color tokens and stable keys", () => {
    expect(Object.isFrozen(series)).toBe(true);
    expect(() => defineSeries([])).toThrow("at least one");
    expect(() => defineSeries([{ key: "t", label: "time", color: "chart-1" }])).toThrow("other than t");
    expect(() => defineSeries([{ key: "same", label: "one", color: "chart-1" }, { key: "same", label: "two", color: "chart-2" }])).toThrow("unique");
    const encoded = defineSeries([{ key: "encoded", label: "encoded", color: "chart-1", encoding: "dash-dot" }]);
    expect(encoded[0]?.encoding).toBe("dash-dot");
    expect(resolveChartSeriesEncoding(series[0]!, 0)).toBe("solid");
    expect(resolveChartSeriesEncoding(series[1]!, 1)).toBe("dashed");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => defineSeries([{ key: "value", label: "value", color: "hotpink" }])).toThrow("unsupported color token");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => defineSeries([{ key: "value", label: "value", color: "chart-1", encoding: "striped" }])).toThrow("unsupported non-color encoding");
  });

  it("converts and validates explicit unique category labels without timestamp coercion", () => {
    const categorical = toCategorical([
      { category: "North", p50: 12, p99: 25 },
      { category: "South", p50: Number.NaN, p99: 30 },
    ], {
      category: row => row.category,
      series: [
        { key: "p50", label: "p50", color: "chart-1", value: row => row.p50 },
        { key: "p99", label: "p99", color: "chart-3", value: row => row.p99 },
      ],
    });
    expect(Object.isFrozen(categorical)).toBe(true);
    expect(Object.isFrozen(categorical.categories)).toBe(true);
    expect(Object.isFrozen(categorical.values)).toBe(true);
    expect(categorical.categories).toEqual(["North", "South"]);
    expect([...categorical.values.p50 ?? []]).toEqual([12, Number.NaN]);
    expect(validateCategorical(categorical, series)).toBe(categorical);
  });

  it("rejects duplicate, missing, undeclared, non-typed, and invalid categorical values", () => {
    const valid: ChartCategoricalData = {
      categories: ["North", "South"],
      values: { p50: new Float64Array([1, 2]), p99: new Float64Array([2, Number.NaN]) },
    };
    expect(() => validateCategorical({ ...valid, categories: ["North", "North"] }, series)).toThrow("duplicates");
    expect(() => validateCategorical({ ...valid, values: { p50: new Float64Array([1]) } }, series)).toThrow("length");
    expect(() => validateCategorical({ ...valid, values: { ...valid.values, extra: new Float64Array([1, 2]) } }, series)).toThrow("undeclared");
    expect(() => validateCategorical({ ...valid, values: { ...valid.values, p50: new Float64Array([1, Number.POSITIVE_INFINITY]) } }, series)).toThrow("finite or NaN");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => validateCategorical({ ...valid, values: { ...valid.values, p50: [1, 2] } }, series)).toThrow("Float64Array");
  });
});
