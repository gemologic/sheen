export interface TableNormalizedBaseline {
  readonly render: number;
  readonly multiSort: number;
  readonly search: number;
  readonly filter: number;
  readonly refresh: number;
}

export interface TableBaselineHistoryEntry {
  readonly version: number;
  readonly recordedAt: string;
  readonly source: string;
  readonly normalized: TableNormalizedBaseline;
}

export interface TableBenchmarkBaseline {
  readonly schema: 2;
  readonly runner: "ubuntu-24.04";
  readonly playwright: "1.63.0";
  readonly runs: 5;
  readonly maximumRegression: number;
  readonly frame: { readonly p99Ms: number; readonly maximumMs: number; readonly longTasks: number; readonly blankFrames: number };
  readonly referenceMs: { readonly render: number; readonly multiSort: number; readonly search: number; readonly filter: number; readonly refresh: number };
  readonly history: readonly TableBaselineHistoryEntry[];
}

export const tableBenchmarkBaseline: TableBenchmarkBaseline = Object.freeze({
  schema: 2,
  runner: "ubuntu-24.04",
  playwright: "1.63.0",
  runs: 5,
  maximumRegression: 0.1,
  frame: Object.freeze({ p99Ms: 20, maximumMs: 50, longTasks: 0, blankFrames: 0 }),
  referenceMs: Object.freeze({ render: 200, multiSort: 100, search: 50, filter: 50, refresh: 100 }),
  history: Object.freeze([
    Object.freeze({
      version: 2,
      recordedAt: "2026-09-08",
      source: "local five-run production capture: WSL2 6.6.87.2, AMD Ryzen Threadripper 9960X, Chromium 153.0.8010.12, Playwright 1.63.0",
      normalized: Object.freeze({ render: 2.58177570381095, multiSort: 2.331775702418318, search: 1.4532710252000585, filter: 0.6224256297026121, refresh: 1.3418013904626611 }),
    }),
  ]),
});
