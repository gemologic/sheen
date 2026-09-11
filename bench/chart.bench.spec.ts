import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { chartBenchmarkBaseline } from "./baselines/chart.v1.ts";
import type { ChartNormalizedBaseline } from "./baselines/chart.v1.ts";
import { chartBenchmarkFixture } from "./fixtures/chart.ts";

interface FrameSample {
  readonly durationMs: number;
  readonly intervals: readonly number[];
  readonly longTasks: readonly number[];
  readonly unexpectedLayoutShift: number;
  readonly transientOverlayLayoutShift: number;
}

interface OperationResult {
  readonly retained: boolean;
  readonly workMs?: number;
  readonly updates?: number;
}

interface OperationSample extends OperationResult {
  readonly name: string;
  readonly frames: FrameSample;
}

interface ChartBenchmarkRun {
  readonly calibrationMs: number;
  readonly operations: readonly OperationSample[];
}

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
    for (let index = 0; index < 1_000_000; index++) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
    return state;
  });
  return page.evaluate(() => {
    let state = 0x12345678;
    const start = performance.now();
    for (let index = 0; index < 12_000_000; index++) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
    const duration = performance.now() - start;
    if (!Number.isFinite(state)) throw new Error("Calibration checksum failed");
    return duration;
  });
}

async function measure(page: Page, name: string, operation: () => Promise<OperationResult>): Promise<OperationSample> {
  const pending = page.evaluate(async (): Promise<FrameSample> => {
    const start = performance.now();
    const intervals: number[] = [];
    const longTasks: number[] = [];
    let unexpectedLayoutShift = 0;
    let transientOverlayLayoutShift = 0;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask") longTasks.push(entry.duration);
        if (entry.entryType !== "layout-shift") continue;
        const serialized: unknown = entry.toJSON();
        if (typeof serialized !== "object" || serialized === null || !("value" in serialized) || !("hadRecentInput" in serialized)) continue;
        if (serialized.hadRecentInput !== false || typeof serialized.value !== "number") continue;
        const rawSources: unknown = Reflect.get(entry, "sources");
        const transient = Array.isArray(rawSources) && rawSources.length > 0 && rawSources.every(source => {
          if (typeof source !== "object" || source === null) return false;
          const node: unknown = Reflect.get(source, "node");
          return node instanceof Element && node.closest(".sheen-chart-tooltip, .u-cursor-x, .u-cursor-y, .u-cursor-pt, .u-select") !== null;
        });
        if (transient) transientOverlayLayoutShift += serialized.value;
        else unexpectedLayoutShift += serialized.value;
      }
    });
    const entryTypes = PerformanceObserver.supportedEntryTypes.filter(type => type === "longtask" || type === "layout-shift");
    if (entryTypes.length > 0) observer.observe({ entryTypes });
    document.documentElement.dataset.chartBenchmarkMeasure = "ready";
    let stopped = false;
    const stop = (): void => { stopped = true; };
    document.addEventListener("sheen-chart-benchmark-stop", stop, { once: true });
    let previous: number | undefined;
    while (!stopped) {
      const timestamp = await new Promise<number>(resolveFrame => requestAnimationFrame(resolveFrame));
      if (previous !== undefined) intervals.push(timestamp - previous);
      previous = timestamp;
    }
    observer.disconnect();
    document.removeEventListener("sheen-chart-benchmark-stop", stop);
    delete document.documentElement.dataset.chartBenchmarkMeasure;
    return { durationMs: performance.now() - start, intervals, longTasks, unexpectedLayoutShift, transientOverlayLayoutShift };
  });
  await page.waitForFunction(() => document.documentElement.dataset.chartBenchmarkMeasure === "ready");
  let result: OperationResult = { retained: false };
  try {
    result = await operation();
    await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())))));
  } finally {
    await page.evaluate(() => document.dispatchEvent(new Event("sheen-chart-benchmark-stop")));
  }
  return Object.freeze({ name, frames: await pending, ...result });
}

function operation(run: ChartBenchmarkRun, name: string): OperationSample {
  const sample = run.operations.find(candidate => candidate.name === name);
  if (!sample) throw new Error(`Missing chart benchmark operation ${JSON.stringify(name)}`);
  return sample;
}

