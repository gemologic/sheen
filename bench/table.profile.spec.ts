import { expect, test } from "@playwright/test";
import type { CDPSession, Locator, Page } from "@playwright/test";
import { cpus, platform, release, totalmem } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tableBenchmarkFixture } from "./fixtures/table.ts";

interface BenchmarkCounts {
  readonly accessorReads: number;
  readonly searchProjectionReads: number;
  readonly cellRenders: number;
  readonly rowIdReads: number;
}

interface CoreProfile {
  readonly blankViewMs: number;
  readonly multiSortMs: number;
  readonly rankedSearchMs: number;
  readonly blankRows: number;
  readonly sortedRows: number;
  readonly searchRows: number;
  readonly valueReads: number;
  readonly searchProjectionReads: number;
}

interface Diagnostics {
  readonly counts: BenchmarkCounts;
  readonly core: CoreProfile | null;
}

interface OperationProfile {
  readonly durationMs: number;
  readonly counts: BenchmarkCounts;
}

interface CpuFrame {
  readonly function: string;
  readonly url: string;
  readonly line: number;
  readonly selfMs: number;
  readonly samples: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseCounts(value: unknown): BenchmarkCounts {
  if (!record(value) || !finite(value.accessorReads) || !finite(value.searchProjectionReads) || !finite(value.cellRenders) || !finite(value.rowIdReads)) throw new Error("Invalid table benchmark counts");
  return Object.freeze({ accessorReads: value.accessorReads, searchProjectionReads: value.searchProjectionReads, cellRenders: value.cellRenders, rowIdReads: value.rowIdReads });
}

function parseCore(value: unknown): CoreProfile | null {
  if (value === null) return null;
  if (!record(value) || !finite(value.blankViewMs) || !finite(value.multiSortMs) || !finite(value.rankedSearchMs)
    || !finite(value.blankRows) || !finite(value.sortedRows) || !finite(value.searchRows) || !finite(value.valueReads) || !finite(value.searchProjectionReads)) throw new Error("Invalid table core profile");
  return Object.freeze({
    blankViewMs: value.blankViewMs,
    multiSortMs: value.multiSortMs,
    rankedSearchMs: value.rankedSearchMs,
    blankRows: value.blankRows,
    sortedRows: value.sortedRows,
    searchRows: value.searchRows,
    valueReads: value.valueReads,
    searchProjectionReads: value.searchProjectionReads,
  });
}

function parseDiagnostics(value: string | null): Diagnostics {
  if (value === null) throw new Error("Missing table benchmark diagnostics");
  const parsed: unknown = JSON.parse(value);
  if (!record(parsed) || !("counts" in parsed) || !("core" in parsed)) throw new Error("Invalid table benchmark diagnostics");
  return Object.freeze({ counts: parseCounts(parsed.counts), core: parseCore(parsed.core) });
}

async function diagnostics(page: Page): Promise<Diagnostics> {
  const trigger = page.locator("[data-benchmark-snapshot]");
  await trigger.evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing diagnostics trigger");
    element.click();
  });
  return parseDiagnostics(await page.locator("[data-benchmark-diagnostics]").textContent());
}

async function resetDiagnostics(page: Page): Promise<void> {
  await page.locator("[data-benchmark-reset]").evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing diagnostics reset");
    element.click();
  });
}

async function animationFrame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame())));
}

async function captureCpu<Result>(session: CDPSession, operation: () => Promise<Result>): Promise<{ readonly result: Result; readonly frames: readonly CpuFrame[] }> {
  await session.send("Profiler.enable");
  await session.send("Profiler.setSamplingInterval", { interval: 100 });
  await session.send("Profiler.start");
  let result: Result;
  try {
    result = await operation();
  } finally {
    await animationFrameFromSession(session);
  }
  const response = await session.send("Profiler.stop");
  await session.send("Profiler.disable");
  const nodes = new Map(response.profile.nodes.map(node => [node.id, node]));
  const totals = new Map<number, { microseconds: number; samples: number }>();
  for (let index = 0; index < (response.profile.samples?.length ?? 0); index++) {
    const id = response.profile.samples?.[index];
    if (id === undefined) continue;
    const previous = totals.get(id) ?? { microseconds: 0, samples: 0 };
    previous.microseconds += response.profile.timeDeltas?.[index] ?? 0;
    previous.samples++;
    totals.set(id, previous);
  }
  const frames = [...totals]
    .flatMap(([id, total]) => {
      const node = nodes.get(id);
      if (!node) return [];
      return [Object.freeze({ function: node.callFrame.functionName || "(anonymous)", url: node.callFrame.url, line: node.callFrame.lineNumber + 1, selfMs: total.microseconds / 1_000, samples: total.samples })];
    })
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, 20);
  return Object.freeze({ result, frames: Object.freeze(frames) });
}

