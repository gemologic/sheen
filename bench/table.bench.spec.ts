import { expect, test } from "@playwright/test";
import type { Browser, CDPSession, Locator, Page } from "@playwright/test";
import { cpus, platform, release, totalmem } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compatibleTableBenchmarkHistory, tableBenchmarkBaseline } from "./baselines/table.v2.ts";
import type { TableNormalizedBaseline } from "./baselines/table.v2.ts";
import { tableBenchmarkFixture } from "./fixtures/table.ts";

interface BrowserFrameSample {
  readonly intervals: readonly number[];
  readonly longTasks: readonly number[];
  readonly blankFrames: number;
}

interface TraceEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly process: number;
  readonly thread: number;
  readonly duration: number | null;
}

interface TraceFrameSample {
  readonly source: string;
  readonly intervals: readonly number[];
  readonly events: number;
  readonly dataLoss: boolean;
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly garbageCollections: readonly { readonly kind: string; readonly startMs: number; readonly durationMs: number | null }[];
}

interface MotionSample {
  readonly browser: BrowserFrameSample;
  readonly cdp: TraceFrameSample;
}

interface TableBenchmarkRun {
  readonly calibrationMs: number;
  readonly renderMs: number;
  readonly multiSortMs: number;
  readonly searchMs: number;
  readonly filterMs: number;
  readonly refreshMs: number;
  readonly retainedContent: RetainedContentSample;
  readonly resize: MotionSample;
  readonly scroll: MotionSample;
}

interface RetainedContentSample {
  readonly node: boolean;
  readonly focus: boolean;
  readonly scroll: boolean;
  readonly content: boolean;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)] ?? Number.POSITIVE_INFINITY;
}

function median(values: readonly number[]): number {
  return percentile(values, 0.5);
}

function measuredScrollIntervals(sample: TraceFrameSample): readonly number[] {
  // Scrolling starts after two settling frames, so their CDP intervals are outside the measured operation.
  return sample.intervals.slice(2);
}

function summarizeTrace(events: readonly TraceEvent[], dataLoss: boolean): TraceFrameSample {
  const eventCounts: Record<string, number> = {};
  for (const event of events) eventCounts[event.name] = (eventCounts[event.name] ?? 0) + 1;
  const candidates = ["DrawFrame", "BeginFrame", "BeginMainThreadFrame", "RequestMainThreadFrame"];
  for (const name of candidates) {
    const groups = new Map<string, number[]>();
    for (const event of events) {
      if (event.name !== name) continue;
      const key = `${event.process}:${event.thread}`;
      const timestamps = groups.get(key);
      if (timestamps) timestamps.push(event.timestamp);
      else groups.set(key, [event.timestamp]);
    }
    const timestamps = [...groups.values()].sort((left, right) => right.length - left.length)[0];
    if (!timestamps || timestamps.length < 2) continue;
    const ordered = [...new Set(timestamps)].sort((left, right) => left - right);
    return Object.freeze({
      source: name,
      intervals: Object.freeze(ordered.slice(1).map((timestamp, index) => (timestamp - (ordered[index] ?? timestamp)) / 1_000)),
      events: ordered.length,
      dataLoss,
      eventCounts: Object.freeze(eventCounts),
      garbageCollections: Object.freeze(events.filter(event => event.name === "MinorGC" || event.name === "MajorGC").map(event => Object.freeze({ kind: event.name, startMs: (event.timestamp - (ordered[0] ?? event.timestamp)) / 1_000, durationMs: event.duration === null ? null : event.duration / 1_000 }))),
    });
  }
  return Object.freeze({ source: "unavailable", intervals: Object.freeze([]), events: 0, dataLoss, eventCounts: Object.freeze(eventCounts), garbageCollections: Object.freeze([]) });
}

