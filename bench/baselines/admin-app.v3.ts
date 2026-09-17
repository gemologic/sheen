import { cpuMeasurement } from "../cpu-sampling.ts";

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
    recordedAt: "2026-09-14",
    environment: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0; thread-time TaskDuration for interactions and calibration",
    normalized: Object.freeze({
      sidebarCollapse: 0.19108360934142746,
      presetLayout: 0.2607334766254706,
      themeSwitch: 0.2898586467538998,
      commandPalette: 0.15405943009410886,
      tableSearch: 0.2436117010344593,
      tableScroll: 3.6739702919263384,
      detailsDock: 0.14002758517156266,
      detailsSheet: 0.23711166299611117,
      retainedRefresh: 0.9588661931524965,
    }),
  }),
  Object.freeze({
    recordedAt: "2026-09-16",
    environment: "Explicitly approved Studio Inter to Graphite Plex typography-transition baseline; five-run production capture on WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0. Only themeSwitch changes; see docs/studio-performance-review.md.",
    normalized: Object.freeze({
      sidebarCollapse: 0.19108360934142746,
      presetLayout: 0.2607334766254706,
      themeSwitch: 0.3495700854471915,
      commandPalette: 0.15405943009410886,
      tableSearch: 0.2436117010344593,
      tableScroll: 3.6739702919263384,
      detailsDock: 0.14002758517156266,
      detailsSheet: 0.23711166299611117,
      retainedRefresh: 0.9588661931524965,
    }),
  }),
]);

export const adminAppBenchmarkBaseline = Object.freeze({
  schema: 3,
  measurement: cpuMeasurement,
  fixture: "northstar-heavy-v1",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  expected: Object.freeze({ rows: 12_000, chartPoints: 20_000, maximumMountedRows: 100, maximumDomNodes: 5_000 }),
  frame: Object.freeze({ smoothP99Ms: 20, smoothOperations: Object.freeze(["table-scroll"]), maximumMs: 50, longTasks: 0, unexpectedLayoutShift: 0 }) satisfies AdminAppFrameBudget,
  history,
});
