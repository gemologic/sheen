import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { composerBenchmarkBaseline } from "./baselines/composer.v1.ts";
import type { ComposerNormalizedBaseline } from "./baselines/composer.v1.ts";

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

interface ComposerBenchmarkRun {
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
    document.documentElement.dataset.composerBenchmarkMeasure = "ready";
    let stopped = false;
    const stop = () => { stopped = true; };
    document.addEventListener("sheen-composer-benchmark-stop", stop, { once: true });
    let previous: number | undefined;
    while (!stopped) {
      const timestamp = await new Promise<number>(resolveFrame => requestAnimationFrame(resolveFrame));
      if (previous !== undefined) intervals.push(timestamp - previous);
      previous = timestamp;
    }
    observer.disconnect();
    document.removeEventListener("sheen-composer-benchmark-stop", stop);
    delete document.documentElement.dataset.composerBenchmarkMeasure;
    return { durationMs: performance.now() - start, intervals, longTasks, unexpectedLayoutShift };
  });
  await page.waitForFunction(() => document.documentElement.dataset.composerBenchmarkMeasure === "ready");
  let retained = false;
  let operationTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    retained = await Promise.race([
      operation(),
      new Promise<boolean>((_resolve, reject) => { operationTimeout = setTimeout(() => reject(new Error(`${name} did not settle within 10 seconds`)), 10_000); }),
    ]);
    await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())))));
  } finally {
    if (operationTimeout !== undefined) clearTimeout(operationTimeout);
    await page.evaluate(() => document.dispatchEvent(new Event("sheen-composer-benchmark-stop")));
  }
  return Object.freeze({ name, frames: await pending, retained });
}

function operation(run: ComposerBenchmarkRun, name: string): OperationSample {
  const sample = run.operations.find(candidate => candidate.name === name);
  if (!sample) throw new Error(`Missing Composer benchmark operation ${JSON.stringify(name)}`);
  return sample;
}

function normalizedSummary(runs: readonly ComposerBenchmarkRun[]): ComposerNormalizedBaseline {
  const normalized = (name: string) => median(runs.map(run => operation(run, name).frames.durationMs / run.calibrationMs));
  return Object.freeze({
    configureTitle: normalized("configure-title"),
    addRemove: normalized("add-remove"),
    themeSwitch: normalized("theme-switch"),
    viewportSwitch: normalized("viewport-switch"),
    queryEdit: normalized("query-edit"),
  });
}

function driftFailures(current: ComposerNormalizedBaseline): readonly string[] {
  const names: readonly (keyof ComposerNormalizedBaseline)[] = ["configureTitle", "addRemove", "themeSwitch", "viewportSwitch", "queryEdit"];
  return Object.freeze(names.flatMap(name => {
    const values = [...composerBenchmarkBaseline.history.map(entry => entry.normalized[name]), current[name]].slice(-4);
    return values.length === 4 && values.slice(1).every((value, index) => value > (values[index] ?? value)) ? [`${name} increased in three consecutive baselines`] : [];
  }));
}

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.getByRole("listbox").getByRole("option", { name: option, exact: true }).click();
}

