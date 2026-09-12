import { expect, test } from "@playwright/test";
import { finishFrameSampling, startFrameSampling } from "../../bench/frame-sampling.ts";

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

test("frame sampling still reports a real blocked main thread and its final frame", async ({ page }) => {
  await startFrameSampling(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => new Promise<void>(resolve => {
    // Use a page event-loop task so the Long Tasks API observes the workload.
    setTimeout(() => {
      const start = performance.now();
      let checksum = 0x12345678;
      while (performance.now() - start < 80) checksum = Math.imul(checksum, 1_664_525) + 1_013_904_223;
      if (!Number.isFinite(checksum)) throw new Error("Blocking workload checksum failed");
      resolve();
    }, 0);
  }));
  const result = await finishFrameSampling(page);
  expect(result.longTasks.some(duration => duration >= 50)).toBe(true);
  expect(result.intervals.some(duration => duration > 50)).toBe(true);
  await startFrameSampling(page);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const fresh = await finishFrameSampling(page);
  expect(fresh.longTasks).toEqual([]);
});
