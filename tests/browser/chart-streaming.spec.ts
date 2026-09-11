import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  await expect(page.locator(".sheen-time-series .uplot")).toHaveCount(1);
  await expect(page.getByLabel("Publication count")).toHaveText("1");
}

test("a producer burst publishes once, retains roots, and counts only unseen overflow", async ({ page }) => {
  await page.goto("/chart-streaming");
  await ready(page);
  const chart = page.locator(".sheen-time-series");
  const renderer = chart.locator(".uplot");
  const canvas = chart.locator("canvas").first();
  const disclosure = chart.locator(".sheen-chart-data");
  await disclosure.locator("summary").click();
  const row = disclosure.locator('[data-chart-row="0"]');
  await renderer.evaluate(element => element.setAttribute("data-retained-renderer", "yes"));
  await canvas.evaluate(element => element.setAttribute("data-retained-canvas", "yes"));
  await row.evaluate(element => element.setAttribute("data-retained-row", "yes"));
  await page.getByRole("button", { name: "Append burst" }).click();
  await expect(page.getByLabel("Publication count")).toHaveText("2");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Published: 8");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Dropped: 4");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Rejected: 0");
  await expect(renderer).toHaveAttribute("data-retained-renderer", "yes");
  await expect(canvas).toHaveAttribute("data-retained-canvas", "yes");
  await expect(row).toHaveAttribute("data-retained-row", "yes");
  await expect(row).toContainText("18");

  await page.getByRole("button", { name: "Append duplicate" }).click();
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Rejected: 1");
  await expect(page.getByLabel("Publication count")).toHaveText("2");
});

test("a real 60 Hz producer retains the renderer and distinguishes normal history eviction", async ({ page }) => {
  await page.goto("/chart-streaming");
  await ready(page);
  const chart = page.locator(".sheen-time-series");
  const renderer = chart.locator(".uplot");
  const canvas = chart.locator("canvas").first();
  await renderer.evaluate(element => element.setAttribute("data-retained-renderer", "yes"));
  await canvas.evaluate(element => element.setAttribute("data-retained-canvas", "yes"));
  await page.getByRole("button", { name: "Stream 60 samples" }).click();
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Producer: running");
  await expect(chart).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Producer: idle", { timeout: 5_000 });
  await expect(chart).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Published: 8");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Dropped: 0");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Rejected: 0");
  await expect(renderer).toHaveAttribute("data-retained-renderer", "yes");
  await expect(canvas).toHaveAttribute("data-retained-canvas", "yes");
  await chart.locator(".sheen-chart-data summary").click();
  await expect(chart.locator('[data-chart-row="7"]')).toContainText("73");
  expect(Number(await page.getByLabel("Publication count").textContent())).toBeLessThanOrEqual(61);
});

test("owner disposal cancels an unpublished frame and a remount starts cleanly", async ({ page }) => {
  await page.goto("/chart-streaming");
  await ready(page);
  await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(1);
  await page.getByRole("button", { name: "Append then unmount" }).click();
  await expect(page.locator(".sheen-time-series")).toHaveCount(0);
  await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(0);
  await page.waitForTimeout(100);
  await expect(page.getByLabel("Publication count")).toHaveText("1");
  await page.getByRole("button", { name: "Toggle streaming owner" }).click();
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  await expect(page.getByLabel("Publication count")).toHaveText("2");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Published: 4");
  await expect(page.locator(".loupe-streaming-counters")).toContainText("Dropped: 0");
});

test("initial streaming data and native table survive delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-streaming", { waitUntil: "commit" });
    const chart = page.locator(".sheen-time-series");
    const fallback = chart.locator(".sheen-time-series-fallback");
    const disclosure = chart.locator(".sheen-chart-data");
    await disclosure.locator("summary").click();
    const table = disclosure.getByRole("table", { name: "Live request rate" });
    await chart.evaluate(element => element.setAttribute("data-server-chart", "yes"));
    await fallback.evaluate(element => element.setAttribute("data-server-fallback", "yes"));
    await table.evaluate(element => element.setAttribute("data-server-table", "yes"));
    await expect(table.locator("tbody tr")).toHaveCount(4);
    release();
    await ready(page);
    await expect(chart).toHaveAttribute("data-server-chart", "yes");
    await expect(fallback).toHaveAttribute("data-server-fallback", "yes");
    await expect(fallback).toHaveCSS("visibility", "hidden");
    await expect(table).toHaveAttribute("data-server-table", "yes");
    await expect(disclosure).toHaveAttribute("open", "");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("streaming controls and the open native alternative pass axe", async ({ page }) => {
  await page.goto("/chart-streaming");
  await ready(page);
  await page.locator(".sheen-chart-data summary").click();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});
