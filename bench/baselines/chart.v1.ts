export interface ChartFrameBudget {
  readonly p99Ms: number;
  readonly maximumMs: number;
  readonly longTasks: number;
  readonly unexpectedLayoutShift: number;
}

export interface ChartNormalizedBaseline {
  readonly initialDraw: number;
  readonly sparkline: number;
  readonly themeSwitch: number;
}

export const chartBenchmarkBaseline = Object.freeze({
  schema: 1,
  runner: "ubuntu-24.04",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  frame: Object.freeze({ p99Ms: 20, maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies ChartFrameBudget,
  referenceMs: Object.freeze({ initialDraw: 16, sparkline: 1 }),
  history: Object.freeze([
    Object.freeze({
      recordedAt: "2026-09-09",
      source: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0",
      normalized: Object.freeze({ initialDraw: 1.6009501189935238, sparkline: 0.040380048730039364, themeSwitch: 1.0950118823629362 }) satisfies ChartNormalizedBaseline,
    }),
  ]),
});
