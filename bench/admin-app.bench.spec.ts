import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { finishFrameSampling, settleBenchmarkRendering, startFrameSampling } from "./frame-sampling.ts";
import type { FrameSample } from "./frame-sampling.ts";
import { cpuMeasurement, createBrowserCpuClock, isCpuBaselineCapture } from "./cpu-sampling.ts";
import type { BrowserCpuClock } from "./cpu-sampling.ts";
import { captureAdminAppOwners, retainedAdminAppOwners } from "./admin-app-owners.ts";
import { cpus, loadavg, platform, release, totalmem } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { adminAppBenchmarkBaseline } from "./baselines/admin-app.v3.ts";
import type { AdminAppNormalizedBaseline } from "./baselines/admin-app.v3.ts";

interface OperationSample {
  readonly name: string;
  readonly taskMs: number;
  readonly frames: FrameSample;
  readonly retained: boolean;
}

interface AdminAppBenchmarkRun {
  readonly hostLoadAverageStart: readonly number[];
  readonly hostLoadAverageEnd: readonly number[];
  readonly initialReadyMs: number;
  readonly calibrationMs: number;
  readonly calibrationTaskMs: number;
  readonly footprint: AdminAppFootprint;
  readonly operations: readonly OperationSample[];
}

interface AdminAppFootprint {
  readonly rows: number;
  readonly chartPoints: number;
  readonly domNodes: number;
  readonly mountedTableRows: number;
  readonly heapUsedBytes: number | null;
  readonly domContentLoadedMs: number;
  readonly loadMs: number;
}

const metricNames: readonly (keyof AdminAppNormalizedBaseline)[] = [
  "sidebarCollapse", "presetLayout", "themeSwitch", "commandPalette", "tableSearch", "tableScroll", "detailsDock", "detailsSheet", "retainedRefresh",
];

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)] ?? Number.POSITIVE_INFINITY;
}

function median(values: readonly number[]): number {
  return percentile(values, 0.5);
}

async function calibrate(page: Page): Promise<number> {
  await page.evaluate(() => {
    let state = 0x12345678;
    for (let index = 0; index < 1_000_000; index += 1) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
    if (!Number.isFinite(state)) throw new Error("Calibration warm-up checksum failed");
  });
  return page.evaluate(() => {
    let state = 0x12345678;
    const start = performance.now();
    for (let index = 0; index < 60_000_000; index += 1) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
    const duration = performance.now() - start;
    if (!Number.isFinite(state)) throw new Error("Calibration checksum failed");
    return duration;
  });
}

async function measureFrames(page: Page, name: string, operation: () => Promise<boolean>): Promise<Omit<OperationSample, "taskMs">> {
  await startFrameSampling(page, { separateToastLayoutShift: true });
  let retained = false;
  let frames: FrameSample;
  try {
    retained = await operation();
    await settleBenchmarkRendering(page);
  } finally {
    frames = await finishFrameSampling(page);
  }
  return Object.freeze({ name, frames, retained });
}

async function measure(page: Page, clock: BrowserCpuClock, name: string, operation: () => Promise<boolean>): Promise<OperationSample> {
  const sample = await clock.measure(() => measureFrames(page, name, operation));
  return Object.freeze({ ...sample.value, taskMs: sample.taskMs });
}

function operation(run: AdminAppBenchmarkRun, name: string): OperationSample {
  const sample = run.operations.find(candidate => candidate.name === name);
  if (!sample) throw new Error(`Missing AdminApp benchmark operation ${JSON.stringify(name)}`);
  return sample;
}

function normalizedSummary(runs: readonly AdminAppBenchmarkRun[]): AdminAppNormalizedBaseline {
  const normalized = (name: string) => median(runs.map(run => operation(run, name).taskMs / run.calibrationTaskMs));
  return Object.freeze({
    sidebarCollapse: normalized("sidebar-collapse"),
    presetLayout: normalized("preset-layout"),
    themeSwitch: normalized("theme-switch"),
    commandPalette: normalized("command-palette"),
    tableSearch: normalized("table-search"),
    tableScroll: normalized("table-scroll"),
    detailsDock: normalized("details-dock"),
    detailsSheet: normalized("details-sheet"),
    retainedRefresh: normalized("retained-refresh"),
  });
}

