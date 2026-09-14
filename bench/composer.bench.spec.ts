import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { finishFrameSampling, settleBenchmarkRendering, startFrameSampling } from "./frame-sampling.ts";
import type { FrameSample } from "./frame-sampling.ts";
import { cpuMeasurement, createBrowserCpuClock, isCpuBaselineCapture } from "./cpu-sampling.ts";
import type { BrowserCpuClock } from "./cpu-sampling.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, loadavg, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { composerBenchmarkBaseline } from "./baselines/composer.v2.ts";
import type { ComposerNormalizedBaseline } from "./baselines/composer.v2.ts";

interface OperationSample {
  readonly name: string;
  readonly taskMs: number;
  readonly frames: FrameSample;
  readonly retained: boolean;
}

interface ComposerBenchmarkRun {
  readonly hostLoadAverageStart: readonly number[];
  readonly hostLoadAverageEnd: readonly number[];
  readonly calibrationMs: number;
  readonly calibrationTaskMs: number;
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

async function measureFrames(page: Page, name: string, operation: () => Promise<boolean>): Promise<Omit<OperationSample, "taskMs">> {
  await startFrameSampling(page);
  let retained = false;
  let frames: FrameSample;
  let operationTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    retained = await Promise.race([
      operation(),
      new Promise<boolean>((_resolve, reject) => { operationTimeout = setTimeout(() => reject(new Error(`${name} did not settle within 10 seconds`)), 10_000); }),
    ]);
    await settleBenchmarkRendering(page);
  } finally {
    if (operationTimeout !== undefined) clearTimeout(operationTimeout);
    frames = await finishFrameSampling(page);
  }
  return Object.freeze({ name, frames, retained });
}

async function measure(page: Page, clock: BrowserCpuClock, name: string, operation: () => Promise<boolean>): Promise<OperationSample> {
  const sample = await clock.measure(() => measureFrames(page, name, operation));
  return Object.freeze({ ...sample.value, taskMs: sample.taskMs });
}

function operation(run: ComposerBenchmarkRun, name: string): OperationSample {
  const sample = run.operations.find(candidate => candidate.name === name);
  if (!sample) throw new Error(`Missing Composer benchmark operation ${JSON.stringify(name)}`);
  return sample;
}

function normalizedSummary(runs: readonly ComposerBenchmarkRun[]): ComposerNormalizedBaseline {
  const normalized = (name: string) => median(runs.map(run => operation(run, name).taskMs / run.calibrationTaskMs));
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
  await page.locator(".loupe-composer-axis-bar").getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.getByRole("listbox").getByRole("option", { name: option, exact: true }).click();
}

