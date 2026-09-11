import { describe, expect, it } from "vitest";
import { chartBenchmarkFixture, createChartBenchmarkData } from "./chart.ts";

describe("chart benchmark fixture", () => {
  it("repeats one seeded strictly increasing four-series dataset", () => {
    const first = createChartBenchmarkData(128);
    const second = createChartBenchmarkData(128);
    expect([...first.t]).toEqual([...second.t]);
    expect([...first.primary]).toEqual([...second.primary]);
    expect([...first.quaternary]).toEqual([...second.quaternary]);
    expect(Object.keys(first)).toEqual(["t", "primary", "secondary", "tertiary", "quaternary"]);
    expect(first.t.every((value, index) => index === 0 || value > (first.t[index - 1] ?? value))).toBe(true);
    expect(first.tertiary.every(Number.isFinite)).toBe(true);
  });

  it("pins the published workload dimensions", () => {
    expect(chartBenchmarkFixture).toEqual({
      schema: 1,
      seed: 0x5ee11,
      points: 100_000,
      series: 4,
      streamInitialPoints: 1_024,
      streamSamples: 120,
      streamIntervalMs: 1_000 / 60,
      themeCharts: 20,
      themePoints: 16,
    });
  });
});
