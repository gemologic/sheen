import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-svg-chart")).toHaveCount(5);
}

test("donut, pie, scatter, heatmap, histogram, gauge, and bar sparkline render SSR-complete marks with native data", async ({ page }) => {
  await page.goto("/chart-family");
  await ready(page);
  const donut = page.locator(".sheen-donut-chart").first();
  await expect(donut).toHaveAttribute("data-shape", "donut");
  await expect(donut.locator(".sheen-donut-total")).toHaveText("91");
  await expect(donut.locator('[data-part-index="3"]')).toHaveAttribute("data-hidden", "true");
  await expect(page.locator(".loupe-chart-pie")).toHaveAttribute("data-shape", "pie");
  await expect(page.locator(".loupe-chart-pie .sheen-donut-center")).toHaveCount(0);
  await donut.locator(".sheen-chart-data summary").click();
  await expect(donut.getByRole("table", { name: "Storage by tier" })).toContainText("Missing value");

  const scatter = page.locator(".sheen-scatter-chart");
  await expect(scatter.locator('.sheen-scatter-points [data-shape="square"]:not([data-hidden])')).toHaveCount(4);
  await expect(scatter.locator('[data-series-index="1"][data-row="2"]')).toHaveAttribute("data-hidden", "true");

  const heatmap = page.locator(".sheen-heatmap");
  await expect(heatmap.locator(".sheen-heatmap-cell")).toHaveCount(40);
  await expect(heatmap.locator('.sheen-heatmap-cell[data-step="missing"]')).toHaveCount(1);
  await expect(heatmap.locator(".sheen-heatmap-scale")).toContainText("Missing value");

  const histogram = page.locator(".sheen-histogram");
  await expect(histogram.locator(".sheen-chart-bars rect").first()).toHaveAttribute("data-category", /–/u);

  const disk = page.getByRole("meter", { name: "Disk usage" });
  await expect(disk).toHaveAttribute("aria-valuetext", "76%, High");
  await expect(page.getByRole("meter", { name: "Battery" })).toHaveAttribute("aria-valuetext", "18%, Low");
  expect((await page.getByRole("img", { name: /Deploys per day/u }).locator("path").getAttribute("d"))?.match(/M/gu)).toHaveLength(9);

  const results = await new AxeBuilder({ page }).include(".loupe-chart-gallery-scope").analyze();
  expect(results.violations).toEqual([]);
});

test("keyboard and pointer inspection retain one overlay per chart", async ({ page }) => {
  await page.goto("/chart-family");
  await ready(page);
  const donut = page.locator(".sheen-donut-chart").first();
  const donutPlot = donut.getByRole("img", { name: "Storage by tier" });
  const donutTooltip = donut.locator(".sheen-chart-tooltip");
  await donutTooltip.evaluate(element => element.setAttribute("data-retained", "yes"));
  await donutPlot.focus();
  await donutPlot.press("Home");
  await expect(donutTooltip).toHaveAttribute("data-index", "0");
  await expect(donut.locator(".sheen-chart-visually-hidden[aria-live]")).toContainText("Hot, Terabytes: 42");
  await donutPlot.press("End");
  await expect(donutTooltip).toHaveAttribute("data-index", "2");
  await donut.getByRole("button", { name: "Hide Warm" }).click();
  await expect(donut.locator(".sheen-donut-total")).toHaveText("60");
  await expect(donutTooltip).toHaveAttribute("data-retained", "yes");

  const scatter = page.locator(".sheen-scatter-chart");
  const scatterPlot = scatter.getByRole("img", { name: "Latency against load" });
  await scatterPlot.focus();
  await scatterPlot.press("Home");
  await expect(scatter.locator(".sheen-chart-visually-hidden[aria-live]")).toContainText("West, Requests per second: 90");
  await scatterPlot.press("ArrowRight");
  await expect(scatter.locator(".sheen-chart-visually-hidden[aria-live]")).toContainText("East, Requests per second: 120");
  await scatterPlot.press("Escape");
  await expect(scatter.locator(".sheen-chart-tooltip")).toBeHidden();

  const heatmap = page.locator(".sheen-heatmap");
  const heatmapPlot = heatmap.getByRole("img", { name: "Errors by weekday and hour" });
  const heatmapTooltip = heatmap.locator(".sheen-chart-tooltip");
  await heatmapPlot.focus();
  await heatmapPlot.press("ArrowDown");
  await expect(heatmapTooltip).toHaveAttribute("data-index", "0");
  await heatmapPlot.press("ArrowDown");
  await heatmapPlot.press("ArrowDown");
  await heatmapPlot.press("End");
  await expect(heatmapTooltip).toHaveAttribute("data-index", "23");
  await heatmapPlot.press("Home");
  for (let index = 0; index < 4; index++) await heatmapPlot.press("ArrowRight");
  await expect(heatmap.locator(".sheen-chart-visually-hidden[aria-live]")).toContainText("Wed, 12, Errors: Missing value");
  const box = await heatmapPlot.boundingBox();
  if (box === null) throw new Error("Expected heatmap geometry");
  const updates = Number(await heatmapTooltip.getAttribute("data-updates"));
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
  await expect.poll(async () => Number(await heatmapTooltip.getAttribute("data-updates"))).toBeGreaterThan(updates);

  const histogramPlot = page.locator(".sheen-histogram").getByRole("img", { name: "Response time distribution" });
  await histogramPlot.focus();
  await histogramPlot.press("Home");
  await expect(page.locator(".sheen-histogram .sheen-chart-tooltip")).toContainText("Requests");
});

