import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  await expect(page.locator(".sheen-time-series .uplot")).toHaveCount(1);
}

async function canvasSnapshot(page: Page): Promise<string> {
  return page.locator(".sheen-time-series canvas").evaluateAll(canvases => canvases.map(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
    return canvas.toDataURL();
  }).join("|"));
}

test("uPlot enhancement retains accepted chart and native data during real refresh", async ({ page }) => {
  await page.goto("/chart-time-series");
  await ready(page);
  const figure = page.locator(".sheen-time-series");
  const renderer = figure.locator(".uplot");
  const canvas = figure.locator("canvas").first();
  const disclosure = figure.locator(".sheen-chart-data");
  await disclosure.locator("summary").click();
  const firstRow = disclosure.locator('[data-chart-row="0"]');
  const before = await canvasSnapshot(page);
  await renderer.evaluate(element => element.setAttribute("data-retained-renderer", "yes"));
  await canvas.evaluate(element => element.setAttribute("data-retained-canvas", "yes"));
  await firstRow.evaluate(element => element.setAttribute("data-retained-row", "yes"));
  await page.getByRole("button", { name: "Refresh time series" }).click();
  await expect(page.locator(".loupe-time-series-status")).toHaveText("Refreshing time series");
  const frames = await figure.evaluate(async element => {
    const samples: Array<{ readonly busy: string | null; readonly renderer: boolean; readonly canvas: boolean; readonly fallback: string }> = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const fallback = element.querySelector<SVGElement>(".sheen-time-series-fallback");
      samples.push({
        busy: element.getAttribute("aria-busy"),
        renderer: element.querySelector(".uplot")?.getAttribute("data-retained-renderer") === "yes",
        canvas: element.querySelector("canvas")?.getAttribute("data-retained-canvas") === "yes",
        fallback: fallback ? getComputedStyle(fallback).visibility : "missing",
      });
    }
    return samples;
  });
  expect(frames.every(frame => frame.busy === "true" && frame.renderer && frame.canvas && frame.fallback === "hidden")).toBe(true);
  await expect(figure).not.toHaveAttribute("aria-busy", "true");
  await expect(renderer).toHaveAttribute("data-retained-renderer", "yes");
  await expect(canvas).toHaveAttribute("data-retained-canvas", "yes");
  await expect(firstRow).toHaveAttribute("data-retained-row", "yes");
  await expect(firstRow).toContainText("15 ms");
  await expect.poll(() => canvasSnapshot(page)).not.toBe(before);
});

test("failed refresh retains the exact accepted canvas and data row", async ({ page }) => {
  await page.goto("/chart-time-series");
  await ready(page);
  const before = await canvasSnapshot(page);
  const disclosure = page.locator(".sheen-chart-data");
  await disclosure.locator("summary").click();
  const row = disclosure.locator('[data-chart-row="0"]');
  await expect(row).toContainText("18 ms");
  await page.getByRole("checkbox", { name: "Reject next refresh" }).press("Space");
  await page.getByRole("button", { name: "Refresh time series" }).click();
  await expect(page.locator(".loupe-time-series-status")).toHaveText("Refresh failed; accepted chart retained");
  expect(await canvasSnapshot(page)).toBe(before);
  await expect(row).toContainText("18 ms");
});

test("scoped theme redraw and responsive resize preserve the uPlot canvas", async ({ page }) => {
  await page.goto("/chart-time-series");
  await ready(page);
  const canvas = page.locator(".sheen-time-series canvas").first();
  const renderer = page.locator(".sheen-time-series .uplot");
  await canvas.evaluate(element => element.setAttribute("data-retained", "yes"));
  const beforeTheme = await canvasSnapshot(page);
  const beforeWidth = await renderer.evaluate(element => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Toggle scoped chart theme" }).click();
  await expect(page.locator(".loupe-time-series-scope")).toHaveAttribute("data-sheen-theme", "paper");
  await expect.poll(() => canvasSnapshot(page)).not.toBe(beforeTheme);
  await expect(canvas).toHaveAttribute("data-retained", "yes");
  await page.getByRole("button", { name: "Toggle chart width" }).click();
  await expect.poll(() => renderer.evaluate(element => element.getBoundingClientRect().width)).toBeLessThan(beforeWidth);
  await expect(canvas).toHaveAttribute("data-retained", "yes");
  await expect(page.locator('.sheen-time-series-plot[role="img"]')).toHaveCSS("height", "240px");
});

test("destroy cleans the renderer and scoped token probe before a clean remount", async ({ page }) => {
  await page.goto("/chart-time-series");
  await ready(page);
  await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(1);
  await page.getByRole("button", { name: "Toggle chart mount" }).click();
  await expect(page.locator(".sheen-time-series")).toHaveCount(0);
  await expect(page.locator(".uplot")).toHaveCount(0);
  await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle chart mount" }).click();
  await ready(page);
  await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(1);
});

test("dark deterministic fallback keeps its roots and reserved geometry through delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-time-series", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const figure = page.locator(".sheen-time-series");
    const plot = figure.getByRole("img", { name: "API latency" });
    const fallback = figure.locator(".sheen-time-series-fallback");
    const table = figure.locator("table");
    await figure.evaluate(element => element.setAttribute("data-server-figure", "yes"));
    await plot.evaluate(element => element.setAttribute("data-server-plot", "yes"));
    await fallback.evaluate(element => element.setAttribute("data-server-fallback", "yes"));
    await table.evaluate(element => element.setAttribute("data-server-table", "yes"));
    const before = await plot.boundingBox();
    await expect(fallback.locator('[data-series="p99"]')).toHaveAttribute("d", /M.*M/u);
    await expect(figure.locator(".uplot")).toHaveCount(0);
    release();
    await ready(page);
    await expect(figure).toHaveAttribute("data-server-figure", "yes");
    await expect(plot).toHaveAttribute("data-server-plot", "yes");
    await expect(fallback).toHaveAttribute("data-server-fallback", "yes");
    await expect(fallback).toHaveCSS("visibility", "hidden");
    await expect(table).toHaveAttribute("data-server-table", "yes");
    const after = await plot.boundingBox();
    expect(after?.width).toBe(before?.width);
    expect(after?.height).toBe(before?.height);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("enhanced chart and open native alternative pass the automated accessibility gate", async ({ page }) => {
  await page.goto("/chart-time-series");
  await ready(page);
  await page.locator(".sheen-chart-data summary").click();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("time series has a bounded dark visual baseline", async ({ page }) => {
  await page.goto("/chart-time-series");
  await ready(page);
  await expect(page.locator(".loupe-time-series-scope")).toHaveScreenshot("chart-time-series-dark.png", { animations: "disabled" });
});
