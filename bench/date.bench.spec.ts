import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { cpus, platform, release, totalmem } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { dateBenchmarkBaseline } from "./baselines/date.v1.ts";
import type { DateNormalizedBaseline } from "./baselines/date.v1.ts";

interface FrameSample {
  readonly durationMs: number;
  readonly intervals: readonly number[];
  readonly longTasks: readonly number[];
  readonly unexpectedLayoutShift: number;
}

interface OperationSample {
  readonly name: string;
  readonly frames: FrameSample;
  readonly retained: boolean;
}

interface DateBenchmarkRun {
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
  return page.evaluate(() => {
    let state = 0x12345678;
    const start = performance.now();
    for (let index = 0; index < 12_000_000; index += 1) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
    const duration = performance.now() - start;
    if (!Number.isFinite(state)) throw new Error("Calibration checksum failed");
    return duration;
  });
}

async function measure(page: Page, name: string, operation: () => Promise<boolean>): Promise<OperationSample> {
  const pending = page.evaluate(async (): Promise<FrameSample> => {
    const start = performance.now();
    const intervals: number[] = [];
    const longTasks: number[] = [];
    let unexpectedLayoutShift = 0;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask") longTasks.push(entry.duration);
        if (entry.entryType !== "layout-shift") continue;
        const serialized: unknown = entry.toJSON();
        if (typeof serialized !== "object" || serialized === null || !("value" in serialized) || !("hadRecentInput" in serialized)) continue;
        if (serialized.hadRecentInput === false && typeof serialized.value === "number") unexpectedLayoutShift += serialized.value;
      }
    });
    const entryTypes = PerformanceObserver.supportedEntryTypes.filter(type => type === "longtask" || type === "layout-shift");
    if (entryTypes.length > 0) observer.observe({ entryTypes });
    document.documentElement.dataset.dateBenchmarkMeasure = "ready";
    let stopped = false;
    const stop = () => { stopped = true; };
    document.addEventListener("sheen-date-benchmark-stop", stop, { once: true });
    let previous: number | undefined;
    while (!stopped) {
      const timestamp = await new Promise<number>(resolveFrame => requestAnimationFrame(resolveFrame));
      if (previous !== undefined) intervals.push(timestamp - previous);
      previous = timestamp;
    }
    observer.disconnect();
    document.removeEventListener("sheen-date-benchmark-stop", stop);
    delete document.documentElement.dataset.dateBenchmarkMeasure;
    return { durationMs: performance.now() - start, intervals, longTasks, unexpectedLayoutShift };
  });
  await page.waitForFunction(() => document.documentElement.dataset.dateBenchmarkMeasure === "ready");
  let retained = false;
  try {
    retained = await operation();
    await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())))));
  } finally {
    await page.evaluate(() => document.dispatchEvent(new Event("sheen-date-benchmark-stop")));
  }
  return Object.freeze({ name, frames: await pending, retained });
}

function operation(run: DateBenchmarkRun, name: string): OperationSample {
  const sample = run.operations.find(candidate => candidate.name === name);
  if (!sample) throw new Error(`Missing date benchmark operation ${JSON.stringify(name)}`);
  return sample;
}

function normalizedSummary(runs: readonly DateBenchmarkRun[]): DateNormalizedBaseline {
  const normalized = (name: string) => median(runs.map(run => operation(run, name).frames.durationMs / run.calibrationMs));
  return Object.freeze({
    openPicker: normalized("open-picker"),
    keyboardDate: normalized("keyboard-date"),
    zoneFilter: normalized("zone-filter"),
    retainedRefresh: normalized("retained-refresh"),
    dstResolution: normalized("dst-resolution"),
  });
}

function driftFailures(current: DateNormalizedBaseline): readonly string[] {
  const names: readonly (keyof DateNormalizedBaseline)[] = ["openPicker", "keyboardDate", "zoneFilter", "retainedRefresh", "dstResolution"];
  return Object.freeze(names.flatMap(name => {
    const values = [...dateBenchmarkBaseline.history.map(entry => entry.normalized[name]), current[name]].slice(-4);
    return values.length === 4 && values.slice(1).every((value, index) => value > (values[index] ?? value)) ? [`${name} increased in three consecutive baselines`] : [];
  }));
}

