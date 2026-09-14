import { describe, expect, it } from "vitest";
import { dateBenchmarkBaseline } from "./date.v2.ts";

describe("date benchmark baseline", () => {
  it("pins reproducible frame and stability gates", () => {
    expect(dateBenchmarkBaseline.schema).toBe(2);
    expect(dateBenchmarkBaseline.measurement).toBe("cdp-task-duration-thread-ticks-v1");
    expect(dateBenchmarkBaseline.runner).toBe("ubuntu-24.04");
    expect(dateBenchmarkBaseline.playwright).toBe("1.63.0");
    expect(dateBenchmarkBaseline.runs).toBe(5);
    expect(dateBenchmarkBaseline.maximumRegression).toBe(0.1);
    expect(dateBenchmarkBaseline.frame).toEqual({ p99Ms: 20, smoothOperations: ["retained-refresh"], maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 });
    expect(dateBenchmarkBaseline.history).toHaveLength(1);
    expect(Object.keys(dateBenchmarkBaseline.history[0]?.normalized ?? {})).toHaveLength(5);
    expect(Object.values(dateBenchmarkBaseline.history[0]?.normalized ?? {}).every(value => Number.isFinite(value) && value > 0)).toBe(true);
  });
});
