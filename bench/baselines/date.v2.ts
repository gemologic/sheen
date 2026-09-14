import { cpuMeasurement } from "../cpu-sampling.ts";
import type { CpuBaselineEntry } from "../cpu-sampling.ts";

export interface DateFrameBudget {
  readonly p99Ms: number;
  readonly smoothOperations: readonly string[];
  readonly maximumMs: number;
  readonly longTasks: number;
  readonly unexpectedLayoutShift: number;
}

export interface DateNormalizedBaseline {
  readonly openPicker: number;
  readonly keyboardDate: number;
  readonly zoneFilter: number;
  readonly retainedRefresh: number;
  readonly dstResolution: number;
}

const history: readonly CpuBaselineEntry<DateNormalizedBaseline>[] = Object.freeze([
  Object.freeze({
    recordedAt: "2026-09-14",
    source: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0; thread-time TaskDuration for interactions and calibration",
    normalized: Object.freeze({ openPicker: 0.9482440357969009, keyboardDate: 0.9191532116737139, zoneFilter: 0.42452145513925454, retainedRefresh: 0.5964120475369685, dstResolution: 1.1206392971469958 }),
  }),
]);

export const dateBenchmarkBaseline = Object.freeze({
  schema: 2,
  measurement: cpuMeasurement,
  runner: "ubuntu-24.04",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  frame: Object.freeze({ p99Ms: 20, smoothOperations: Object.freeze(["retained-refresh"]), maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies DateFrameBudget,
  history,
});