function driftFailures(current: AdminAppNormalizedBaseline): readonly string[] {
  return Object.freeze(metricNames.flatMap(name => {
    const values = [...adminAppBenchmarkBaseline.history.map(entry => entry.normalized[name]), current[name]].slice(-4);
    return values.length === 4 && values.slice(1).every((value, index) => value > (values[index] ?? value)) ? [`${name} increased in three consecutive baselines`] : [];
  }));
}

async function runOnce(browser: Browser): Promise<AdminAppBenchmarkRun> {
  const hostLoadAverageStart = Object.freeze(loadavg());
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  let clock: BrowserCpuClock | undefined;
  try {
    clock = await createBrowserCpuClock(page);
    const startedAt = Date.now();
    await page.goto("/admin?workload=heavy&table=continuous");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const content = page.locator("[data-admin-starter-content]");
    await expect(content).toHaveAttribute("data-admin-row-count", String(adminAppBenchmarkBaseline.expected.rows));
    await expect(content).toHaveAttribute("data-admin-chart-points", String(adminAppBenchmarkBaseline.expected.chartPoints));
    await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
    const initialReadyMs = Date.now() - startedAt;
    const footprint = await page.evaluate((): AdminAppFootprint => {
      const content = document.querySelector<HTMLElement>("[data-admin-starter-content]");
      const navigation = performance.getEntriesByType("navigation")[0];
      const memory: unknown = Reflect.get(performance, "memory");
      const heapUsed: unknown = typeof memory === "object" && memory !== null ? Reflect.get(memory, "usedJSHeapSize") : undefined;
      return {
        rows: Number(content?.dataset.adminRowCount ?? Number.NaN),
        chartPoints: Number(content?.dataset.adminChartPoints ?? Number.NaN),
        domNodes: document.querySelectorAll("*").length,
        mountedTableRows: document.querySelectorAll("tbody tr[data-row-id]").length,
        heapUsedBytes: typeof heapUsed === "number" && Number.isFinite(heapUsed) ? heapUsed : null,
        domContentLoadedMs: navigation instanceof PerformanceNavigationTiming ? navigation.domContentLoadedEventEnd : Number.NaN,
        loadMs: navigation instanceof PerformanceNavigationTiming ? navigation.loadEventEnd : Number.NaN,
      };
    });
    await settleBenchmarkRendering(page);
    const calibration = await clock.measure(() => calibrate(page));
    const calibrationMs = calibration.value;
    const calibrationTaskMs = calibration.taskMs;
    const shell = page.locator(".sheen-admin-app");
    const chart = page.locator(".sheen-time-series");
    await shell.evaluate(element => element.setAttribute("data-benchmark-shell", "retained"));
    await content.evaluate(element => element.setAttribute("data-benchmark-content", "retained"));
    await chart.evaluate(element => element.setAttribute("data-benchmark-chart", "retained"));
    const owners = await captureAdminAppOwners(page);
    const retained = (mode: "shell" | "chart" | "details" | "refresh") => owners.evaluate(retainedAdminAppOwners, mode);
    const operations: OperationSample[] = [];

    await settleBenchmarkRendering(page);
    operations.push(await measure(page, clock, "sidebar-collapse", async () => {
      await page.locator(".sheen-sidebar-toggle-desktop").click();
      await expect(shell).toHaveAttribute("data-sidebar-collapsed", "true");
      return retained("shell");
    }));

    await page.getByText("Customize starter", { exact: true }).click();
    operations.push(await measure(page, clock, "preset-layout", async () => {
      await page.locator(".loupe-admin-customize").getByRole("button", { name: "Layout Standard", exact: true }).click();
      await page.locator(".sheen-select-content").getByRole("option", { name: "Workspace", exact: true }).click();
      await expect(shell).toHaveAttribute("data-admin-preset", "workspace");
      return retained("shell");
    }));

    operations.push(await measure(page, clock, "theme-switch", async () => {
      await page.locator(".loupe-admin-customize").getByRole("button", { name: "Theme Inherit root theme", exact: true }).click();
      await page.locator(".sheen-select-content").getByRole("option", { name: "Graphite", exact: true }).click();
      await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-theme", "graphite");
      return retained("chart");
    }));

    operations.push(await measure(page, clock, "command-palette", async () => {
      await page.keyboard.press("Control+K");
      const palette = page.locator('.sheen-command-dialog[role="dialog"]');
      await expect(palette).toBeVisible();
      await expect(palette).toHaveAccessibleName("Command palette");
      return retained("shell");
    }));
    await page.keyboard.press("Escape");

    const tableSearch = page.getByRole("searchbox", { name: "Search Northstar accounts", exact: true });
    operations.push(await measure(page, clock, "table-search", async () => {
      await tableSearch.fill("'Aperture 001");
      await expect(page.locator(".sheen-data-table-result-count")).toContainText("1 result");
      return retained("chart");
    }));
    await tableSearch.fill("");
    await expect(page.locator(".sheen-data-table-result-count")).toContainText("12,000 results");

    const tableViewport = page.locator(".sheen-data-table-viewport");
    operations.push(await measure(page, clock, "table-scroll", async () => {
      const populated = await tableViewport.evaluate(async element => {
        const samples: boolean[] = [];
        const maximum = Math.min(10_000, Math.max(0, element.scrollHeight - element.clientHeight));
        for (let index = 1; index <= 120; index += 1) {
          await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
          element.scrollTop = maximum * index / 120;
          const bounds = element.getBoundingClientRect();
          const rows = [...element.querySelectorAll<HTMLElement>("tbody tr[data-row-id]")];
          samples.push(rows.some(row => {
            const rowBounds = row.getBoundingClientRect();
            return rowBounds.bottom > bounds.top && rowBounds.top < bounds.bottom;
          }));
        }
        return samples.length === 120 && samples.every(Boolean);
      });
      return populated && await retained("shell");
    }));

    await tableViewport.evaluate(element => { element.scrollTop = 0; });
    const firstRow = page.locator('tbody tr[data-row-id="account-0001"]');
    await expect(firstRow).toBeVisible();
    await firstRow.focus();
    operations.push(await measure(page, clock, "details-dock", async () => {
      await page.keyboard.press("Enter");
      const details = page.locator(".sheen-admin-details-owner");
      await expect(details).toHaveAttribute("data-presentation", "docked");
      await details.evaluate(element => element.setAttribute("data-benchmark-details", "retained"));
      await owners.evaluate(nodes => { nodes.details = document.querySelector<HTMLElement>(".sheen-admin-details-owner"); });
      return retained("details");
    }));

    operations.push(await measure(page, clock, "details-sheet", async () => {
      await page.setViewportSize({ width: 800, height: 800 });
      const details = page.locator(".sheen-admin-details-owner");
      await expect(details).toHaveAttribute("data-presentation", "sheet");
      return retained("details");
    }));
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1200, height: 800 });

    const noteRow = page.locator('tbody tr[data-row-id="account-0001"]');
    await noteRow.focus();
    await page.keyboard.press("Enter");
    const note = page.getByRole("textbox", { name: "Account note", exact: true });
    await note.fill("Benchmark retained draft");
    await note.focus();
    await note.evaluate(element => element.setAttribute("data-benchmark-note", "retained"));
    await owners.evaluate(nodes => { nodes.draft = document.querySelector<HTMLInputElement>('[data-benchmark-note="retained"]'); });
    operations.push(await measure(page, clock, "retained-refresh", async () => {
      await page.getByRole("button", { name: "Refresh", exact: true }).first().evaluate(element => {
        if (!(element instanceof HTMLButtonElement)) throw new Error("Refresh trigger must be a button");
        element.click();
      });
      await expect(page.locator(".sheen-status-bar").getByText("Revision 2", { exact: true })).toBeVisible();
      return retained("refresh");
    }));
    return Object.freeze({ hostLoadAverageStart, hostLoadAverageEnd: Object.freeze(loadavg()), initialReadyMs, calibrationMs, calibrationTaskMs, footprint: Object.freeze(footprint), operations: Object.freeze(operations) });
  } finally {
    try { await clock?.close(); } finally { await context.close(); }
  }
}

