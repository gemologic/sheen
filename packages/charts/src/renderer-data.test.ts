import { describe, expect, it } from "vitest";
import { defineSeries } from "./chart-types.ts";
import type { ChartData } from "./chart-types.ts";
import { downsampleTimeSeriesRendererData, sourceIndexAtTimestamp } from "./renderer-data.ts";

const series = defineSeries([{ key: "value", label: "Value", color: "chart-1" }]);

describe("TimeSeries renderer data", () => {
  it("retains small sources by identity", () => {
    const data: ChartData = Object.freeze({ t: new Float64Array([1, 2]), value: new Float64Array([3, 4]) });
    expect(downsampleTimeSeriesRendererData(data, series)).toBe(data);
  });

  it("bounds large renderer inputs while retaining endpoints, extrema, gaps, and alignment", () => {
    const length = 100_000;
    const t = Float64Array.from({ length }, (_, index) => index * 1_000);
    const value = Float64Array.from({ length }, (_, index) => Math.sin(index / 100));
    value[12_345] = -1_000;
    value[45_678] = 1_000;
    value[78_901] = Number.NaN;
    const rendered = downsampleTimeSeriesRendererData(Object.freeze({ t, value }), series);
    const renderedValues = rendered.value;
    if (!renderedValues) throw new Error("Renderer output is missing the value series");
    expect(rendered.t.length).toBeLessThanOrEqual(7_168);
    expect(rendered.t[0]).toBe(t[0]);
    expect(rendered.t.at(-1)).toBe(t.at(-1));
    expect([...renderedValues]).toContain(-1_000);
    expect([...renderedValues]).toContain(1_000);
    expect([...renderedValues].some(Number.isNaN)).toBe(true);
    expect(rendered.t.every((timestamp, index) => index === 0 || timestamp > (rendered.t[index - 1] ?? timestamp))).toBe(true);
    expect(sourceIndexAtTimestamp(t, 45_678_000)).toBe(45_678);
    expect(sourceIndexAtTimestamp(t, 45_678_001)).toBeUndefined();
  });

  it("preserves the exact union of bucket samples across multiple columns, including hidden series", () => {
    const length = 20_000;
    const t = Float64Array.from({ length }, (_, index) => index * 60_000);
    const first = Float64Array.from({ length }, (_, index) => Math.sin(index / 31));
    const second = Float64Array.from({ length }, (_, index) => Math.cos(index / 17));
    const empty = new Float64Array(length).fill(Number.NaN);
    first[997] = Number.NaN;
    second[1_994] = Number.NaN;
    const definitions = defineSeries([
      { key: "first", label: "First", color: "chart-1" },
      { key: "second", label: "Second", color: "chart-2", hidden: true },
      { key: "empty", label: "Empty", color: "chart-3" },
    ]);
    const source: ChartData = Object.freeze({ t, first, second, empty });
    const expected = new Set<number>();
    for (let bucket = 0; bucket < 1_024; bucket += 1) {
      const start = Math.floor(bucket * length / 1_024);
      const end = Math.floor((bucket + 1) * length / 1_024);
      expected.add(start);
      expected.add(end - 1);
      for (const column of [first, second, empty]) {
        const finite = Array.from({ length: end - start }, (_, offset) => start + offset)
          .filter(index => Number.isFinite(column[index]));
        if (finite.length) {
          expected.add(finite.reduce((minimum, index) => (column[index] ?? Infinity) < (column[minimum] ?? Infinity) ? index : minimum));
          expected.add(finite.reduce((maximum, index) => (column[index] ?? -Infinity) > (column[maximum] ?? -Infinity) ? index : maximum));
        }
        const gapOffset = column.subarray(start, end).findIndex(Number.isNaN);
        if (gapOffset !== -1) {
          const gap = start + gapOffset;
          expected.add(Math.max(start, gap - 1));
          expected.add(gap);
          expected.add(Math.min(end - 1, gap + 1));
        }
      }
    }
    const ordered = [...expected].sort((left, right) => left - right);
    const rendered = downsampleTimeSeriesRendererData(source, definitions);
    expect(rendered.t).toEqual(Float64Array.from(ordered, index => t[index] ?? Number.NaN));
    for (const key of ["first", "second", "empty"]) {
      const column = source[key];
      if (!column) throw new Error(`Missing test series ${key}`);
      expect(rendered[key]).toEqual(Float64Array.from(ordered, index => column[index] ?? Number.NaN));
    }
    expect(Object.isFrozen(rendered)).toBe(true);
  });
});
