import { describe, expect, it } from "vitest";
import { adminAppBenchmarkBaseline } from "./admin-app.v3.ts";

describe("heavy AdminApp benchmark baseline", () => {
  it("pins the workload and reproducible stability gates", () => {
    expect(adminAppBenchmarkBaseline.schema).toBe(3);
    expect(adminAppBenchmarkBaseline.measurement).toBe("cdp-task-duration-thread-ticks-v1");
    expect(adminAppBenchmarkBaseline.fixture).toBe("northstar-heavy-v1");
    expect(adminAppBenchmarkBaseline.playwright).toBe("1.63.0");
    expect(adminAppBenchmarkBaseline.runs).toBe(5);
    expect(adminAppBenchmarkBaseline.maximumRegression).toBe(0.1);
    expect(adminAppBenchmarkBaseline.expected).toEqual({ rows: 12_000, chartPoints: 20_000, maximumMountedRows: 100, maximumDomNodes: 5_000 });
    expect(adminAppBenchmarkBaseline.frame).toEqual({ smoothP99Ms: 20, smoothOperations: ["table-scroll"], maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 });
    expect(adminAppBenchmarkBaseline.history).toHaveLength(1);
    expect(adminAppBenchmarkBaseline.history[0]?.environment).toContain("local five-run production capture");
    expect(Object.keys(adminAppBenchmarkBaseline.history[0]?.normalized ?? {})).toHaveLength(9);
    expect(Object.values(adminAppBenchmarkBaseline.history[0]?.normalized ?? {}).every(value => Number.isFinite(value) && value > 0)).toBe(true);
  });
});