async function captureTrace<Result>(session: CDPSession, operation: () => Promise<Result>): Promise<{ readonly result: Result; readonly trace: TraceFrameSample }> {
  const events: TraceEvent[] = [];
  let dataLoss = false;
  const collect = (payload: unknown): void => {
    if (!record(payload) || !Array.isArray(payload.value)) return;
    for (const value of payload.value) {
      if (!record(value) || typeof value.name !== "string" || !finite(value.ts) || !finite(value.pid) || !finite(value.tid)) continue;
      if (!value.name.includes("Frame") && value.name !== "DrawFrame" && value.name !== "CompositeLayers" && value.name !== "MinorGC" && value.name !== "MajorGC") continue;
      events.push({ name: value.name, timestamp: value.ts, process: value.pid, thread: value.tid, duration: finite(value.dur) ? value.dur : null });
    }
  };
  const complete = (payload: unknown): void => {
    if (record(payload) && payload.dataLossOccurred === true) dataLoss = true;
  };
  session.on("Tracing.dataCollected", collect);
  session.on("Tracing.tracingComplete", complete);
  await session.send("Tracing.start", {
    transferMode: "ReportEvents",
    traceConfig: {
      recordMode: "recordAsMuchAsPossible",
      includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame", "cc"],
    },
  });
  let result: Result;
  try {
    result = await operation();
  } finally {
    const completed = new Promise<void>(resolveComplete => session.once("Tracing.tracingComplete", () => resolveComplete()));
    await session.send("Tracing.end");
    await completed;
    session.off("Tracing.dataCollected", collect);
    session.off("Tracing.tracingComplete", complete);
  }
  return Object.freeze({ result, trace: summarizeTrace(events, dataLoss) });
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

async function measureMount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const trigger = document.querySelector("[data-benchmark-mount]");
    if (!(trigger instanceof HTMLButtonElement)) throw new Error("Missing table benchmark mount trigger");
    performance.clearMarks("sheen-table-render-start");
    performance.clearMarks("sheen-table-render-end");
    performance.clearMeasures("sheen-table-render");
    performance.mark("sheen-table-render-start");
    trigger.click();
    const deadline = performance.now() + 15_000;
    while (!document.querySelector('tbody tr[data-row-id]')) {
      if (performance.now() > deadline) throw new Error("Timed out waiting for the first benchmark row");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    performance.mark("sheen-table-render-end");
    return performance.measure("sheen-table-render", "sheen-table-render-start", "sheen-table-render-end").duration;
  });
}

function sortButton(page: Page, name: string): Locator {
  return page.locator(".sheen-data-table-sort").filter({ hasText: name });
}

async function measureMultiSort(page: Page): Promise<number> {
  await sortButton(page, "Status").click();
  await expect(page.locator('th[data-column="status"]')).toHaveAttribute("data-sort-priority", "1");
  return sortButton(page, "Amount").evaluate(async element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing benchmark multi-sort trigger");
    performance.mark("sheen-table-multi-sort-start");
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    const deadline = performance.now() + 15_000;
    while (document.querySelector('th[data-column="amount"]')?.getAttribute("data-sort-priority") !== "2") {
      if (performance.now() > deadline) throw new Error("Timed out waiting for multi-sort acceptance");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    performance.mark("sheen-table-multi-sort-end");
    return performance.measure("sheen-table-multi-sort", "sheen-table-multi-sort-start", "sheen-table-multi-sort-end").duration;
  });
}

async function clearSorting(page: Page): Promise<void> {
  await sortButton(page, "Status").click();
  await sortButton(page, "Status").click();
  await expect(page.locator('th[data-column="status"]')).not.toHaveAttribute("data-sort-direction", /.+/u);
}

async function measureSearch(page: Page): Promise<number> {
  return page.getByRole("searchbox", { name: "Search Benchmark accounts" }).evaluate(async element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Missing benchmark search input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing input value setter");
    performance.mark("sheen-table-search-start");
    setter.call(element, "needle");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "needle" }));
    const deadline = performance.now() + 15_000;
    while (document.querySelector("table")?.getAttribute("aria-rowcount") !== "1001") {
      if (performance.now() > deadline) throw new Error("Timed out waiting for ranked search acceptance");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    performance.mark("sheen-table-search-end");
    return performance.measure("sheen-table-search", "sheen-table-search-start", "sheen-table-search-end").duration;
  });
}

async function clearSearch(page: Page): Promise<void> {
  await page.getByRole("searchbox", { name: "Search Benchmark accounts" }).fill("");
  await expect(page.locator("table")).toHaveAttribute("aria-rowcount", "100001", { timeout: 15_000 });
  await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame())));
}