async function runOnce(browser: Browser): Promise<ComposerBenchmarkRun> {
  const hostLoadAverageStart = Object.freeze(loadavg());
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  let clock: BrowserCpuClock | undefined;
  try {
    clock = await createBrowserCpuClock(page);
    await page.goto("/composer");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
    const editor = page.locator(".loupe-composer-page");
    const app = frame.locator(".sheen-admin-app");
    const table = frame.getByRole("table", { name: "Northstar accounts", exact: true });
    const builder = frame.getByRole("region", { name: "Account query", exact: true });
    const draft = frame.getByRole("textbox", { name: "Search accounts", exact: true });
    await expect(app).toBeVisible();
    await expect(table).toBeVisible();
    await settleBenchmarkRendering(page);
    const calibration = await clock.measure(() => calibrate(page));
    const calibrationMs = calibration.value;
    const calibrationTaskMs = calibration.taskMs;
    await editor.evaluate(element => element.setAttribute("data-benchmark-editor", "retained"));
    await app.evaluate(element => element.setAttribute("data-benchmark-app", "retained"));
    await table.evaluate(element => element.setAttribute("data-benchmark-table", "retained"));
    await builder.evaluate(element => element.setAttribute("data-benchmark-builder", "retained"));
    await draft.fill("Benchmark draft");
    await draft.evaluate(element => element.setAttribute("data-benchmark-draft", "retained"));
    const owners = await page.evaluateHandle(() => {
      const editor = document.querySelector('[data-benchmark-editor="retained"]');
      const iframe = document.querySelector('iframe[title="Editable AdminApp preview"]');
      const viewport = document.querySelector(".loupe-composer-viewport");
      if (!(editor instanceof HTMLElement) || !(iframe instanceof HTMLIFrameElement) || !(viewport instanceof HTMLElement)) throw new Error("Missing Composer benchmark editor owners");
      const preview = iframe.contentDocument;
      const previewWindow = iframe.contentWindow;
      if (!preview || !previewWindow) throw new Error("The Composer benchmark requires a same-origin preview");
      const app = preview.querySelector('[data-benchmark-app="retained"]');
      const builder = preview.querySelector('[data-benchmark-builder="retained"]');
      const table = preview.querySelector('[data-benchmark-table="retained"]');
      const draft = preview.querySelector('[data-benchmark-draft="retained"]');
      if (!app || !builder || !table || !(draft instanceof previewWindow.window.HTMLInputElement)) throw new Error("Missing Composer benchmark preview owners");
      return { editor, iframe, viewport, preview, app, builder, table, draft,
        rule: preview.querySelector('[data-benchmark-rule="retained"]'), row: preview.querySelector('[data-benchmark-row="retained"]') };
    });
    const retained = (mode: "phone" | "table" | "query") => owners.evaluate((nodes, mode) => {
      const shell = nodes.editor.isConnected && nodes.iframe.isConnected && nodes.iframe.contentDocument === nodes.preview
        && nodes.app.isConnected && nodes.builder.isConnected && nodes.draft.isConnected
        && nodes.app.contains(nodes.builder) && nodes.app.contains(nodes.draft) && nodes.draft.value === "Benchmark draft";
      if (mode === "phone" && getComputedStyle(nodes.viewport).width !== "390px") throw new Error("Composer phone viewport did not become 390px wide");
      if (!shell || mode === "phone") return shell;
      if (!nodes.table.isConnected || !nodes.app.contains(nodes.table)) return false;
      return mode !== "query" || (nodes.rule?.isConnected === true && nodes.row?.isConnected === true
        && nodes.builder.contains(nodes.rule) && nodes.table.contains(nodes.row));
    }, mode);
    const operations: OperationSample[] = [];

    await settleBenchmarkRendering(page);
    operations.push(await measure(page, clock, "configure-title", async () => {
      await frame.getByRole("group", { name: "PageHeader block", exact: true }).click();
      const title = page.getByRole("textbox", { name: "Title", exact: true });
      await title.fill("Benchmark accounts");
      await title.press("Tab");
      await expect(frame.getByRole("heading", { name: "Benchmark accounts", level: 1 })).toBeVisible();
      return retained("table");
    }));

    const nodes = frame.locator("[data-composer-node-id]");
    const nodeCount = await nodes.count();
    operations.push(await measure(page, clock, "add-remove", async () => {
      await page.locator('[data-composer-palette-component="Text"]').getByRole("button", { name: "Add", exact: true }).click();
      await expect(nodes).toHaveCount(nodeCount + 1);
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await expect(nodes).toHaveCount(nodeCount);
      return retained("table");
    }));

    const scope = frame.locator(".loupe-composer-preview-scope");
    operations.push(await measure(page, clock, "theme-switch", async () => {
      await choose(page, "Theme", "Paper");
      await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
      return retained("table");
    }));

    operations.push(await measure(page, clock, "viewport-switch", async () => {
      await choose(page, "Viewport", "Phone, 390 × 844");
      return retained("phone");
    }));
    await choose(page, "Viewport", "Desktop, 1440 × 900");
    await expect(table).toBeVisible();
    await table.evaluate(element => element.setAttribute("data-benchmark-table", "retained"));
    await owners.evaluate(nodes => {
      const table = nodes.preview.querySelector('[data-benchmark-table="retained"]');
      if (!table) throw new Error("Missing restored Composer benchmark table");
      nodes.table = table;
    });

    const initialRule = builder.getByRole("group", { name: "Query rule: Status", exact: true });
    await initialRule.evaluate(element => element.setAttribute("data-benchmark-rule", "retained"));
    const retainedRow = table.locator('tbody tr[data-row-id="record-0001"]');
    await retainedRow.evaluate(element => element.setAttribute("data-benchmark-row", "retained"));
    await owners.evaluate(nodes => {
      nodes.rule = nodes.preview.querySelector('[data-benchmark-rule="retained"]');
      nodes.row = nodes.preview.querySelector('[data-benchmark-row="retained"]');
      if (!nodes.rule || !nodes.row) throw new Error("Missing Composer benchmark query owners");
    });
    operations.push(await measure(page, clock, "query-edit", async () => {
      await builder.getByRole("button", { name: "Add rule", exact: true }).first().click();
      const accountRule = builder.getByRole("group", { name: "Query rule: Account", exact: true });
      await accountRule.getByRole("textbox", { name: "Value", exact: true }).fill("Aperture 001");
      await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(1);
      return retained("query");
    }));
    return Object.freeze({ hostLoadAverageStart, hostLoadAverageEnd: Object.freeze(loadavg()), calibrationMs, calibrationTaskMs, operations: Object.freeze(operations) });
  } finally {
    try { await clock?.close(); } finally { await context.close(); }
  }
}

