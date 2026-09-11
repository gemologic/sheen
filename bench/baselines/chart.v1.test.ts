import { describe, expect, it } from "vitest";
import { chartBenchmarkBaseline } from "./chart.v1.ts";

describe("chart benchmark baseline", () => {
  it("pins reproducible chart operation and frame gates", () => {
    expect(chartBenchmarkBaseline.schema).toBe(1);
    expect(chartBenchmarkBaseline.runner).toBe("ubuntu-24.04");
    expect(chartBenchmarkBaseline.playwright).toBe("1.63.0");
    expect(chartBenchmarkBaseline.runs).toBe(5);
    expect(chartBenchmarkBaseline.maximumRegression).toBe(0.1);
    expect(chartBenchmarkBaseline.frame).toEqual({ p99Ms: 20, maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 });
    expect(chartBenchmarkBaseline.referenceMs).toEqual({ initialDraw: 16, sparkline: 1 });
    expect(chartBenchmarkBaseline.history).toHaveLength(1);
    expect(Object.keys(chartBenchmarkBaseline.history[0]?.normalized ?? {})).toEqual(["initialDraw", "sparkline", "themeSwitch"]);
  });
});