test("real refresh retains chart, mark, and table nodes through atomic acceptance", async ({ page }) => {
  await page.goto("/chart-family");
  await ready(page);
  const scope = page.locator(".loupe-chart-gallery-scope");
  const slice = page.locator('.sheen-donut-chart >> nth=0 >> [data-part-index="0"]');
  const point = page.locator('.sheen-scatter-chart [data-series-index="0"][data-row="0"]');
  const cell = page.locator('.sheen-heatmap [data-x="12"][data-y="Thu"]');
  const fill = page.getByRole("meter", { name: "Disk usage" }).locator(".sheen-gauge-fill");
  const before = { slice: await slice.getAttribute("d"), point: await point.getAttribute("d"), cell: await cell.getAttribute("data-step"), fill: await fill.getAttribute("d") };
  for (const [name, locator] of [["slice", slice], ["point", point], ["cell", cell], ["fill", fill]] as const) await locator.evaluate((element, marker) => element.setAttribute("data-retained", marker), name);
  await page.getByRole("button", { name: "Refresh chart family" }).click();
  await expect(page.locator(".loupe-chart-gallery-status")).toHaveText("Refreshing chart family");
  const frames = await scope.evaluate(async element => {
    const samples: Array<{ readonly busy: boolean; readonly retained: boolean; readonly slice: string }> = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push({
        busy: [...element.querySelectorAll(".sheen-svg-chart")].every(chart => chart.getAttribute("aria-busy") === "true"),
        retained: element.querySelectorAll("[data-retained]").length === 4,
        slice: element.querySelector('.sheen-donut-chart [data-part-index="0"]')?.getAttribute("d") ?? "",
      });
    }
    return samples;
  });
  expect(frames.every(frame => frame.busy && frame.retained && frame.slice === before.slice)).toBe(true);
  await expect.poll(() => slice.getAttribute("d")).not.toBe(before.slice);
  await expect(slice).toHaveAttribute("data-retained", "slice");
  await expect(point).toHaveAttribute("data-retained", "point");
  expect(await point.getAttribute("d")).not.toBe(before.point);
  await expect(cell).toHaveAttribute("data-retained", "cell");
  await expect(fill).toHaveAttribute("data-retained", "fill");
  expect(await fill.getAttribute("d")).not.toBe(before.fill);
  await expect(page.getByRole("meter", { name: "Disk usage" })).toHaveAttribute("aria-valuetext", "93%, Critical");
  await expect(page.getByRole("meter", { name: "Battery" })).toHaveAttribute("aria-valuetext", "Missing value");
});

test("failed refresh retains accepted geometry", async ({ page }) => {
  await page.goto("/chart-family");
  await ready(page);
  const slice = page.locator(".sheen-donut-chart").first().locator('[data-part-index="0"]');
  const before = await slice.getAttribute("d");
  await page.getByRole("checkbox", { name: "Reject next refresh" }).press("Space");
  await page.getByRole("button", { name: "Refresh chart family" }).click();
  await expect(page.locator(".loupe-chart-gallery-status")).toHaveText("Refresh failed; accepted charts retained");
  await expect(slice).toHaveAttribute("d", before ?? "");
  await expect(page.getByRole("meter", { name: "Disk usage" })).toHaveAttribute("aria-valuetext", "76%, High");
});

test("server chart family roots survive delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-family", { waitUntil: "commit" });
    const slice = page.locator(".sheen-donut-chart").first().locator('[data-part-index="0"]');
    const cell = page.locator('.sheen-heatmap [data-x="12"][data-y="Thu"]');
    const meter = page.getByRole("meter", { name: "Disk usage" });
    await expect(slice).toHaveAttribute("d", /^M/u);
    await slice.evaluate(element => element.setAttribute("data-server", "yes"));
    await cell.evaluate(element => element.setAttribute("data-server", "yes"));
    await meter.evaluate(element => element.setAttribute("data-server", "yes"));
    release();
    await ready(page);
    await expect(slice).toHaveAttribute("data-server", "yes");
    await expect(cell).toHaveAttribute("data-server", "yes");
    await expect(meter).toHaveAttribute("data-server", "yes");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("chart family has a bounded dark baseline", async ({ page }) => {
  await page.goto("/chart-family");
  await ready(page);
  await expect(page.locator(".loupe-chart-gallery-scope")).toHaveScreenshot("chart-family-dark.png", { animations: "disabled" });
});