function work(run: ChartBenchmarkRun, name: string): number {
  const duration = operation(run, name).workMs;
  if (duration === undefined) throw new Error(`Chart benchmark operation ${JSON.stringify(name)} did not report work time`);
  return duration;
}

function normalizedSummary(runs: readonly ChartBenchmarkRun[]): ChartNormalizedBaseline {
  const normalized = (name: string) => median(runs.map(run => work(run, name) / run.calibrationMs));
  return Object.freeze({ initialDraw: normalized("initial-draw"), sparkline: normalized("sparkline"), themeSwitch: normalized("theme-switch") });
}

function driftFailures(current: ChartNormalizedBaseline): readonly string[] {
  const names: readonly (keyof ChartNormalizedBaseline)[] = ["initialDraw", "sparkline", "themeSwitch"];
  const failures: string[] = [];
  for (const name of names) {
    const values = [...chartBenchmarkBaseline.history.map(entry => entry.normalized[name]), current[name]].slice(-4);
    if (values.length === 4 && values.slice(1).every((value, index) => value > (values[index] ?? value))) failures.push(`${name} increased in three consecutive baselines`);
  }
  return Object.freeze(failures);
}

async function runOnce(browser: Browser): Promise<ChartBenchmarkRun> {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto("/chart-benchmark");
    await expect(page.locator("main")).toHaveAttribute("data-chart-benchmark-ready", "true");
    const calibrationMs = await calibrate(page);
    const operations: OperationSample[] = [];

    operations.push(await measure(page, "initial-draw", () => page.evaluate(async (): Promise<OperationResult> => {
      const trigger = document.querySelector("[data-chart-benchmark-large]");
      if (!(trigger instanceof HTMLButtonElement)) throw new Error("Missing large-chart benchmark trigger");
      const start = performance.now();
      trigger.click();
      const deadline = start + 15_000;
      while (!document.querySelector('.sheen-time-series[data-enhanced="true"] canvas')) {
        if (performance.now() > deadline) throw new Error("Timed out waiting for the 100k-point chart");
        await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
      }
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
      const chart = document.querySelector(".sheen-time-series");
      const canvas = chart?.querySelector("canvas");
      const tooltip = chart?.querySelector(".sheen-chart-tooltip");
      canvas?.setAttribute("data-chart-benchmark-retained", "true");
      tooltip?.setAttribute("data-chart-benchmark-retained", "true");
      return { retained: canvas instanceof HTMLCanvasElement && tooltip instanceof HTMLDivElement, workMs: performance.now() - start };
    })));

    const chart = page.locator(".sheen-time-series");
    const over = chart.locator(".u-over");
    const bounds = await over.boundingBox();
    if (!bounds) throw new Error("Missing large-chart interaction geometry");
    operations.push(await measure(page, "tooltip", async () => {
      const before = Number(await chart.locator(".sheen-chart-tooltip").getAttribute("data-updates") ?? "0");
      for (let step = 0; step < 120; step++) {
        await page.mouse.move(bounds.x + bounds.width * (0.05 + step / 132), bounds.y + bounds.height * 0.5);
        await page.waitForTimeout(chartBenchmarkFixture.streamIntervalMs);
      }
      const tooltip = chart.locator(".sheen-chart-tooltip");
      const updates = Number(await tooltip.getAttribute("data-updates") ?? "0") - before;
      return Object.freeze({
        retained: await chart.locator('canvas[data-chart-benchmark-retained="true"]').count() === 1
          && await tooltip.getAttribute("data-chart-benchmark-retained") === "true",
        updates,
      });
    }));

    operations.push(await measure(page, "pan-zoom", async () => {
      await page.mouse.move(bounds.x + bounds.width * 0.15, bounds.y + bounds.height * 0.5);
      await page.mouse.down();
      for (let step = 1; step <= 120; step++) {
        await page.mouse.move(bounds.x + bounds.width * (0.15 + step * 0.7 / 120), bounds.y + bounds.height * 0.5);
        await page.waitForTimeout(chartBenchmarkFixture.streamIntervalMs);
      }
      await page.mouse.up();
      await expect(chart).toHaveAttribute("data-zoomed", "true");
      return Object.freeze({ retained: await chart.locator('canvas[data-chart-benchmark-retained="true"]').count() === 1 });
    }));

    await page.locator("[data-chart-benchmark-streaming]").click();
    const streaming = page.locator('[data-stream-state="idle"]');
    await expect(streaming.locator('.sheen-time-series[data-enhanced="true"]')).toBeVisible();
    await streaming.locator("canvas").evaluate(element => element.setAttribute("data-chart-benchmark-retained", "true"));
    operations.push(await measure(page, "streaming", async () => {
      await streaming.locator("[data-chart-benchmark-stream]").click();
      await expect(page.locator('[data-stream-state="done"]')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("[data-chart-benchmark-stream-size]")).toHaveText(String(chartBenchmarkFixture.streamInitialPoints + chartBenchmarkFixture.streamSamples));
      return Object.freeze({
        retained: await page.locator('[data-stream-state="done"] canvas[data-chart-benchmark-retained="true"]').count() === 1,
        updates: Number(await page.locator("[data-chart-benchmark-stream-size]").textContent()) - chartBenchmarkFixture.streamInitialPoints,
      });
    }));

    operations.push(await measure(page, "sparkline", () => page.evaluate(async (): Promise<OperationResult> => {
      const trigger = document.querySelector("[data-chart-benchmark-sparkline]");
      if (!(trigger instanceof HTMLButtonElement)) throw new Error("Missing Sparkline benchmark trigger");
      const start = performance.now();
      trigger.click();
      await Promise.resolve();
      const sparkline = document.querySelector('[data-chart-benchmark-sparkline-mounted="true"] .sheen-sparkline');
      return { retained: sparkline instanceof SVGSVGElement, workMs: performance.now() - start };
    })));

    await page.locator("[data-chart-benchmark-theme-fixture]").click();
    const themeScope = page.locator(".loupe-chart-benchmark-theme-scope");
    await expect(themeScope.locator('.sheen-time-series[data-enhanced="true"]')).toHaveCount(chartBenchmarkFixture.themeCharts);
    await themeScope.locator("canvas").evaluateAll(elements => elements.forEach(element => element.setAttribute("data-chart-benchmark-retained", "true")));
    operations.push(await measure(page, "theme-switch", () => page.evaluate(async (): Promise<OperationResult> => {
      const scope = document.querySelector(".loupe-chart-benchmark-theme-scope");
      const trigger = scope?.querySelector("[data-chart-benchmark-theme]");
      if (!(scope instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) throw new Error("Missing theme benchmark fixture");
      const start = performance.now();
      trigger.click();
      const deadline = start + 5_000;
      while (scope.getAttribute("data-sheen-mode") !== "light" || scope.getAttribute("data-sheen-accent") !== "violet") {
        if (performance.now() > deadline) throw new Error("Timed out waiting for chart theme acceptance");
        await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
      }
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
      const canvases = [...scope.querySelectorAll("canvas")];
      return { retained: canvases.length === 20 && canvases.every(canvas => canvas.getAttribute("data-chart-benchmark-retained") === "true"), workMs: performance.now() - start };
    })));

    return Object.freeze({ calibrationMs, operations: Object.freeze(operations) });
  } finally {
    await context.close();
  }
}