async function runOnce(browser: Browser): Promise<DateBenchmarkRun> {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto("/date-time");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const calibrationMs = await calibrate(page);
    const fields = page.locator(".loupe-date-grid > .sheen-surface").first();
    const instant = page.locator(".loupe-date-grid > .sheen-surface").nth(2);
    const trigger = fields.getByRole("button", { name: "Open calendar", exact: true }).first();
    await fields.evaluate(element => element.setAttribute("data-date-benchmark-fields", "retained"));
    await trigger.evaluate(element => element.setAttribute("data-date-benchmark-trigger", "retained"));
    const retainedTrigger = page.locator('[data-date-benchmark-trigger="retained"]');
    const operations: OperationSample[] = [];

    operations.push(await measure(page, "open-picker", async () => {
      await trigger.click();
      await expect(page.locator('.sheen-date-content[data-state="open"]')).toBeVisible();
      return await fields.getAttribute("data-date-benchmark-fields") === "retained"
        && await retainedTrigger.count() === 1;
    }));

    operations.push(await measure(page, "keyboard-date", async () => {
      const selected = page.getByRole("button", { name: "Selected date. Sunday, November 1, 2026", exact: true });
      await selected.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      await expect(page.locator('input[name="settlementDate"]')).toHaveValue("2026-11-02");
      return await fields.getAttribute("data-date-benchmark-fields") === "retained"
        && await retainedTrigger.count() === 1;
    }));

    const zoneInput = instant.getByRole("combobox", { name: "Time zone", exact: true });
    await instant.evaluate(element => element.setAttribute("data-date-benchmark-instant", "retained"));
    await zoneInput.evaluate(element => element.setAttribute("data-date-benchmark-zone", "retained"));
    operations.push(await measure(page, "zone-filter", async () => {
      await zoneInput.fill("New");
      await expect(page.getByRole("option", { name: "New York · r1", exact: true })).toBeVisible();
      return await instant.getAttribute("data-date-benchmark-instant") === "retained"
        && await zoneInput.getAttribute("data-date-benchmark-zone") === "retained"
        && await zoneInput.inputValue() === "New";
    }));

    const oldOption = page.getByRole("option", { name: "New York · r1", exact: true });
    await oldOption.evaluate(element => element.setAttribute("data-date-benchmark-option", "retained"));
    operations.push(await measure(page, "retained-refresh", async () => {
      return page.evaluate(async () => {
        const input = document.querySelector('[data-date-benchmark-zone="retained"]');
        const option = document.querySelector('[data-date-benchmark-option="retained"]');
        const refresh = [...document.querySelectorAll("button")].find(element => element.textContent?.trim() === "Refresh time zones");
        const revision = [...document.querySelectorAll("output")].find(element => element.getAttribute("aria-label") === "Time-zone revision");
        if (!(input instanceof HTMLInputElement) || !(option instanceof HTMLElement) || !(refresh instanceof HTMLButtonElement) || !(revision instanceof HTMLOutputElement)) return false;
        refresh.click();
        const deadline = performance.now() + 5_000;
        let sawPending = false;
        let retained = true;
        while (!revision.textContent?.includes("Revision 2")) {
          if (performance.now() > deadline) throw new Error("Timed out waiting for the retained time-zone refresh");
          await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
          if (input.getAttribute("aria-busy") === "true") {
            sawPending = true;
            retained = retained && input.isConnected && option.isConnected && document.activeElement === input && input.value === "New";
          }
        }
        return sawPending && retained && input.isConnected && input.value === "New";
      });
    }));

    operations.push(await measure(page, "dst-resolution", async () => {
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      const alert = instant.getByRole("alert");
      await expect(alert).toContainText("occurs twice");
      await alert.getByRole("button", { name: /^Later:/u }).click();
      await expect(page.locator('input[name="startsAt"]')).toHaveValue("2026-11-01T06:30:00.000Z[America/New_York]");
      return await instant.getAttribute("data-date-benchmark-instant") === "retained"
        && await zoneInput.getAttribute("data-date-benchmark-zone") === "retained";
    }));
    return Object.freeze({ calibrationMs, operations: Object.freeze(operations) });
  } finally {
    await context.close();
  }
}