async function measureRefresh(page: Page): Promise<{ readonly duration: number; readonly retained: RetainedContentSample }> {
  const viewport = page.locator(".sheen-data-table-viewport");
  await viewport.evaluate(async element => {
    element.scrollTop = 5_000;
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
  });
  const focused = await viewport.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const headerBottom = element.querySelector("thead")?.getBoundingClientRect().bottom ?? bounds.top;
    const row = [...element.querySelectorAll<HTMLTableRowElement>('tbody tr[data-row-id]')].find(candidate => {
      const rowBounds = candidate.getBoundingClientRect();
      return rowBounds.top >= headerBottom && rowBounds.bottom <= bounds.bottom;
    });
    const time = row?.querySelector("time")?.getAttribute("datetime");
    if (!row?.dataset.rowId || !time) throw new Error("Missing visible accepted benchmark row");
    row.focus({ preventScroll: true });
    return Object.freeze({ rowId: row.dataset.rowId, time });
  });
  const row = page.locator(`tbody tr[data-row-id="${focused.rowId}"]`);
  const before = await row.elementHandle();
  if (!before) throw new Error("Missing accepted benchmark row node");
  const scrollBefore = await viewport.evaluate(element => element.scrollTop);
  const duration = await page.evaluate(async ({ id, time }) => {
    const trigger = document.querySelector("[data-benchmark-refresh]");
    if (!(trigger instanceof HTMLButtonElement)) throw new Error("Missing benchmark refresh trigger");
    performance.mark("sheen-table-refresh-start");
    trigger.click();
    const deadline = performance.now() + 15_000;
    while (document.querySelector(`tbody tr[data-row-id="${CSS.escape(id)}"] time`)?.getAttribute("datetime") === time) {
      if (performance.now() > deadline) throw new Error("Timed out waiting for accepted replacement rows");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    performance.mark("sheen-table-refresh-end");
    return performance.measure("sheen-table-refresh", "sheen-table-refresh-start", "sheen-table-refresh-end").duration;
  }, { id: focused.rowId, time: focused.time });
  const after = page.locator(`tbody tr[data-row-id="${focused.rowId}"]`);
  const afterHandle = await after.elementHandle();
  if (!afterHandle) throw new Error("Accepted benchmark row left the realized range");
  const node = await before.evaluate((element, current) => element === current, afterHandle);
  const focus = await after.evaluate(element => element.ownerDocument.activeElement === element);
  const scrollAfter = await viewport.evaluate(element => element.scrollTop);
  const content = await after.locator("time").getAttribute("datetime") !== focused.time;
  return Object.freeze({ duration, retained: Object.freeze({ node, focus, scroll: Math.abs(scrollAfter - scrollBefore) <= 1, content }) });
}

