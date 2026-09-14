import { cpuMeasurement } from "../cpu-sampling.ts";
import type { CpuBaselineEntry } from "../cpu-sampling.ts";

export interface ComposerFrameBudget {
  readonly p99Ms: number;
  readonly smoothOperations: readonly string[];
  readonly maximumMs: number;
  readonly longTasks: number;
  readonly unexpectedLayoutShift: number;
}

export interface ComposerNormalizedBaseline {
  readonly configureTitle: number;
  readonly addRemove: number;
  readonly themeSwitch: number;
  readonly viewportSwitch: number;
  readonly queryEdit: number;
}

const composerSmoothOperations: readonly string[] = Object.freeze([]);
const history: readonly CpuBaselineEntry<ComposerNormalizedBaseline>[] = Object.freeze([
  Object.freeze({
    recordedAt: "2026-09-14",
    source: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0; thread-time TaskDuration for interactions and calibration",
    normalized: Object.freeze({ configureTitle: 2.650835236687716, addRemove: 2.657689503568033, themeSwitch: 1.4360551619995119, viewportSwitch: 1.7546251653847011, queryEdit: 1.9505556414731666 }),
  }),
]);

export const composerBenchmarkBaseline = Object.freeze({
  schema: 2,
  measurement: cpuMeasurement,
  runner: "ubuntu-24.04",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  frame: Object.freeze({ p99Ms: 20, smoothOperations: composerSmoothOperations, maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies ComposerFrameBudget,
  history,
});
