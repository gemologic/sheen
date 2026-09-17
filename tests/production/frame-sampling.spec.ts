import { expect, test } from "@playwright/test";
import { finishFrameSampling, settleBenchmarkRendering, startFrameSampling } from "../../bench/frame-sampling.ts";
import { createBrowserCpuClock } from "../../bench/cpu-sampling.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/loading-state");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
});

test("frame sampling retains the real refresh window and accepted draft", async ({ page }) => {
  const region = page.getByRole("region", { name: "Orders", exact: true });
  const draft = region.getByRole("textbox", { name: "Order draft", exact: true });
  await draft.fill("Retained benchmark draft");
  await draft.focus();
  await draft.evaluate(element => element.setAttribute("data-sampler-retained", "true"));
  await startFrameSampling(page);
  await page.getByRole("button", { name: "Refresh request", exact: true }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected the refresh button");
    element.click();
  });
  await expect(region).toContainText("Updated orders");
  const result = await finishFrameSampling(page);
  expect(result.durationMs).toBeGreaterThan(800);
  expect(result.intervals.length).toBeGreaterThan(10);
  await expect(draft).toHaveValue("Retained benchmark draft");
  await expect(draft).toHaveAttribute("data-sampler-retained", "true");
  await expect(draft).toBeFocused();
});

