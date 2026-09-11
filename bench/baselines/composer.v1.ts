export interface ComposerFrameBudget {
  readonly p99Ms: number;
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

export const composerBenchmarkBaseline = Object.freeze({
  schema: 1,
  runner: "ubuntu-24.04",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  frame: Object.freeze({ p99Ms: 20, maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies ComposerFrameBudget,
  history: Object.freeze([
    Object.freeze({
      recordedAt: "2026-09-09",
      source: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0",
      normalized: Object.freeze({ configureTitle: 5.414691967601198, addRemove: 5.776722104479688, themeSwitch: 5.097387182678321, viewportSwitch: 4.52606637116774, queryEdit: 4.7843602134576235 }) satisfies ComposerNormalizedBaseline,
    }),
  ]),
});
