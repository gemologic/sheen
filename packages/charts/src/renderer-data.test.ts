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
});