async function runOnce(browser: Browser): Promise<ComposerBenchmarkRun> {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto("/composer");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const calibrationMs = await calibrate(page);
    const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
    const editor = page.locator(".loupe-composer-page");
    const app = frame.locator(".sheen-admin-app");
    const table = frame.getByRole("table", { name: "Northstar accounts", exact: true });
    const builder = frame.getByRole("region", { name: "Account query", exact: true });
    const draft = frame.getByRole("textbox", { name: "Search accounts", exact: true });
    await expect(app).toBeVisible();
    await expect(table).toBeVisible();
    await editor.evaluate(element => element.setAttribute("data-benchmark-editor", "retained"));
    await app.evaluate(element => element.setAttribute("data-benchmark-app", "retained"));
    await table.evaluate(element => element.setAttribute("data-benchmark-table", "retained"));
    await builder.evaluate(element => element.setAttribute("data-benchmark-builder", "retained"));
    await draft.fill("Benchmark draft");
    await draft.evaluate(element => element.setAttribute("data-benchmark-draft", "retained"));
    const shellRetained = async (): Promise<boolean> => await editor.getAttribute("data-benchmark-editor") === "retained"
      && await app.getAttribute("data-benchmark-app") === "retained"
      && await builder.getAttribute("data-benchmark-builder") === "retained"
      && await draft.getAttribute("data-benchmark-draft") === "retained"
      && await draft.inputValue() === "Benchmark draft";
    const retained = async (): Promise<boolean> => await shellRetained()
      && await table.getAttribute("data-benchmark-table") === "retained";
    const operations: OperationSample[] = [];

    operations.push(await measure(page, "configure-title", async () => {
      await frame.getByRole("group", { name: "PageHeader block", exact: true }).click();
      const title = page.getByRole("textbox", { name: "Title", exact: true });
      await title.fill("Benchmark accounts");
      await title.press("Tab");
      await expect(frame.getByRole("heading", { name: "Benchmark accounts", level: 1 })).toBeVisible();
      return retained();
    }));

    const nodes = frame.locator("[data-composer-node-id]");
    const nodeCount = await nodes.count();
    operations.push(await measure(page, "add-remove", async () => {
      await page.locator('[data-composer-palette-component="Text"]').getByRole("button", { name: "Add", exact: true }).click();
      await expect(nodes).toHaveCount(nodeCount + 1);
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await expect(nodes).toHaveCount(nodeCount);
      return retained();
    }));

    const scope = frame.locator(".loupe-composer-preview-scope");
    operations.push(await measure(page, "theme-switch", async () => {
      await choose(page, "Theme", "Paper");
      await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
      return retained();
    }));

    const iframe = page.locator('iframe[title="Editable AdminApp preview"]');
    await iframe.evaluate(element => element.setAttribute("data-benchmark-frame", "retained"));
    operations.push(await measure(page, "viewport-switch", async () => {
      await choose(page, "Viewport", "Phone, 390 × 844");
      await expect(page.locator(".loupe-composer-viewport")).toHaveCSS("width", "390px");
      return await iframe.getAttribute("data-benchmark-frame") === "retained" && await shellRetained();
    }));
    await choose(page, "Viewport", "Desktop, 1440 × 900");
    await expect(table).toBeVisible();
    await table.evaluate(element => element.setAttribute("data-benchmark-table", "retained"));

    const initialRule = builder.getByRole("group", { name: "Query rule: Status", exact: true });
    await initialRule.evaluate(element => element.setAttribute("data-benchmark-rule", "retained"));
    const retainedRow = table.locator('tbody tr[data-row-id="record-0001"]');
    await retainedRow.evaluate(element => element.setAttribute("data-benchmark-row", "retained"));
    operations.push(await measure(page, "query-edit", async () => {
      await builder.getByRole("button", { name: "Add rule", exact: true }).first().click();
      const accountRule = builder.getByRole("group", { name: "Query rule: Account", exact: true });
      await accountRule.getByRole("textbox", { name: "Value", exact: true }).fill("Aperture 001");
      await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(1);
      return await retained()
        && await initialRule.getAttribute("data-benchmark-rule") === "retained"
        && await retainedRow.getAttribute("data-benchmark-row") === "retained";
    }));
    return Object.freeze({ calibrationMs, operations: Object.freeze(operations) });
  } finally {
    await context.close();
  }
}

