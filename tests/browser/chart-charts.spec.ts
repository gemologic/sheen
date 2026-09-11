import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-svg-chart")).toHaveCount(4);
  await expect.poll(() => page.locator(".sheen-svg-chart svg").evaluateAll(elements => elements.every(element => {
    const box = element.getBoundingClientRect();
    const viewBox = element.getAttribute("viewBox")?.split(" ").map(Number);
    return viewBox?.[2] === Math.round(box.width) && viewBox[3] === Math.round(box.height);
  }))).toBe(true);
}

async function pathData(chart: Locator, selector: string): Promise<string> {
  return await chart.locator(selector).getAttribute("d") ?? "";
}

test("line, area, and bar charts preserve explicit gaps and expose native data", async ({ page }) => {
  await page.goto("/chart-charts");
  await ready(page);
  const line = page.locator(".sheen-line-chart");
  const area = page.locator(".sheen-area-chart");
  const grouped = page.locator(".sheen-bar-chart").first();
  const horizontal = page.locator(".sheen-bar-chart").nth(1);

  expect((await pathData(line, '[data-series="secondary"] .sheen-chart-series-line')).match(/M/gu)).toHaveLength(2);
  expect((await pathData(area, '[data-series="secondary"] .sheen-chart-series-area')).match(/M/gu)).toHaveLength(2);
  await expect(line.locator(".sheen-chart-annotation")).toContainText("Deploy");
  await expect(grouped.locator(".sheen-chart-bars rect")).toHaveCount(7);
  await expect(horizontal.locator(".sheen-chart-bars rect")).toHaveCount(8);
  await expect(horizontal).toHaveAttribute("data-layout", "horizontal");
  await expect(horizontal).toHaveAttribute("data-arrangement", "stacked");
  const groupedNorth = await grouped.locator('[data-category="North"]').evaluateAll(rects => rects.map(rect => rect.getAttribute("x")));
  expect(new Set(groupedNorth).size).toBe(2);

  await line.locator(".sheen-chart-data summary").click();
  await grouped.locator(".sheen-chart-data summary").click();
  await expect(line.getByRole("table", { name: "Request rate" })).toContainText("Missing value");
  await expect(grouped.getByRole("table", { name: "Regional revenue" })).toContainText("South");
  await expect(grouped.getByRole("table", { name: "Regional revenue" })).toContainText("Missing value");
  const linePath = line.locator('[data-series="secondary"]');
  await line.getByRole("button", { name: "Hide Secondary" }).click();
  await expect(line.getByRole("button", { name: "Show Secondary" })).toHaveAttribute("aria-pressed", "false");
  await expect(linePath).toBeHidden();
  await expect(line.getByRole("table", { name: "Request rate" })).toContainText("Secondary");
  await line.getByRole("button", { name: "Show Secondary" }).click();
  await expect(linePath).toBeVisible();
});

