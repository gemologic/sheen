export interface AdminAppFrameBudget {
  readonly smoothP99Ms: number;
  readonly smoothOperations: readonly string[];
  readonly maximumMs: number;
  readonly longTasks: number;
  readonly unexpectedLayoutShift: number;
}

export interface AdminAppNormalizedBaseline {
  readonly sidebarCollapse: number;
  readonly presetLayout: number;
  readonly themeSwitch: number;
  readonly commandPalette: number;
  readonly tableSearch: number;
  readonly tableScroll: number;
  readonly detailsDock: number;
  readonly detailsSheet: number;
  readonly retainedRefresh: number;
}

export interface AdminAppBaselineEntry {
  readonly recordedAt: string;
  readonly environment: string;
  readonly normalized: AdminAppNormalizedBaseline;
}

const history: readonly AdminAppBaselineEntry[] = Object.freeze([
  Object.freeze({
    recordedAt: "2026-09-09",
    environment: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0",
    normalized: Object.freeze({
      sidebarCollapse: 0.6251774729001799,
      presetLayout: 0.894383102416622,
      themeSwitch: 0.949975949540179,
      commandPalette: 0.4650938848457158,
      tableSearch: 1.454983147519914,
      tableScroll: 9.920153914915293,
      detailsDock: 0.5680615684890649,
      detailsSheet: 0.5448871820738466,
      retainedRefresh: 4.88840788593613,
    }),
  }),
]);

export const adminAppBenchmarkBaseline = Object.freeze({
  schema: 2,
  fixture: "northstar-heavy-v1",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  expected: Object.freeze({ rows: 12_000, chartPoints: 20_000, maximumMountedRows: 100, maximumDomNodes: 5_000 }),
  frame: Object.freeze({ smoothP99Ms: 20, smoothOperations: Object.freeze(["table-scroll"]), maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies AdminAppFrameBudget,
  history,
});
