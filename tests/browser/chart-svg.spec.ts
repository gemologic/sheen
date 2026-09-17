import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

test("sparkline gaps and stat trends have semantic non-color output", async ({ page }) => {
  await page.goto("/chart-svg");
  await ready(page);
  const sparkline = page.getByRole("img", { name: "Latency over eight samples, with missing values shown as gaps" });
  const path = sparkline.locator("path");
  expect((await path.getAttribute("d"))?.match(/M/gu)).toHaveLength(2);
  const group = page.getByRole("group", { name: "Service health" });
  await expect(group).toContainText("p99 latency");
  await expect(group).toContainText("5 milliseconds lower");
  await expect(group).toContainText("8 percent higher");
  await expect(group).toContainText("unchanged");
  await expect(group.locator(".sheen-number-text")).toHaveText("18.200,00");
  const numericLines = await group.locator(".sheen-number-text").evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
  });
  expect(numericLines).toBe(1);
  const colors = await group.locator('[data-trend="down"]').evaluate(element => {
    const style = getComputedStyle(element);
    const pixel = (color: string): number[] => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Canvas context unavailable");
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    return { resolved: pixel(style.color), token: pixel(style.getPropertyValue("--sheen-color-fg-muted").trim()) };
  });
  expect(colors.resolved).toEqual(colors.token);
  const disclosure = page.locator(".sheen-chart-data");
  await disclosure.locator("summary").click();
  const table = disclosure.getByRole("table", { name: "API latency" });
  await expect(table.locator("tbody tr")).toHaveCount(4);
  await expect(table).toContainText("31.12.2023");
  await expect(table).toContainText("Fehlender Wert");
  await disclosure.getByRole("button", { name: "Page 2" }).click();
  await expect(table.locator('[data-chart-row="4"]')).toBeVisible();
});

test("real refresh keeps accepted SVG and stat roots nonblank until atomic acceptance", async ({ page }) => {
  await page.goto("/chart-svg");
  await ready(page);
  const sparkline = page.getByRole("img", { name: "Latency over eight samples, with missing values shown as gaps" });
  const group = page.getByRole("group", { name: "Service health" });
  const disclosure = page.locator(".sheen-chart-data");
  await disclosure.locator("summary").click();
  const table = disclosure.getByRole("table", { name: "API latency" });
  const firstRow = table.locator('[data-chart-row="0"]');
  const before = await sparkline.locator("path").getAttribute("d");
  const visual = group.getByRole("img", { name: "p99 latency history", exact: true });
  const visualBefore = await visual.locator("path").getAttribute("d");
  await visual.evaluate(element => element.setAttribute("data-retained-visual", "yes"));
  const trend = group.locator('[data-trend="down"]');
  await trend.evaluate(element => element.setAttribute("data-retained-trend", "yes"));
  await expect(trend).toHaveAttribute("data-valence", "neutral");
  const numeric = group.locator(".sheen-number-text");
  await numeric.evaluate(element => element.setAttribute("data-retained-number", "yes"));
  await numeric.locator('[data-number-part="fraction"]').evaluate(element => element.setAttribute("data-retained-fraction", "yes"));
  await sparkline.evaluate(element => element.setAttribute("data-retained-sparkline", "yes"));
  await group.evaluate(element => element.setAttribute("data-retained-stats", "yes"));
  await disclosure.evaluate(element => element.setAttribute("data-retained-disclosure", "yes"));
  await table.evaluate(element => element.setAttribute("data-retained-table", "yes"));
  await firstRow.evaluate(element => element.setAttribute("data-retained-row", "yes"));
  await page.getByRole("button", { name: "Refresh metrics" }).click();
  await expect(page.locator(".loupe-chart-svg-status")).toHaveText("Refreshing metrics");
  const samples = await page.locator(".loupe-chart-svg-surface").evaluate(async surface => {
    const frames: Array<{ readonly sparkline: boolean; readonly stats: boolean; readonly table: boolean; readonly row: boolean; readonly trend: boolean; readonly visual: boolean; readonly path: string }> = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      frames.push({
        sparkline: surface.querySelector("svg")?.getAttribute("data-retained-sparkline") === "yes",
        stats: surface.querySelector('[role="group"]')?.getAttribute("data-retained-stats") === "yes",
        table: surface.querySelector("table")?.getAttribute("data-retained-table") === "yes",
        row: surface.querySelector('[data-chart-row="0"]')?.getAttribute("data-retained-row") === "yes",
        trend: surface.querySelector('[data-trend="down"]')?.getAttribute("data-retained-trend") === "yes" && surface.querySelector('[data-trend="down"]')?.getAttribute("data-valence") === "neutral",
        visual: surface.querySelector('.sheen-stat-visual svg')?.getAttribute("data-retained-visual") === "yes",
        path: surface.querySelector("path")?.getAttribute("d") ?? "",
      });
    }
    return frames;
  });
  expect(samples.every(sample => sample.sparkline && sample.stats && sample.table && sample.row && sample.trend && sample.visual && sample.path === before)).toBe(true);
  await expect(group).toContainText("7 ms");
  await expect(visual).toHaveAttribute("data-retained-visual", "yes");
  expect(await visual.locator("path").getAttribute("d")).not.toBe(visualBefore);
  await expect(trend).toHaveAttribute("data-retained-trend", "yes");
  await expect(trend).toHaveAttribute("data-valence", "positive");
  await expect(numeric).toHaveAttribute("data-retained-number", "yes");
  await expect(numeric).toHaveText("19.500,50");
  await expect(numeric.locator('[data-number-part="fraction"]')).toHaveAttribute("data-retained-fraction", "yes");
  await expect(sparkline).toHaveAttribute("data-retained-sparkline", "yes");
  await expect(group).toHaveAttribute("data-retained-stats", "yes");
  await expect(disclosure).toHaveAttribute("data-retained-disclosure", "yes");
  await expect(table).toHaveAttribute("data-retained-table", "yes");
  await expect(firstRow).toHaveAttribute("data-retained-row", "yes");
  await expect(firstRow).toContainText("13 ms");
});