test("real refresh retains chart and table nodes throughout atomic acceptance", async ({ page }) => {
  await page.goto("/chart-charts");
  await ready(page);
  const gallery = page.locator(".loupe-chart-gallery-scope");
  const line = page.locator(".sheen-line-chart");
  const grouped = page.locator(".sheen-bar-chart").first();
  const linePath = line.locator('[data-series="primary"] .sheen-chart-series-line');
  const firstBar = grouped.locator('[data-category="North"][data-series="Current"]');
  await line.locator(".sheen-chart-data summary").click();
  const firstRow = line.locator('[data-chart-row="0"]');
  const beforePath = await linePath.getAttribute("d");
  const beforeBar = await firstBar.getAttribute("height");
  await line.evaluate(element => element.setAttribute("data-retained-line", "yes"));
  await line.locator("svg").evaluate(element => element.setAttribute("data-retained-svg", "yes"));
  await linePath.evaluate(element => element.setAttribute("data-retained-path", "yes"));
  await firstBar.evaluate(element => element.setAttribute("data-retained-bar", "yes"));
  await firstRow.evaluate(element => element.setAttribute("data-retained-row", "yes"));

  await page.getByRole("button", { name: "Refresh chart gallery" }).click();
  await expect(page.locator(".loupe-chart-gallery-status")).toHaveText("Refreshing chart gallery");
  const frames = await gallery.evaluate(async element => {
    const samples: Array<{ readonly busy: boolean; readonly retained: boolean; readonly path: string; readonly bar: string }> = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const line = element.querySelector(".sheen-line-chart");
      const path = line?.querySelector('[data-series="primary"] .sheen-chart-series-line');
      const bar = element.querySelector('.sheen-bar-chart [data-category="North"][data-series="Current"]');
      samples.push({
        busy: [...element.querySelectorAll(".sheen-svg-chart")].every(chart => chart.getAttribute("aria-busy") === "true"),
        retained: line?.getAttribute("data-retained-line") === "yes"
          && line.querySelector("svg")?.getAttribute("data-retained-svg") === "yes"
          && path?.getAttribute("data-retained-path") === "yes"
          && bar?.getAttribute("data-retained-bar") === "yes"
          && line.querySelector('[data-chart-row="0"]')?.getAttribute("data-retained-row") === "yes",
        path: path?.getAttribute("d") ?? "",
        bar: bar?.getAttribute("height") ?? "",
      });
    }
    return samples;
  });
  expect(frames.every(frame => frame.busy && frame.retained && frame.path === beforePath && frame.bar === beforeBar)).toBe(true);
  await expect(line).not.toHaveAttribute("aria-busy", "true");
  await expect(linePath).toHaveAttribute("data-retained-path", "yes");
  await expect(firstBar).toHaveAttribute("data-retained-bar", "yes");
  await expect(firstRow).toHaveAttribute("data-retained-row", "yes");
  await expect(firstRow).toContainText("20");
  await expect.poll(() => linePath.getAttribute("d")).not.toBe(beforePath);
  await expect(firstBar).toHaveAttribute("data-value", "46");
});

test("SVG pointer and keyboard inspection retain one overlay and expose equivalent values", async ({ page }) => {
  await page.goto("/chart-charts");
  await ready(page);
  const line = page.locator(".sheen-line-chart");
  const linePlot = line.getByRole("img", { name: "Request rate" });
  const lineTooltip = line.locator(".sheen-chart-tooltip");
  const lineStatus = line.locator(".sheen-chart-visually-hidden[aria-live]");
  await lineTooltip.evaluate(element => element.setAttribute("data-retained", "yes"));
  const box = await linePlot.boundingBox();
  if (box === null) throw new Error("Expected line chart interaction geometry");
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
  await expect(lineTooltip).toBeVisible();
  await expect(lineTooltip).toContainText("Primary");
  const updates = Number(await lineTooltip.getAttribute("data-updates"));
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);
  await expect.poll(async () => Number(await lineTooltip.getAttribute("data-updates"))).toBeGreaterThan(updates);
  await expect(lineTooltip).toHaveAttribute("data-retained", "yes");

  await linePlot.focus();
  await linePlot.press("Home");
  await expect(lineTooltip).toHaveAttribute("data-index", "0");
  await expect(lineStatus).toContainText("Primary: 18");
  await linePlot.press("ArrowRight");
  await expect(lineTooltip).toHaveAttribute("data-index", "1");
  await line.getByRole("button", { name: "Hide Secondary" }).click();
  await expect(lineTooltip.locator("li").nth(1)).toBeHidden();
  await expect(lineTooltip).toHaveAttribute("data-retained", "yes");

  const bar = page.locator(".sheen-bar-chart").first();
  const barPlot = bar.getByRole("img", { name: "Regional revenue" });
  const barTooltip = bar.locator(".sheen-chart-tooltip");
  await barPlot.focus();
  await barPlot.press("End");
  await expect(barTooltip).toHaveAttribute("data-index", "3");
  await expect(barTooltip).toContainText("West");
  await expect(barTooltip).toContainText("Current");
  await barPlot.press("Escape");
  await expect(barTooltip).toBeHidden();
});