test("Composer edits retain the application and satisfy calibrated frame stability gates", async ({ browser }) => {
  test.setTimeout(300_000);
  const runs: ComposerBenchmarkRun[] = [];
  for (let index = 0; index < composerBenchmarkBaseline.runs; index += 1) runs.push(await runOnce(browser));
  const normalized = normalizedSummary(runs);
  const latest = composerBenchmarkBaseline.history.at(-1);
  if (!latest) throw new Error("Composer benchmark baseline history must not be empty");
  const failures = [...driftFailures(normalized)];
  const metricNames: readonly (keyof ComposerNormalizedBaseline)[] = ["configureTitle", "addRemove", "themeSwitch", "viewportSwitch", "queryEdit"];
  for (const name of metricNames) {
    const maximum = latest.normalized[name] * (1 + composerBenchmarkBaseline.maximumRegression);
    if (normalized[name] > maximum) failures.push(`${name} normalized median ${normalized[name].toFixed(4)} exceeds ${maximum.toFixed(4)}`);
  }
  const summaries = new Map<string, { intervals: number[]; longTasks: number; unexpectedLayoutShift: number; retained: boolean }>();
  for (const run of runs) for (const sample of run.operations) {
    const summary = summaries.get(sample.name) ?? { intervals: [], longTasks: 0, unexpectedLayoutShift: 0, retained: true };
    summary.intervals.push(...sample.frames.intervals);
    summary.longTasks += sample.frames.longTasks.length;
    summary.unexpectedLayoutShift += sample.frames.unexpectedLayoutShift;
    summary.retained = summary.retained && sample.retained;
    summaries.set(sample.name, summary);
  }
  const operationSummary = [...summaries].map(([name, summary]) => Object.freeze({
    name,
    frames: summary.intervals.length,
    p99Ms: percentile(summary.intervals, 0.99),
    maximumMs: Math.max(...summary.intervals),
    over50ms: summary.intervals.filter(value => value > composerBenchmarkBaseline.frame.maximumMs).length,
    longTasks: summary.longTasks,
    unexpectedLayoutShift: summary.unexpectedLayoutShift,
    retained: summary.retained,
  }));
  for (const summary of operationSummary) {
    if (summary.frames < composerBenchmarkBaseline.runs * 2) failures.push(`${summary.name} reported only ${summary.frames} frame intervals`);
    if (summary.p99Ms > composerBenchmarkBaseline.frame.p99Ms) failures.push(`${summary.name} p99 ${summary.p99Ms.toFixed(2)}ms exceeds ${composerBenchmarkBaseline.frame.p99Ms}ms`);
    if (summary.over50ms > 0) failures.push(`${summary.name} reported ${summary.over50ms} frames over ${composerBenchmarkBaseline.frame.maximumMs}ms`);
    if (summary.longTasks > composerBenchmarkBaseline.frame.longTasks) failures.push(`${summary.name} reported ${summary.longTasks} Long Tasks`);
    if (summary.unexpectedLayoutShift > composerBenchmarkBaseline.frame.unexpectedLayoutShift) failures.push(`${summary.name} reported unexpected layout shift ${summary.unexpectedLayoutShift}`);
    if (!summary.retained) failures.push(`${summary.name} replaced an accepted editor, application, table, rule, row, or draft owner`);
  }
  const artifact = Object.freeze({
    schema: 1,
    recordedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    environment: Object.freeze({ runner: process.env.RUNNER_NAME ?? "local", runnerOS: process.env.RUNNER_OS ?? platform(), runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null, node: process.version, osRelease: release(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? "unknown", memoryBytes: totalmem(), browser: browser.version(), playwright: composerBenchmarkBaseline.playwright }),
    baseline: composerBenchmarkBaseline,
    calibrationsMs: Object.freeze(runs.map(run => run.calibrationMs)),
    normalized,
    rawMedianMs: Object.freeze({
      configureTitle: median(runs.map(run => operation(run, "configure-title").frames.durationMs)),
      addRemove: median(runs.map(run => operation(run, "add-remove").frames.durationMs)),
      themeSwitch: median(runs.map(run => operation(run, "theme-switch").frames.durationMs)),
      viewportSwitch: median(runs.map(run => operation(run, "viewport-switch").frames.durationMs)),
      queryEdit: median(runs.map(run => operation(run, "query-edit").frames.durationMs)),
    }),
    operations: Object.freeze(operationSummary),
    failures: Object.freeze(failures),
  });
  const artifacts = resolve(process.cwd(), "test-results/bench");
  await mkdir(artifacts, { recursive: true });
  await writeFile(resolve(artifacts, "composer-benchmark.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ normalized: artifact.normalized, operations: artifact.operations }, null, 2)}\n`);
  expect(failures, failures.join("\n")).toEqual([]);
});