test("Composer edits retain the application and satisfy calibrated frame stability gates", async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  const capture = isCpuBaselineCapture();
  const runs: ComposerBenchmarkRun[] = [];
  for (let index = 0; index < composerBenchmarkBaseline.runs; index += 1) runs.push(await runOnce(browser));
  const normalized = normalizedSummary(runs);
  const latest = composerBenchmarkBaseline.history.at(-1);
  if (!capture && !latest) throw new Error("Composer CPU benchmark baseline history must not be empty");
  const failures = capture ? [] : [...driftFailures(normalized)];
  const metricNames: readonly (keyof ComposerNormalizedBaseline)[] = ["configureTitle", "addRemove", "themeSwitch", "viewportSwitch", "queryEdit"];
  for (const name of metricNames) {
    if (capture || !latest) continue;
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
    if (composerBenchmarkBaseline.frame.smoothOperations.includes(summary.name) && summary.p99Ms > composerBenchmarkBaseline.frame.p99Ms) {
      failures.push(`${summary.name} p99 ${summary.p99Ms.toFixed(2)}ms exceeds ${composerBenchmarkBaseline.frame.p99Ms}ms`);
    }
    if (summary.over50ms > 0) failures.push(`${summary.name} reported ${summary.over50ms} frames over ${composerBenchmarkBaseline.frame.maximumMs}ms`);
    if (summary.longTasks > composerBenchmarkBaseline.frame.longTasks) failures.push(`${summary.name} reported ${summary.longTasks} Long Tasks`);
    if (summary.unexpectedLayoutShift > composerBenchmarkBaseline.frame.unexpectedLayoutShift) failures.push(`${summary.name} reported unexpected layout shift ${summary.unexpectedLayoutShift}`);
    if (!summary.retained) failures.push(`${summary.name} replaced an accepted editor, application, table, rule, row, or draft owner`);
  }
  const artifact = Object.freeze({
    schema: 2,
    measurement: cpuMeasurement,
    qualification: capture ? "baseline-capture" : "regression",
    recordedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    environment: Object.freeze({ runner: process.env.RUNNER_NAME ?? "local", runnerOS: process.env.RUNNER_OS ?? platform(), runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null, node: process.version, osRelease: release(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? "unknown", memoryBytes: totalmem(), browser: browser.version(), playwright: composerBenchmarkBaseline.playwright }),
    baseline: composerBenchmarkBaseline,
    calibrationsMs: Object.freeze(runs.map(run => run.calibrationMs)),
    calibrationTaskMs: Object.freeze(runs.map(run => run.calibrationTaskMs)),
    runs: Object.freeze(runs),
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
  const artifactName = testInfo.repeatEachIndex === 0 ? "composer-benchmark.json" : `composer-benchmark.repeat-${testInfo.repeatEachIndex}.json`;
  await writeFile(resolve(artifacts, artifactName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ normalized: artifact.normalized, operations: artifact.operations }, null, 2)}\n`);
  expect(failures, failures.join("\n")).toEqual([]);
});