test("failed refresh retains exact accepted geometry and values", async ({ page }) => {
  await page.goto("/chart-charts");
  await ready(page);
  const linePath = page.locator('.sheen-line-chart [data-series="primary"] .sheen-chart-series-line');
  const bar = page.locator('.sheen-bar-chart').first().locator('[data-category="North"][data-series="Current"]');
  const beforePath = await linePath.getAttribute("d");
  const beforeBar = await bar.getAttribute("height");
  await page.getByRole("checkbox", { name: "Reject next refresh" }).press("Space");
  await page.getByRole("button", { name: "Refresh chart gallery" }).click();
  await expect(page.locator(".loupe-chart-gallery-status")).toHaveText("Refresh failed; accepted charts retained");
  await expect(linePath).toHaveAttribute("d", beforePath ?? "");
  await expect(bar).toHaveAttribute("height", beforeBar ?? "");
  await expect(bar).toHaveAttribute("data-value", "42");
});

test("server chart roots and native disclosures survive delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-charts", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const line = page.locator(".sheen-line-chart");
    const path = line.locator('[data-series="primary"] .sheen-chart-series-line');
    const bar = page.locator(".sheen-bar-chart").first().locator('[data-category="North"][data-series="Current"]');
    const disclosure = line.locator(".sheen-chart-data");
    await disclosure.locator("summary").click();
    const table = disclosure.getByRole("table", { name: "Request rate" });
    await line.evaluate(element => element.setAttribute("data-server-line", "yes"));
    await path.evaluate(element => element.setAttribute("data-server-path", "yes"));
    await bar.evaluate(element => element.setAttribute("data-server-bar", "yes"));
    await table.evaluate(element => element.setAttribute("data-server-table", "yes"));
    await expect(line.locator("svg")).toHaveAttribute("viewBox", "0 0 640 240");
    const before = await line.locator(".sheen-svg-chart-plot").boundingBox();
    release();
    await ready(page);
    await expect(line).toHaveAttribute("data-server-line", "yes");
    await expect(path).toHaveAttribute("data-server-path", "yes");
    await expect(bar).toHaveAttribute("data-server-bar", "yes");
    await expect(table).toHaveAttribute("data-server-table", "yes");
    await expect(disclosure).toHaveAttribute("open", "");
    const after = await line.locator(".sheen-svg-chart-plot").boundingBox();
    expect(after?.height).toBe(before?.height);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("responsive SVG coordinates track their viewport without document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chart-charts");
  await ready(page);
  const path = page.locator('.sheen-line-chart [data-series="primary"] .sheen-chart-series-line');
  await path.evaluate(element => element.setAttribute("data-retained-resize", "yes"));
  await expect(page.locator(".loupe-chart-gallery-grid")).toHaveCSS("grid-template-columns", /\d+px/u);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const narrow = await page.locator(".sheen-line-chart svg").getAttribute("viewBox");
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect.poll(() => page.locator(".sheen-line-chart svg").getAttribute("viewBox")).not.toBe(narrow);
  await expect(path).toHaveAttribute("data-retained-resize", "yes");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const labelBox = await page.locator(".sheen-line-chart .sheen-chart-axis-label").boundingBox();
  const plotBox = await page.locator(".sheen-line-chart .sheen-svg-chart-plot").boundingBox();
  expect(labelBox?.y).toBeGreaterThanOrEqual(plotBox?.y ?? 0);
  expect((labelBox?.y ?? 0) + (labelBox?.height ?? 0)).toBeLessThanOrEqual((plotBox?.y ?? 0) + (plotBox?.height ?? 0));
});

test("all SVG charts and their open native alternatives pass the automated accessibility gate", async ({ page }) => {
  await page.goto("/chart-charts");
  await ready(page);
  for (const summary of await page.locator(".sheen-chart-data summary").all()) await summary.click();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("SVG chart vocabulary has a bounded dark visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto("/chart-charts");
  await ready(page);
  await expect(page.locator(".loupe-chart-gallery-scope")).toHaveScreenshot("chart-charts-dark.png", { animations: "disabled" });
});
