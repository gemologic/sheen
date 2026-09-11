import { describe, expect, it } from "vitest";
import { composerBenchmarkBaseline } from "./composer.v1.ts";

describe("Composer benchmark baseline", () => {
  it("pins five calibrated runs, the browser toolchain, and every continuity workload", () => {
    expect(composerBenchmarkBaseline).toMatchObject({ schema: 1, runner: "ubuntu-24.04", playwright: "1.63.0", runs: 5, maximumRegression: 0.1 });
    expect(composerBenchmarkBaseline.frame).toEqual({ p99Ms: 20, smoothOperations: [], maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 });
    expect(Object.keys(composerBenchmarkBaseline.history[0]?.normalized ?? {})).toEqual(["configureTitle", "addRemove", "themeSwitch", "viewportSwitch", "queryEdit"]);
  });
});