test("date overlays retain owners and satisfy calibrated frame stability gates", async ({ browser }) => {
  test.setTimeout(300_000);
  const runs: DateBenchmarkRun[] = [];
  for (let index = 0; index < dateBenchmarkBaseline.runs; index += 1) runs.push(await runOnce(browser));
  const normalized = normalizedSummary(runs);
  const failures = [...driftFailures(normalized)];
  const latest = dateBenchmarkBaseline.history.at(-1);
  if (!latest) throw new Error("Date benchmark baseline history must not be empty");
  const metricNames: readonly (keyof DateNormalizedBaseline)[] = ["openPicker", "keyboardDate", "zoneFilter", "retainedRefresh", "dstResolution"];
  for (const name of metricNames) {
    const maximum = latest.normalized[name] * (1 + dateBenchmarkBaseline.maximumRegression);
    if (normalized[name] > maximum) failures.push(`${name} normalized median ${normalized[name].toFixed(4)} exceeds ${maximum.toFixed(4)}`);
  }
  const summaries = new Map<string, { intervals: number[]; longTasks: number; unexpectedLayoutShift: number; retained: boolean }>();
  for (const run of runs) {
    for (const sample of run.operations) {
      const summary = summaries.get(sample.name) ?? { intervals: [], longTasks: 0, unexpectedLayoutShift: 0, retained: true };
      summary.intervals.push(...sample.frames.intervals);
      summary.longTasks += sample.frames.longTasks.length;
      summary.unexpectedLayoutShift += sample.frames.unexpectedLayoutShift;
      summary.retained = summary.retained && sample.retained;
      summaries.set(sample.name, summary);
    }
  }
  const operationSummary = [...summaries].map(([name, summary]) => Object.freeze({
    name,
    frames: summary.intervals.length,
    p99Ms: percentile(summary.intervals, 0.99),
    maximumMs: Math.max(...summary.intervals),
    over50ms: summary.intervals.filter(value => value > dateBenchmarkBaseline.frame.maximumMs).length,
    longTasks: summary.longTasks,
    unexpectedLayoutShift: summary.unexpectedLayoutShift,
    retained: summary.retained,
  }));
  for (const summary of operationSummary) {
    if (summary.frames < dateBenchmarkBaseline.runs * 2) failures.push(`${summary.name} reported only ${summary.frames} frame intervals`);
    if (dateBenchmarkBaseline.frame.smoothOperations.includes(summary.name) && summary.p99Ms > dateBenchmarkBaseline.frame.p99Ms) failures.push(`${summary.name} p99 ${summary.p99Ms.toFixed(2)}ms exceeds ${dateBenchmarkBaseline.frame.p99Ms}ms`);
    if (summary.over50ms > 0) failures.push(`${summary.name} reported ${summary.over50ms} frames over ${dateBenchmarkBaseline.frame.maximumMs}ms`);
    if (summary.longTasks > dateBenchmarkBaseline.frame.longTasks) failures.push(`${summary.name} reported ${summary.longTasks} Long Tasks`);
    if (summary.unexpectedLayoutShift > dateBenchmarkBaseline.frame.unexpectedLayoutShift) failures.push(`${summary.name} reported unexpected layout shift ${summary.unexpectedLayoutShift}`);
    if (!summary.retained) failures.push(`${summary.name} replaced an accepted owner, focus, or query`);
  }
  const artifact = Object.freeze({
    schema: 1,
    recordedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    environment: Object.freeze({ runner: process.env.RUNNER_NAME ?? "local", runnerOS: process.env.RUNNER_OS ?? platform(), runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null, node: process.version, osRelease: release(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? "unknown", memoryBytes: totalmem(), browser: browser.version(), playwright: dateBenchmarkBaseline.playwright }),
    baseline: dateBenchmarkBaseline,
    calibrationsMs: Object.freeze(runs.map(run => run.calibrationMs)),
    normalized,
    rawMedianMs: Object.freeze({
      openPicker: median(runs.map(run => operation(run, "open-picker").frames.durationMs)),
      keyboardDate: median(runs.map(run => operation(run, "keyboard-date").frames.durationMs)),
      zoneFilter: median(runs.map(run => operation(run, "zone-filter").frames.durationMs)),
      retainedRefresh: median(runs.map(run => operation(run, "retained-refresh").frames.durationMs)),
      dstResolution: median(runs.map(run => operation(run, "dst-resolution").frames.durationMs)),
    }),
    operations: Object.freeze(operationSummary),
    failures: Object.freeze(failures),
  });
  const artifacts = resolve(process.cwd(), "test-results/bench");
  await mkdir(artifacts, { recursive: true });
  await writeFile(resolve(artifacts, "date-benchmark.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ normalized: artifact.normalized, operations: artifact.operations }, null, 2)}\n`);
  expect(failures, failures.join("\n")).toEqual([]);
});