test("charts satisfy calibrated operation and absolute frame-stability gates", async ({ browser }) => {
  test.setTimeout(300_000);
  const runs: ChartBenchmarkRun[] = [];
  for (let index = 0; index < chartBenchmarkBaseline.runs; index++) runs.push(await runOnce(browser));
  const failures: string[] = [];
  const normalized = normalizedSummary(runs);
  const latest = chartBenchmarkBaseline.history.at(-1);
  if (!latest) throw new Error("Chart benchmark baseline history must not be empty");
  const metricNames: readonly (keyof ChartNormalizedBaseline)[] = ["initialDraw", "sparkline", "themeSwitch"];
  for (const name of metricNames) {
    const maximum = latest.normalized[name] * (1 + chartBenchmarkBaseline.maximumRegression);
    if (normalized[name] > maximum) failures.push(`${name} normalized median ${normalized[name].toFixed(4)} exceeds ${maximum.toFixed(4)}`);
  }

  const summaries = new Map<string, { intervals: number[]; longTasks: number; unexpectedLayoutShift: number; transientOverlayLayoutShift: number; retained: boolean; updates: number[] }>();
  for (const run of runs) for (const sample of run.operations) {
    const summary = summaries.get(sample.name) ?? { intervals: [], longTasks: 0, unexpectedLayoutShift: 0, transientOverlayLayoutShift: 0, retained: true, updates: [] };
    summary.intervals.push(...sample.frames.intervals);
    summary.longTasks += sample.frames.longTasks.length;
    summary.unexpectedLayoutShift += sample.frames.unexpectedLayoutShift;
    summary.transientOverlayLayoutShift += sample.frames.transientOverlayLayoutShift;
    summary.retained = summary.retained && sample.retained;
    if (sample.updates !== undefined) summary.updates.push(sample.updates);
    summaries.set(sample.name, summary);
  }
  const operationSummary = [...summaries].map(([name, summary]) => Object.freeze({
    name,
    frames: summary.intervals.length,
    p99Ms: percentile(summary.intervals, 0.99),
    maximumMs: Math.max(...summary.intervals),
    over50ms: summary.intervals.filter(value => value > chartBenchmarkBaseline.frame.maximumMs).length,
    longTasks: summary.longTasks,
    unexpectedLayoutShift: summary.unexpectedLayoutShift,
    transientOverlayLayoutShift: summary.transientOverlayLayoutShift,
    retained: summary.retained,
    updates: summary.updates,
  }));
  const continuousOperations: ReadonlySet<string> = new Set(["tooltip", "pan-zoom", "streaming", "theme-switch"]);
  for (const summary of operationSummary) {
    if (summary.frames < chartBenchmarkBaseline.runs * 2) failures.push(`${summary.name} reported only ${summary.frames} frame intervals`);
    if (continuousOperations.has(summary.name) && summary.p99Ms > chartBenchmarkBaseline.frame.p99Ms) failures.push(`${summary.name} p99 ${summary.p99Ms.toFixed(2)}ms exceeds ${chartBenchmarkBaseline.frame.p99Ms}ms`);
    if (summary.over50ms > 0) failures.push(`${summary.name} reported ${summary.over50ms} frames over ${chartBenchmarkBaseline.frame.maximumMs}ms`);
    if (summary.longTasks > chartBenchmarkBaseline.frame.longTasks) failures.push(`${summary.name} reported ${summary.longTasks} Long Tasks`);
    if (summary.unexpectedLayoutShift > chartBenchmarkBaseline.frame.unexpectedLayoutShift) failures.push(`${summary.name} reported unexpected layout shift ${summary.unexpectedLayoutShift}`);
    if (!summary.retained) failures.push(`${summary.name} replaced an accepted chart owner`);
  }
  const tooltip = operationSummary.find(summary => summary.name === "tooltip");
  const streaming = operationSummary.find(summary => summary.name === "streaming");
  if (!tooltip || tooltip.updates.some(value => value < 100)) failures.push("tooltip did not publish at least 100 retained updates in every run");
  if (!streaming || streaming.updates.some(value => value !== chartBenchmarkFixture.streamSamples)) failures.push("streaming did not publish every scheduled sample in every run");
  failures.push(...driftFailures(normalized));

  const artifact = Object.freeze({
    schema: 1,
    recordedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    environment: Object.freeze({ runner: process.env.RUNNER_NAME ?? "local", runnerOS: process.env.RUNNER_OS ?? platform(), runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null, node: process.version, osRelease: release(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? "unknown", memoryBytes: totalmem(), browser: browser.version(), playwright: chartBenchmarkBaseline.playwright }),
    fixture: chartBenchmarkFixture,
    baseline: chartBenchmarkBaseline,
    calibrationsMs: Object.freeze(runs.map(run => run.calibrationMs)),
    normalized,
    rawMedianMs: Object.freeze({ initialDraw: median(runs.map(run => work(run, "initial-draw"))), sparkline: median(runs.map(run => work(run, "sparkline"))), themeSwitch: median(runs.map(run => work(run, "theme-switch"))) }),
    operations: Object.freeze(operationSummary),
    rawRuns: runs,
    failures: Object.freeze(failures),
  });
  const artifacts = resolve(process.cwd(), "test-results/bench");
  await mkdir(artifacts, { recursive: true });
  await writeFile(resolve(artifacts, "chart-benchmark.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ normalized: artifact.normalized, rawMedianMs: artifact.rawMedianMs, operations: artifact.operations }, null, 2)}\n`);
  expect(failures, failures.join("\n")).toEqual([]);
});
