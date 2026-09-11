import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-time-series[data-enhanced]")).toHaveCount(2);
  await expect(page.locator(".sheen-time-series .uplot")).toHaveCount(2);
}

test("pointer inspection synchronizes DOM-only tooltips without replacing their nodes", async ({ page }) => {
  await page.goto("/chart-interactions");
  await ready(page);
  const overs = page.locator(".u-over");
  const firstBox = await overs.first().boundingBox();
  if (firstBox === null) throw new Error("Expected the first chart interaction surface");
  const tooltips = page.locator(".sheen-chart-tooltip");
  await tooltips.evaluateAll(elements => elements.forEach(element => element.setAttribute("data-retained", "yes")));
  await page.mouse.move(firstBox.x + firstBox.width * 0.3, firstBox.y + firstBox.height * 0.5);
  await expect(tooltips.first()).toBeVisible();
  await expect(tooltips.nth(1)).toBeVisible();
  const firstIndex = await tooltips.first().getAttribute("data-index");
  await expect(tooltips.nth(1)).toHaveAttribute("data-index", firstIndex ?? "");
  await expect(tooltips.first()).toContainText("p50 latency");
  await expect(tooltips.nth(1)).toContainText("Reads");
  const updates = Number(await tooltips.first().getAttribute("data-updates"));
  await page.mouse.move(firstBox.x + firstBox.width * 0.7, firstBox.y + firstBox.height * 0.5);
  await expect.poll(async () => Number(await tooltips.first().getAttribute("data-updates"))).toBeGreaterThan(updates);
  await expect(tooltips.first()).toHaveAttribute("data-retained", "yes");
  await expect(tooltips.nth(1)).toHaveAttribute("data-retained", "yes");
  await expect(tooltips.nth(1)).toHaveAttribute("data-index", await tooltips.first().getAttribute("data-index") ?? "");
});

test("keyboard inspection and legend buttons provide equivalent retained controls", async ({ page }) => {
  await page.goto("/chart-interactions");
  await ready(page);
  const chart = page.locator(".sheen-time-series").first();
  const plot = chart.getByRole("img", { name: "Synchronized latency" });
  const tooltip = chart.locator(".sheen-chart-tooltip");
  const status = chart.locator(".sheen-chart-visually-hidden[aria-live]");
  const canvas = chart.locator("canvas").first();
  await canvas.evaluate(element => element.setAttribute("data-retained", "yes"));
  await plot.focus();
  await plot.press("Home");
  await expect(tooltip).toHaveAttribute("data-index", "0");
  await expect(status).toContainText("p50 latency");
  await plot.press("ArrowRight");
  await expect(tooltip).toHaveAttribute("data-index", "1");
  await plot.press("End");
  await expect(tooltip).toHaveAttribute("data-index", "23");
  await plot.press("Escape");
  await expect(tooltip).toBeHidden();

  const toggle = chart.getByRole("button", { name: "Hide p99 latency" });
  await toggle.click();
  await expect(chart.getByRole("button", { name: "Show p99 latency" })).toHaveAttribute("aria-pressed", "false");
  await expect(canvas).toHaveAttribute("data-retained", "yes");
  await plot.focus();
  await plot.press("Home");
  await expect(tooltip.locator("li").nth(1)).toBeHidden();
  await expect(chart.locator("table")).toHaveCount(1);
});

test("drag zoom survives accepted data refresh and double click resets it", async ({ page }) => {
  await page.goto("/chart-time-series");
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  const chart = page.locator(".sheen-time-series");
  const over = chart.locator(".u-over");
  const canvas = chart.locator("canvas").first();
  const annotation = chart.locator(".sheen-time-series-annotations .sheen-chart-annotation");
  const box = await over.boundingBox();
  if (box === null) throw new Error("Expected chart interaction geometry");
  await canvas.evaluate(element => element.setAttribute("data-retained", "yes"));
  await annotation.evaluate(element => element.setAttribute("data-retained", "yes"));
  const annotationBefore = await annotation.locator("line").getAttribute("x1");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await expect(chart).toHaveAttribute("data-zoomed", "true");
  await expect(page.getByLabel("Accepted zoom range")).not.toHaveText("full");
  const acceptedZoom = await page.getByLabel("Accepted zoom range").textContent();
  await expect(chart.getByRole("button", { name: "Reset zoom" })).toBeEnabled();
  await expect(annotation).toHaveAttribute("data-retained", "yes");
  expect(await annotation.locator("line").getAttribute("x1")).not.toBe(annotationBefore);

  await page.getByRole("button", { name: "Refresh time series" }).click();
  await expect(page.locator(".loupe-time-series-status")).toHaveText("Refreshing time series");
  await expect(chart).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByLabel("Accepted zoom range")).toHaveText(acceptedZoom ?? "");
  await expect(canvas).toHaveAttribute("data-retained", "yes");
  await over.dblclick();
  await expect(page.getByLabel("Accepted zoom range")).toHaveText("full");
  await expect(chart).not.toHaveAttribute("data-zoomed", "true");
});

test("zoom toolbar works without pointer input and interaction states pass axe", async ({ page }) => {
  await page.goto("/chart-interactions");
  await ready(page);
  const chart = page.locator(".sheen-time-series").first();
  await chart.getByRole("button", { name: "Zoom in" }).focus();
  await chart.getByRole("button", { name: "Zoom in" }).press("Enter");
  await expect(chart).toHaveAttribute("data-zoomed", "true");
  await expect(chart.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  await chart.getByRole("button", { name: "Reset zoom" }).press("Enter");
  await expect(chart).not.toHaveAttribute("data-zoomed", "true");
  await chart.locator(".sheen-chart-data summary").click();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});