async function animationFrameFromSession(session: CDPSession): Promise<void> {
  await session.send("Runtime.evaluate", { expression: "new Promise(resolve => requestAnimationFrame(() => resolve()))", awaitPromise: true, returnByValue: true });
}

async function measureMount(page: Page): Promise<OperationProfile> {
  await resetDiagnostics(page);
  const durationMs = await page.evaluate(async () => {
    const trigger = document.querySelector("[data-benchmark-mount]");
    if (!(trigger instanceof HTMLButtonElement)) throw new Error("Missing table benchmark mount trigger");
    const start = performance.now();
    trigger.click();
    const deadline = start + 15_000;
    while (!document.querySelector("tbody tr[data-row-id]")) {
      if (performance.now() > deadline) throw new Error("Timed out waiting for the first benchmark row");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    return performance.now() - start;
  });
  return Object.freeze({ durationMs, counts: (await diagnostics(page)).counts });
}

function sortButton(page: Page, name: string): Locator {
  return page.locator(".sheen-data-table-sort").filter({ hasText: name });
}

async function measureMultiSort(page: Page): Promise<OperationProfile> {
  await sortButton(page, "Status").click();
  await expect(page.locator('th[data-column="status"]')).toHaveAttribute("data-sort-priority", "1");
  await animationFrame(page);
  await resetDiagnostics(page);
  const durationMs = await sortButton(page, "Amount").evaluate(async element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing Amount sort trigger");
    const start = performance.now();
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    const deadline = start + 15_000;
    while (document.querySelector('th[data-column="amount"]')?.getAttribute("data-sort-priority") !== "2") {
      if (performance.now() > deadline) throw new Error("Timed out waiting for multi-sort acceptance");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    return performance.now() - start;
  });
  return Object.freeze({ durationMs, counts: (await diagnostics(page)).counts });
}

async function clearSorting(page: Page): Promise<void> {
  await sortButton(page, "Status").click();
  await sortButton(page, "Status").click();
  await expect(page.locator('th[data-column="status"]')).not.toHaveAttribute("data-sort-direction", /.+/u);
}

async function measureRankedSearch(page: Page): Promise<OperationProfile> {
  await clearSorting(page);
  await resetDiagnostics(page);
  const input = page.getByRole("searchbox", { name: "Search Benchmark accounts" });
  const durationMs = await input.evaluate(async element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Missing table search input");
    const start = performance.now();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Missing input value setter");
    setter.call(element, "needle");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "needle" }));
    const deadline = start + 15_000;
    while (document.querySelector("table")?.getAttribute("aria-rowcount") !== "1001") {
      if (performance.now() > deadline) throw new Error("Timed out waiting for ranked search acceptance");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    return performance.now() - start;
  });
  return Object.freeze({ durationMs, counts: (await diagnostics(page)).counts });
}

async function clearSearch(page: Page): Promise<void> {
  await page.getByRole("searchbox", { name: "Search Benchmark accounts" }).fill("");
  await expect(page.locator("table")).toHaveAttribute("aria-rowcount", "100001", { timeout: 15_000 });
  await animationFrame(page);
}