test("failed refresh retains accepted paths and values", async ({ page }) => {
  await page.goto("/chart-svg");
  await ready(page);
  const sparkline = page.getByRole("img", { name: "Latency over eight samples, with missing values shown as gaps" });
  const before = await sparkline.locator("path").getAttribute("d");
  await page.getByRole("checkbox", { name: "Reject next refresh" }).press("Space");
  await page.getByRole("button", { name: "Refresh metrics" }).click();
  await expect(page.locator(".loupe-chart-svg-status")).toHaveText("Refresh failed; accepted metrics retained");
  await expect(sparkline.locator("path")).toHaveAttribute("d", before ?? "");
  await expect(page.getByRole("group", { name: "Service health" })).toContainText("13 ms");
});

test("dark SSR SVG and stat roots survive delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-svg", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const sparkline = page.getByRole("img", { name: "Latency over eight samples, with missing values shown as gaps" });
    const group = page.getByRole("group", { name: "Service health" });
    const visual = group.getByRole("img", { name: "p99 latency history", exact: true });
    await visual.evaluate(element => element.setAttribute("data-server-visual", "yes"));
    const disclosure = page.locator(".sheen-chart-data");
    await disclosure.locator("summary").click();
    const table = disclosure.getByRole("table", { name: "API latency" });
    await sparkline.evaluate(element => element.setAttribute("data-server-sparkline", "yes"));
    await group.evaluate(element => element.setAttribute("data-server-stats", "yes"));
    await disclosure.evaluate(element => element.setAttribute("data-server-disclosure", "yes"));
    await table.evaluate(element => element.setAttribute("data-server-table", "yes"));
    expect(await sparkline.locator("path").getAttribute("d")).toBeTruthy();
    release();
    await ready(page);
    await expect(sparkline).toHaveAttribute("data-server-sparkline", "yes");
    await expect(group).toHaveAttribute("data-server-stats", "yes");
    await expect(visual).toHaveAttribute("data-server-visual", "yes");
    await expect(disclosure).toHaveAttribute("data-server-disclosure", "yes");
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(table).toHaveAttribute("data-server-table", "yes");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("dependency-free chart display has a bounded dark baseline", async ({ page }) => {
  await page.goto("/chart-svg");
  await ready(page);
  await expect(page.locator(".loupe-chart-svg-surface")).toHaveScreenshot("chart-svg-dark.png", { animations: "disabled" });
});