test("frame sampling rejects overlapping starts and disposes each sample", async ({ page }) => {
  await startFrameSampling(page);
  await expect(startFrameSampling(page)).rejects.toThrow("already active");
  await finishFrameSampling(page);
  await expect(finishFrameSampling(page)).rejects.toThrow("No active");
  await startFrameSampling(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const result = await finishFrameSampling(page);
  expect(result.intervals.length).toBeGreaterThan(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-sheen-benchmark-sampling");
});

test("rendering preparation leaves the first date picker opening cold and retained", async ({ page }) => {
  await page.goto("/date-time");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const fields = page.locator(".loupe-date-grid > .sheen-surface").first();
  const trigger = fields.getByRole("button", { name: "Open calendar", exact: true }).first();
  const original = await trigger.elementHandle();
  if (!original) throw new Error("Expected the original picker trigger");
  await expect(page.locator('.sheen-date-content[data-state="open"]')).toHaveCount(0);
  await settleBenchmarkRendering(page);
  await expect(page.locator('.sheen-date-content[data-state="open"]')).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-sheen-benchmark-sampling");
  expect(await original.evaluate(element => element.isConnected)).toBe(true);

  await startFrameSampling(page);
  await trigger.click();
  await expect(page.locator('.sheen-date-content[data-state="open"]')).toBeVisible();
  await settleBenchmarkRendering(page);
  await expect(page.getByRole("button", { name: "Selected date. Sunday, November 1, 2026", exact: true })).toBeFocused();
  const result = await finishFrameSampling(page);
  expect(result.intervals.length).toBeGreaterThanOrEqual(3);
  expect(await original.evaluate(element => element.isConnected)).toBe(true);
  await expect(page.locator('input[name="settlementDate"]')).toHaveValue("2026-11-01");
});

test("frame sampling reports blocked main-thread work through the settled final frame", async ({ page }) => {
  await startFrameSampling(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => new Promise<void>(resolve => {
    // Block a native rendering callback after the sampler's callback records
    // that frame. Timer timing can produce exactly 50ms between queued frame
    // timestamps despite an 80ms Long Task, so it is not a reliable >50ms stimulus.
    requestAnimationFrame(() => {
      const start = performance.now();
      let checksum = 0x12345678;
      while (performance.now() - start < 80) checksum = Math.imul(checksum, 1_664_525) + 1_013_904_223;
      if (!Number.isFinite(checksum)) throw new Error("Blocking workload checksum failed");
      // Match the benchmark boundary. A queued frame's timestamp can predate
      // this task's completion, so draining only that frame can miss the gap.
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
  }));
  const result = await finishFrameSampling(page);
  const diagnostics = JSON.stringify({ durationMs: result.durationMs, longTasks: result.longTasks, intervals: result.intervals, longAnimationFrames: result.longAnimationFrames });
  expect(Math.max(0, ...result.longTasks), diagnostics).toBeGreaterThanOrEqual(50);
  expect(Math.max(0, ...result.intervals), diagnostics).toBeGreaterThan(50);
  expect(result.longAnimationFrames.some(frame => frame.durationMs >= 50 && frame.blockingDurationMs !== null), diagnostics).toBe(true);
  expect(result.longTaskTimings.map(task => task.durationMs)).toEqual(result.longTasks);
  expect(result.longTaskTimings.some(task => task.startOffsetMs >= 0 && task.durationMs >= 50)).toBe(true);
  expect(result.longAnimationFrames.flatMap(frame => frame.scripts).some(script =>
    script.durationMs !== null && script.durationMs >= 50 && script.invokerType === "user-callback" &&
    script.invoker !== null && script.invoker.length > 0 && script.windowAttribution === "self" &&
    script.executionStartOffsetMs !== null && script.forcedStyleAndLayoutDurationMs !== null), diagnostics).toBe(true);
  await startFrameSampling(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const fresh = await finishFrameSampling(page);
  expect(fresh.longTasks).toEqual([]);
  expect(fresh.longTaskTimings).toEqual([]);
});

test("thread-time CPU sampling counts work without charging idle frame waits", async ({ page }) => {
  const clock = await createBrowserCpuClock(page);
  try {
    const idle = await clock.measure(() => page.evaluate(() => new Promise<number>(resolve => {
      const start = performance.now();
      let remaining = 30;
      const tick = (): void => {
        remaining -= 1;
        if (remaining > 0) requestAnimationFrame(tick);
        else resolve(performance.now() - start);
      };
      requestAnimationFrame(tick);
    })));
    const work = await clock.measure(() => page.evaluate(() => {
      const start = performance.now();
      let state = 0x12345678;
      for (let index = 0; index < 24_000_000; index += 1) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
      if (!Number.isFinite(state)) throw new Error("CPU workload checksum failed");
      return performance.now() - start;
    }));
    const diagnostics = JSON.stringify({ idle, work });
    expect(idle.value, diagnostics).toBeGreaterThan(300);
    expect(idle.taskMs, diagnostics).toBeLessThan(idle.value / 2);
    expect(work.taskMs, diagnostics).toBeGreaterThan(10);
    expect(work.taskMs, diagnostics).toBeLessThan(work.value * 2);
  } finally {
    await clock.close();
  }
  await expect(clock.measure(() => page.title())).rejects.toThrow("closed");
});

test("parent CPU sampling includes real same-origin Composer iframe work", async ({ page }) => {
  await page.goto("/composer");
  const preview = page.frameLocator('iframe[title="Editable AdminApp preview"]');
  const app = preview.locator(".sheen-admin-app");
  await expect(app).toBeVisible();
  await settleBenchmarkRendering(page);
  const clock = await createBrowserCpuClock(page);
  try {
    const sample = await clock.measure(() => app.evaluate(() => {
      const start = performance.now();
      let state = 0x12345678;
      for (let index = 0; index < 24_000_000; index += 1) state = Math.imul(state ^ index, 1_664_525) + 1_013_904_223;
      if (!Number.isFinite(state)) throw new Error("Iframe workload checksum failed");
      return { wallMs: performance.now() - start, parentOrigin: window.parent.location.origin, origin: location.origin };
    }));
    const diagnostics = JSON.stringify(sample);
    expect(sample.value.origin).toBe(sample.value.parentOrigin);
    expect(sample.taskMs, diagnostics).toBeGreaterThan(10);
    expect(sample.taskMs, diagnostics).toBeGreaterThan(sample.value.wallMs / 3);
  } finally {
    await clock.close();
  }
});

test("CPU sampling rejects overlap and remains reusable after an operation fails", async ({ page }) => {
  const clock = await createBrowserCpuClock(page);
  try {
    await expect(clock.measure(async () => {
      await expect(clock.measure(() => page.title())).rejects.toThrow("already active");
      throw new Error("Operation failed");
    })).rejects.toThrow("Operation failed");
    const next = await clock.measure(() => page.title());
    expect(next.taskMs).toBeGreaterThan(0);
  } finally {
    await clock.close();
  }
});