async function prepareFilter(page: Page): Promise<Locator> {
  const section = page.getByRole("region", { name: "Table benchmark surface" });
  await section.getByRole("button", { name: "+ Filter", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Filter columns" });
  await picker.getByRole("searchbox", { name: "Search filter columns" }).fill("Name");
  await picker.getByRole("button", { name: "Name", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "+ Filter: Name" });
  await editor.getByRole("button", { name: /Operator/ }).click();
  await page.getByRole("option", { name: "contains", exact: true }).click();
  await editor.getByRole("textbox", { name: "Value" }).fill("Needle");
  return editor.getByRole("button", { name: "Apply filter" });
}

async function measureFilter(apply: Locator): Promise<number> {
  return apply.evaluate(async element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing benchmark filter apply trigger");
    performance.mark("sheen-table-filter-start");
    element.click();
    const deadline = performance.now() + 15_000;
    while (document.querySelector("table")?.getAttribute("aria-rowcount") !== "1001") {
      if (performance.now() > deadline) throw new Error("Timed out waiting for filtered benchmark rows");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    performance.mark("sheen-table-filter-end");
    return performance.measure("sheen-table-filter", "sheen-table-filter-start", "sheen-table-filter-end").duration;
  });
}

async function measureResize(page: Page, session: CDPSession): Promise<MotionSample> {
  const handle = page.getByRole("separator", { name: "Resize Name" });
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error("Missing benchmark resize handle geometry");
  const captured = await captureTrace(session, async () => {
    const sample = page.evaluate(async (): Promise<BrowserFrameSample> => {
      const intervals: number[] = [];
      const longTasks: number[] = [];
      const observer = PerformanceObserver.supportedEntryTypes.includes("longtask") ? new PerformanceObserver(list => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      }) : undefined;
      observer?.observe({ entryTypes: ["longtask"] });
      let stopped = false;
      const stop = () => { stopped = true; };
      document.addEventListener("sheen-benchmark-resize-stop", stop, { once: true });
      let previous: number | undefined;
      while (!stopped) {
        const timestamp = await new Promise<number>(resolveFrame => requestAnimationFrame(resolveFrame));
        if (previous !== undefined) intervals.push(timestamp - previous);
        previous = timestamp;
      }
      observer?.disconnect();
      document.removeEventListener("sheen-benchmark-resize-stop", stop);
      return { intervals, longTasks, blankFrames: 0 };
    });
    try {
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      for (let step = 1; step <= 60; step++) {
        await page.mouse.move(bounds.x + bounds.width / 2 + step * 2, bounds.y + bounds.height / 2);
        await page.waitForTimeout(16);
      }
      await page.mouse.up();
    } finally {
      await page.evaluate(() => document.dispatchEvent(new Event("sheen-benchmark-resize-stop")));
    }
    return sample;
  });
  return Object.freeze({ browser: captured.result, cdp: captured.trace });
}

async function measureScroll(page: Page, session: CDPSession): Promise<MotionSample> {
  const captured = await captureTrace(session, () => page.evaluate(async ({ distance, duration }): Promise<BrowserFrameSample> => {
    const viewport = document.querySelector(".sheen-data-table-viewport");
    if (!(viewport instanceof HTMLDivElement)) throw new Error("Missing benchmark table viewport");
    viewport.scrollTop = 0;
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
    const intervals: number[] = [];
    const longTasks: number[] = [];
    let blankFrames = 0;
    const observer = PerformanceObserver.supportedEntryTypes.includes("longtask") ? new PerformanceObserver(list => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    }) : undefined;
    observer?.observe({ entryTypes: ["longtask"] });
    const start = performance.now();
    let previous: number | undefined;
    while (true) {
      const timestamp = await new Promise<number>(resolveFrame => requestAnimationFrame(resolveFrame));
      if (previous !== undefined) intervals.push(timestamp - previous);
      previous = timestamp;
      const elapsed = timestamp - start;
      viewport.scrollTop = distance * Math.min(1, elapsed / duration);
      const bounds = viewport.getBoundingClientRect();
      const visibleTop = viewport.querySelector("thead")?.getBoundingClientRect().bottom ?? bounds.top;
      const populated = [...viewport.querySelectorAll("tbody tr[data-row-id]")].some(row => {
        const rowBounds = row.getBoundingClientRect();
        return rowBounds.bottom > visibleTop && rowBounds.top < bounds.bottom;
      });
      if (!populated) blankFrames++;
      if (elapsed >= duration) break;
    }
    observer?.disconnect();
    return { intervals, longTasks, blankFrames };
  }, tableBenchmarkFixture.scroll));
  return Object.freeze({ browser: captured.result, cdp: captured.trace });
}

async function runOnce(browser: Browser): Promise<TableBenchmarkRun> {
  const context = await browser.newContext({ viewport: { width: tableBenchmarkFixture.viewport.width, height: tableBenchmarkFixture.viewport.height } });
  const page = await context.newPage();
  try {
    await page.goto("/table-benchmark");
    await page.locator('[data-benchmark-ready="true"]').waitFor();
    const session = await context.newCDPSession(page);
    const calibrationMs = await calibrate(page);
    const renderMs = await measureMount(page);
    await expect(page.locator(".sheen-data-table")).toHaveAttribute("data-variant", "integrated");
    await expect(page.locator(".loupe-table-benchmark-scope")).toHaveAttribute("data-sheen-density", "compact");
    await expect(page.locator(".loupe-table-benchmark-account").first()).toBeVisible();
    await expect(page.locator(".loupe-table-benchmark-status").first()).toBeVisible();
    await expect(page.locator(".loupe-table-benchmark-amount").first()).toBeVisible();
    const resize = await measureResize(page, session);
    const scroll = await measureScroll(page, session);
    await page.locator(".sheen-data-table-viewport").evaluate(async element => {
      element.scrollTop = 0;
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
    });
    const refresh = await measureRefresh(page);
    await page.locator(".sheen-data-table-viewport").evaluate(async element => {
      element.scrollTop = 0;
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
    });
    const multiSortMs = await measureMultiSort(page);
    await clearSorting(page);
    const searchMs = await measureSearch(page);
    await clearSearch(page);
    const apply = await prepareFilter(page);
    const filterMs = await measureFilter(apply);
    return Object.freeze({ calibrationMs, renderMs, multiSortMs, searchMs, filterMs, refreshMs: refresh.duration, retainedContent: refresh.retained, resize, scroll });
  } finally {
    await context.close();
  }
}