test("AdminApp operations retain owners and satisfy calibrated frame stability gates", async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  const capture = isCpuBaselineCapture();
  const runs: AdminAppBenchmarkRun[] = [];
  for (let index = 0; index < adminAppBenchmarkBaseline.runs; index += 1) runs.push(await runOnce(browser));
  const normalized = normalizedSummary(runs);
  const failures = capture ? [] : [...driftFailures(normalized)];
  const latest = adminAppBenchmarkBaseline.history.at(-1);
  if (!capture && !latest) throw new Error("AdminApp CPU benchmark baseline history must not be empty");
  if (!capture && latest) {
    for (const name of metricNames) {
      const maximum = latest.normalized[name] * (1 + adminAppBenchmarkBaseline.maximumRegression);
      if (normalized[name] > maximum) failures.push(`${name} normalized median ${normalized[name].toFixed(4)} exceeds ${maximum.toFixed(4)}`);
    }
  }
  for (let index = 0; index < runs.length; index += 1) {
    const footprint = runs[index]?.footprint;
    if (!footprint) continue;
    if (footprint.rows !== adminAppBenchmarkBaseline.expected.rows) failures.push(`run ${index + 1} exposed ${footprint.rows} rows instead of ${adminAppBenchmarkBaseline.expected.rows}`);
    if (footprint.chartPoints !== adminAppBenchmarkBaseline.expected.chartPoints) failures.push(`run ${index + 1} exposed ${footprint.chartPoints} chart points instead of ${adminAppBenchmarkBaseline.expected.chartPoints}`);
    if (footprint.mountedTableRows > adminAppBenchmarkBaseline.expected.maximumMountedRows) failures.push(`run ${index + 1} mounted ${footprint.mountedTableRows} table rows`);
    if (footprint.domNodes > adminAppBenchmarkBaseline.expected.maximumDomNodes) failures.push(`run ${index + 1} mounted ${footprint.domNodes} DOM nodes`);
  }
  const summaries = new Map<string, { intervals: number[]; longTasks: number; unexpectedLayoutShift: number; unexpectedLayoutShiftSources: Set<string>; transientOverlayLayoutShift: number; retained: boolean }>();
  for (const run of runs) {
    for (const operation of run.operations) {
      const summary = summaries.get(operation.name) ?? { intervals: [], longTasks: 0, unexpectedLayoutShift: 0, unexpectedLayoutShiftSources: new Set<string>(), transientOverlayLayoutShift: 0, retained: true };
      summary.intervals.push(...operation.frames.intervals);
      summary.longTasks += operation.frames.longTasks.length;
      summary.unexpectedLayoutShift += operation.frames.unexpectedLayoutShift;
      for (const source of operation.frames.unexpectedLayoutShiftSources) summary.unexpectedLayoutShiftSources.add(source);
      summary.transientOverlayLayoutShift += operation.frames.transientOverlayLayoutShift;
      summary.retained = summary.retained && operation.retained;
      summaries.set(operation.name, summary);
    }
  }
  const operationSummary = [...summaries].map(([name, summary]) => Object.freeze({
    name,
    frames: summary.intervals.length,
    p99Ms: percentile(summary.intervals, 0.99),
    maximumMs: Math.max(...summary.intervals),
    over50ms: summary.intervals.filter(value => value > adminAppBenchmarkBaseline.frame.maximumMs).length,
    longTasks: summary.longTasks,
    unexpectedLayoutShift: summary.unexpectedLayoutShift,
    unexpectedLayoutShiftSources: Object.freeze([...summary.unexpectedLayoutShiftSources]),
    transientOverlayLayoutShift: summary.transientOverlayLayoutShift,
    retained: summary.retained,
  }));
  for (const summary of operationSummary) {
    if (summary.frames < adminAppBenchmarkBaseline.runs * 2) failures.push(`${summary.name} reported only ${summary.frames} frame intervals`);
    if (adminAppBenchmarkBaseline.frame.smoothOperations.includes(summary.name) && summary.p99Ms > adminAppBenchmarkBaseline.frame.smoothP99Ms) {
      failures.push(`${summary.name} p99 ${summary.p99Ms.toFixed(2)}ms exceeds ${adminAppBenchmarkBaseline.frame.smoothP99Ms}ms`);
    }
    if (summary.over50ms > 0) failures.push(`${summary.name} reported ${summary.over50ms} frames over ${adminAppBenchmarkBaseline.frame.maximumMs}ms`);
    if (summary.longTasks > adminAppBenchmarkBaseline.frame.longTasks) failures.push(`${summary.name} reported ${summary.longTasks} Long Tasks`);
    if (summary.unexpectedLayoutShift > adminAppBenchmarkBaseline.frame.unexpectedLayoutShift) failures.push(`${summary.name} reported unexpected layout shift ${summary.unexpectedLayoutShift}`);
    if (!summary.retained) failures.push(`${summary.name} replaced an accepted owner, focus, or draft`);
  }
  const artifact = Object.freeze({
    schema: 3,
    measurement: cpuMeasurement,
    qualification: capture ? "baseline-capture" : "regression",
    fixture: adminAppBenchmarkBaseline.fixture,
    recordedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    environment: Object.freeze({ runner: process.env.RUNNER_NAME ?? "local", runnerOS: process.env.RUNNER_OS ?? platform(), runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null, node: process.version, osRelease: release(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? "unknown", memoryBytes: totalmem(), browser: browser.version(), playwright: adminAppBenchmarkBaseline.playwright }),
    baseline: adminAppBenchmarkBaseline,
    initialReadyMedianMs: median(runs.map(run => run.initialReadyMs)),
    footprints: Object.freeze(runs.map(run => run.footprint)),
    calibrationsMs: Object.freeze(runs.map(run => run.calibrationMs)),
    calibrationTaskMs: Object.freeze(runs.map(run => run.calibrationTaskMs)),
    normalized,
    runs: Object.freeze(runs),
    rawMedianMs: Object.freeze({
      sidebarCollapse: median(runs.map(run => operation(run, "sidebar-collapse").frames.durationMs)),
      presetLayout: median(runs.map(run => operation(run, "preset-layout").frames.durationMs)),
      themeSwitch: median(runs.map(run => operation(run, "theme-switch").frames.durationMs)),
      commandPalette: median(runs.map(run => operation(run, "command-palette").frames.durationMs)),
      tableSearch: median(runs.map(run => operation(run, "table-search").frames.durationMs)),
      tableScroll: median(runs.map(run => operation(run, "table-scroll").frames.durationMs)),
      detailsDock: median(runs.map(run => operation(run, "details-dock").frames.durationMs)),
      detailsSheet: median(runs.map(run => operation(run, "details-sheet").frames.durationMs)),
      retainedRefresh: median(runs.map(run => operation(run, "retained-refresh").frames.durationMs)),
    }),
    operations: Object.freeze(operationSummary),
    failures: Object.freeze(failures),
  });
  const artifacts = resolve(process.cwd(), "test-results/bench");
  await mkdir(artifacts, { recursive: true });
  const artifactName = testInfo.repeatEachIndex === 0 ? "admin-app-benchmark.json" : `admin-app-benchmark.repeat-${testInfo.repeatEachIndex}.json`;
  await writeFile(resolve(artifacts, artifactName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(artifact.operations, null, 2)}\n`);
  expect(failures, failures.join("\n")).toEqual([]);
});