async function measureRefresh(page: Page): Promise<OperationProfile & { readonly retainedNode: boolean; readonly retainedFocus: boolean; readonly retainedScroll: boolean; readonly updatedContent: boolean; readonly activeElement: string }> {
  await clearSearch(page);
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
    if (!row?.dataset.rowId || !time) throw new Error("Missing visible accepted row");
    row.focus({ preventScroll: true });
    return Object.freeze({ rowId: row.dataset.rowId, time });
  });
  const row = page.locator(`tbody tr[data-row-id="${focused.rowId}"]`);
  await animationFrame(page);
  const rowId = focused.rowId;
  const before = await row.elementHandle();
  const scrollBefore = await viewport.evaluate(element => element.scrollTop);
  const beforeTime = focused.time;
  if (!before) throw new Error("Missing accepted row profile state");
  await resetDiagnostics(page);
  const durationMs = await page.evaluate(async () => {
    const trigger = document.querySelector("[data-benchmark-refresh]");
    const snapshot = document.querySelector("[data-benchmark-snapshot]");
    const output = document.querySelector("[data-benchmark-diagnostics]");
    if (!(trigger instanceof HTMLButtonElement) || !(snapshot instanceof HTMLButtonElement) || !(output instanceof HTMLOutputElement)) throw new Error("Missing refresh diagnostics");
    const start = performance.now();
    trigger.click();
    const deadline = start + 15_000;
    while (!output.textContent?.includes(`"rowIdReads":${100_000}`)) {
      if (performance.now() > deadline) throw new Error("Timed out waiting for accepted replacement rows");
      await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
      snapshot.click();
    }
    await new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame()));
    return performance.now() - start;
  });
  const after = page.locator(`tbody tr[data-row-id="${rowId}"]`);
  const afterHandle = await after.elementHandle();
  if (!afterHandle) throw new Error("Accepted row was not retained in the realized range");
  const retainedNode = await before.evaluate((element, current) => element === current, afterHandle);
  const retainedFocus = await after.evaluate(element => element.ownerDocument.activeElement === element);
  const activeElement = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return "none";
    return `${active.tagName.toLocaleLowerCase()}${active.dataset.rowId ? `[data-row-id=${active.dataset.rowId}]` : ""}${active.hasAttribute("data-benchmark-refresh") ? "[data-benchmark-refresh]" : ""}`;
  });
  const scrollAfter = await viewport.evaluate(element => element.scrollTop);
  const afterTime = await after.locator("time").getAttribute("datetime");
  return Object.freeze({ durationMs, counts: (await diagnostics(page)).counts, retainedNode, retainedFocus, retainedScroll: Math.abs(scrollAfter - scrollBefore) <= 1, updatedContent: afterTime !== beforeTime, activeElement });
}

test("profiles the production table pipeline and reactive fan-out", async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: tableBenchmarkFixture.viewport.width, height: tableBenchmarkFixture.viewport.height } });
  const page = await context.newPage();
  try {
    await page.goto("/table-benchmark?profile=true");
    await page.locator('[data-benchmark-ready="true"]').waitFor();
    await page.locator("[data-benchmark-core-profile]").evaluate(element => {
      if (!(element instanceof HTMLButtonElement)) throw new Error("Missing core profile trigger");
      element.click();
    });
    const core = (await diagnostics(page)).core;
    if (!core) throw new Error("Core profile did not publish");
    const mount = await measureMount(page);
    const multiSort = await measureMultiSort(page);
    const rankedSearch = await measureRankedSearch(page);
    const refresh = await measureRefresh(page);
    const cpuPage = await context.newPage();
    await cpuPage.goto("/table-benchmark");
    await cpuPage.locator('[data-benchmark-ready="true"]').waitFor();
    const cpuSession = await context.newCDPSession(cpuPage);
    const mountCpu = await captureCpu(cpuSession, () => measureMount(cpuPage));
    const multiSortCpu = await captureCpu(cpuSession, () => measureMultiSort(cpuPage));
    const searchCpu = await captureCpu(cpuSession, () => measureRankedSearch(cpuPage));
    const artifact = Object.freeze({
      schema: 1,
      recordedAt: new Date().toISOString(),
      environment: Object.freeze({ node: process.version, platform: platform(), osRelease: release(), cpuCount: cpus().length, cpuModel: cpus()[0]?.model ?? "unknown", memoryBytes: totalmem(), browser: browser.version() }),
      fixture: tableBenchmarkFixture,
      profile: Object.freeze({ core, mount, multiSort, rankedSearch, refresh, cpu: Object.freeze({ mount: mountCpu.frames, multiSort: multiSortCpu.frames, rankedSearch: searchCpu.frames }) }),
    });
    const artifacts = resolve(process.cwd(), "test-results/bench");
    await mkdir(artifacts, { recursive: true });
    await writeFile(resolve(artifacts, "table-profile.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(artifact.profile, null, 2)}\n`);
    expect(core.blankRows).toBe(tableBenchmarkFixture.rows);
    expect(core.sortedRows).toBe(tableBenchmarkFixture.rows);
    expect(core.searchRows).toBe(tableBenchmarkFixture.matchingRows);
    expect(mount.counts.rowIdReads).toBe(tableBenchmarkFixture.rows);
    expect(rankedSearch.counts.searchProjectionReads).toBe(tableBenchmarkFixture.rows * tableBenchmarkFixture.searchableColumns);
    expect(refresh.retainedNode).toBe(true);
    expect(refresh.retainedFocus).toBe(true);
    expect(refresh.retainedScroll).toBe(true);
    expect(refresh.updatedContent).toBe(true);
  } finally {
    await context.close();
  }
});