function normalizedSummary(runs: readonly TableBenchmarkRun[]): TableNormalizedBaseline {
  return Object.freeze({
    render: median(runs.map(run => run.renderMs / run.calibrationMs)),
    multiSort: median(runs.map(run => run.multiSortMs / run.calibrationMs)),
    search: median(runs.map(run => run.searchMs / run.calibrationMs)),
    filter: median(runs.map(run => run.filterMs / run.calibrationMs)),
    refresh: median(runs.map(run => run.refreshMs / run.calibrationMs)),
  });
}

function driftFailures(current: TableNormalizedBaseline, history: readonly { readonly normalized: TableNormalizedBaseline }[]): readonly string[] {
  const names: readonly (keyof TableNormalizedBaseline)[] = ["render", "multiSort", "search", "filter", "refresh"];
  const failures: string[] = [];
  for (const name of names) {
    const values = [...history.map(entry => entry.normalized[name]), current[name]].slice(-4);
    if (values.length === 4 && values.slice(1).every((value, index) => value > (values[index] ?? value))) failures.push(`${name} increased in three consecutive baselines`);
  }
  return Object.freeze(failures);
}

test("calibrated table workloads stay within normalized and absolute frame gates", async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  const cpuModel = cpus()[0]?.model ?? "unknown";
  const runnerClass = process.env.GITHUB_ACTIONS === "true" ? process.env.SHEEN_BENCHMARK_RUNNER_CLASS ?? "github:unconfigured" : `local:${cpuModel}`;
  const compatibleHistory = compatibleTableBenchmarkHistory(runnerClass);
  const runs: TableBenchmarkRun[] = [];
  for (let run = 0; run < tableBenchmarkBaseline.runs; run++) runs.push(await runOnce(browser));

  const normalized = normalizedSummary(runs);
  const latest = compatibleHistory.at(-1);
  if (!latest) throw new Error("Table benchmark baseline history must not be empty");
  const metricNames: readonly (keyof TableNormalizedBaseline)[] = ["render", "multiSort", "search", "filter", "refresh"];
  const failures: string[] = [];
  for (const name of metricNames) {
    const maximum = latest.normalized[name] * (1 + tableBenchmarkBaseline.maximumRegression);
    if (normalized[name] > maximum) failures.push(`${name} normalized median ${normalized[name].toFixed(4)} exceeds ${maximum.toFixed(4)}`);
  }

  const resizeCdp = runs.flatMap(run => run.resize.cdp.intervals);
  const scrollCdp = runs.flatMap(run => measuredScrollIntervals(run.scroll.cdp));
  const resizeBrowser = runs.flatMap(run => run.resize.browser.intervals);
  const scrollBrowser = runs.flatMap(run => run.scroll.browser.intervals);
  const resizeLongTasks = runs.flatMap(run => run.resize.browser.longTasks);
  const scrollLongTasks = runs.flatMap(run => run.scroll.browser.longTasks);
  const blankFrames = runs.reduce((total, run) => total + run.scroll.browser.blankFrames, 0);
  const lostTraces = runs.filter(run => run.resize.cdp.dataLoss || run.scroll.cdp.dataLoss).length;
  const frameSummary = Object.freeze({
    resize: Object.freeze({ cdpSource: runs[0]?.resize.cdp.source ?? "unavailable", cdpFrames: resizeCdp.length + tableBenchmarkBaseline.runs, cdpP99Ms: percentile(resizeCdp, 0.99), browserP99Ms: percentile(resizeBrowser, 0.99), over50ms: resizeBrowser.filter(value => value > tableBenchmarkBaseline.frame.maximumMs).length, longTasks: resizeLongTasks.length }),
    scroll: Object.freeze({ cdpSource: runs[0]?.scroll.cdp.source ?? "unavailable", cdpFrames: scrollCdp.length + tableBenchmarkBaseline.runs, cdpP99Ms: percentile(scrollCdp, 0.99), browserP99Ms: percentile(scrollBrowser, 0.99), over50ms: scrollCdp.filter(value => value > tableBenchmarkBaseline.frame.maximumMs).length, longTasks: scrollLongTasks.length, blankFrames }),
    lostTraces,
  });
  if (resizeCdp.length < 30 * tableBenchmarkBaseline.runs) failures.push(`resize CDP trace reported only ${resizeCdp.length} frame intervals`);
  if (resizeBrowser.length < 60 * tableBenchmarkBaseline.runs) failures.push(`resize browser sampling reported only ${resizeBrowser.length} frame intervals`);
  if (scrollCdp.length < 60 * tableBenchmarkBaseline.runs) failures.push(`scroll CDP trace reported only ${scrollCdp.length} frame intervals`);
  if (frameSummary.resize.browserP99Ms > tableBenchmarkBaseline.frame.p99Ms) failures.push(`resize browser p99 ${frameSummary.resize.browserP99Ms.toFixed(2)}ms exceeds ${tableBenchmarkBaseline.frame.p99Ms}ms`);
  if (frameSummary.scroll.cdpP99Ms > tableBenchmarkBaseline.frame.p99Ms) failures.push(`scroll CDP p99 ${frameSummary.scroll.cdpP99Ms.toFixed(2)}ms exceeds ${tableBenchmarkBaseline.frame.p99Ms}ms`);
  if (frameSummary.resize.over50ms > 0 || frameSummary.scroll.over50ms > 0) failures.push(`CDP frames over ${tableBenchmarkBaseline.frame.maximumMs}ms: resize=${frameSummary.resize.over50ms}, scroll=${frameSummary.scroll.over50ms}`);
  if (frameSummary.resize.longTasks > tableBenchmarkBaseline.frame.longTasks || frameSummary.scroll.longTasks > tableBenchmarkBaseline.frame.longTasks) failures.push(`long tasks: resize=${frameSummary.resize.longTasks}, scroll=${frameSummary.scroll.longTasks}`);
  if (blankFrames > tableBenchmarkBaseline.frame.blankFrames) failures.push(`blank scroll frames: ${blankFrames}`);
  if (lostTraces > 0) failures.push(`CDP reported data loss in ${lostTraces} traces`);
  for (let index = 0; index < runs.length; index++) {
    const retained = runs[index]?.retainedContent;
    if (!retained?.node || !retained.focus || !retained.scroll || !retained.content) failures.push(`accepted-content identity failed in run ${index + 1}: ${JSON.stringify(retained)}`);
  }

  failures.push(...driftFailures(normalized, compatibleHistory));
  const artifact = Object.freeze({
    schema: 2,
    recordedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA ?? null,
    environment: Object.freeze({ runner: process.env.RUNNER_NAME ?? "local", runnerClass, runnerOS: process.env.RUNNER_OS ?? platform(), runnerImage: process.env.ImageOS ?? null, runnerImageVersion: process.env.ImageVersion ?? null, node: process.version, osRelease: release(), cpuCount: cpus().length, cpuModel, memoryBytes: totalmem(), browser: browser.version(), playwright: tableBenchmarkBaseline.playwright }),
    fixture: tableBenchmarkFixture,
    baseline: tableBenchmarkBaseline,
    selectedBaselineVersion: latest.version,
    runs: Object.freeze(runs),
    summary: Object.freeze({ rawMedianMs: Object.freeze({ calibration: median(runs.map(run => run.calibrationMs)), render: median(runs.map(run => run.renderMs)), multiSort: median(runs.map(run => run.multiSortMs)), search: median(runs.map(run => run.searchMs)), filter: median(runs.map(run => run.filterMs)), refresh: median(runs.map(run => run.refreshMs)) }), normalized, frames: frameSummary }),
    failures: Object.freeze(failures),
  });
  const artifacts = resolve(process.cwd(), "test-results/bench");
  await mkdir(artifacts, { recursive: true });
  const artifactName = testInfo.repeatEachIndex === 0 ? "table-benchmark.json" : `table-benchmark.repeat-${testInfo.repeatEachIndex}.json`;
  await writeFile(resolve(artifacts, artifactName), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(artifact.summary, null, 2)}\n`);
  expect(failures, failures.join("\n")).toEqual([]);
});
