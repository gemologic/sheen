export interface DateFrameBudget {
  readonly p99Ms: number;
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

export const dateBenchmarkBaseline = Object.freeze({
  schema: 1,
  runner: "ubuntu-24.04",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  frame: Object.freeze({ p99Ms: 20, maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies DateFrameBudget,
  history: Object.freeze([
    Object.freeze({
      recordedAt: "2026-09-09",
      source: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0",
      normalized: Object.freeze({ openPicker: 3.171428572563898, keyboardDate: 2.7078384706090404, zoneFilter: 2.0071428560075306, retainedRefresh: 10.461904764175415, dstResolution: 5.466824639502493 }) satisfies DateNormalizedBaseline,
    }),
  ]),
});
