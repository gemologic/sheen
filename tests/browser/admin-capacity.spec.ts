import { expect, test } from "@playwright/test";

for (const scale of [1, 2]) test.describe(`canvas pixel ratio ${scale}`, () => {
  test.use({ deviceScaleFactor: scale });
  test("traffic canvas updates its actual axis font without replacing the renderer", async ({ page }) => {
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text: string, x: number, y: number, maxWidth?: number): void {
      this.canvas.dataset.lastDrawnFont = this.font;
      if (maxWidth === undefined) draw.call(this, text, x, y);
      else draw.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto("/admin?configure=1");
  const chart = page.locator(".sheen-time-series");
  await expect(chart).toHaveAttribute("data-enhanced", "true");
  const canvas = chart.locator("canvas").first();
  await expect(canvas).toHaveAttribute("data-last-drawn-font", new RegExp(`${12 * scale}px.*Inter Variable`, "u"));
  const retained = await canvas.elementHandle();
  await page.getByText("Customize starter", { exact: true }).click();
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await page.getByRole("option", { name: "Graphite", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-last-drawn-font", new RegExp(`${11 * scale}px.*IBM Plex Sans`, "u"));
  expect(await canvas.evaluate((element, original) => element === original, retained)).toBe(true);
  });
});

for (const mode of ["dark", "light"]) {
  test(`traffic series contrast and retained redraw in ${mode}`, async ({ page }) => {
    await page.goto(`/admin?mode=${mode}`);
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const chart = page.locator(".sheen-time-series");
    await expect(chart).toHaveAttribute("data-enhanced", "true");
    const ratios = await chart.evaluate(element => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Missing color resolver");
      const luminance = (pixels: Uint8ClampedArray): number => [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
        const channel = (pixels[index] ?? 0) / 255;
        return sum + weight * (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      }, 0);
      const ancestors: Element[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) ancestors.unshift(node);
      context.fillStyle = "white";
      context.fillRect(0, 0, 1, 1);
      for (const node of ancestors) {
        context.fillStyle = getComputedStyle(node).backgroundColor;
        context.fillRect(0, 0, 1, 1);
      }
      const background = context.getImageData(0, 0, 1, 1);
      const base = luminance(background.data);
      return [...element.querySelectorAll(".sheen-chart-legend .sheen-chart-legend-marker")].map(marker => {
        context.putImageData(background, 0, 0);
        context.fillStyle = getComputedStyle(marker).color;
        context.fillRect(0, 0, 1, 1);
        const foreground = luminance(context.getImageData(0, 0, 1, 1).data);
        return (Math.max(base, foreground) + 0.05) / (Math.min(base, foreground) + 0.05);
      });
    });
    expect(ratios).toHaveLength(3);
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
    const canvas = chart.locator("canvas").first();
    const retained = await canvas.elementHandle();
    const beforePaint = await canvas.evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected chart canvas");
      return element.toDataURL();
    });
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    const frames = await canvas.evaluate(async element => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected chart canvas");
      const context = element.getContext("2d");
      if (!context) throw new Error("Missing renderer context");
      const samples = [];
      for (let index = 0; index < 60; index++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const pixels = context.getImageData(0, 0, element.width, element.height).data;
        samples.push(element.isConnected && pixels.some((value, offset) => offset % 4 === 3 && value > 0));
      }
      return samples;
    });
    expect(frames).toEqual(Array.from({ length: 60 }, () => true));
    await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
    expect(await canvas.evaluate((element, before) => element === before, retained)).toBe(true);
    await expect.poll(() => canvas.evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected chart canvas");
      return element.toDataURL();
    })).not.toBe(beforePaint);
  });
}

test("traffic legends distinguish series and tooltip precision matches native data", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const chart = page.locator(".sheen-time-series");
  await expect(chart).toHaveAttribute("data-enhanced", "true");
  const markers = chart.locator(".sheen-chart-legend .sheen-chart-legend-marker");
  expect(await markers.evaluateAll(elements => elements.map(element => [element.getAttribute("data-color"), element.getAttribute("data-encoding")]))).toEqual([["accent", "solid"], ["foreground", "dashed"], ["muted", "dotted"]]);
  await chart.locator(".sheen-chart-data > summary").click();
  const cells = await chart.locator("tbody tr").first().locator("td").allTextContents();
  expect(cells).toHaveLength(3);
  const values = cells;
  for (const value of values) expect(value).toMatch(/^[\d,]+$/u);
  const plot = chart.getByRole("img", { name: "Workspace traffic", exact: true });
  await plot.focus();
  await plot.press("Home");
  const tooltip = chart.locator(".sheen-chart-tooltip");
  await expect(tooltip).toHaveAttribute("data-index", "0");
  for (const [index, value] of values.entries()) await expect(tooltip.locator("li").nth(index)).toContainText(value);
});

for (const direction of ["ltr", "rtl"]) {
  test(`regional capacity arithmetic and threshold agree in ${direction}`, async ({ page }) => {
    await page.goto(`/admin?direction=${direction}`);
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const region = page.getByRole("region", { name: "Regional capacity", exact: true });
    await expect(region).toContainText("Keep at least 14% available capacity");
    const items = region.locator("li");
    const usedValues = [74, 61, 68, 55, 47, 51];
    await expect(items).toHaveCount(usedValues.length);
    for (const [index, used] of usedValues.entries()) {
      const item = items.nth(index);
      await expect(item).toContainText(`${used}% used · ${100 - used}% available`);
      const meter = item.getByRole("meter");
      await expect(meter).toHaveJSProperty("value", used);
      await expect(meter).toHaveJSProperty("max", 100);
      await expect(meter).toHaveJSProperty("high", 86);
      await expect(meter).toHaveAccessibleName(/maximum target 86 percent/u);
      const offset = await item.locator(".loupe-admin-capacity-threshold").evaluate(element => {
        const track = element.parentElement;
        if (!track) throw new Error("Missing capacity track");
        return Number.parseFloat(getComputedStyle(element).insetInlineStart) / track.getBoundingClientRect().width;
      });
      expect(offset).toBeCloseTo(0.86, 2);
    }
    const retained = await region.getByRole("meter").first().elementHandle();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(region.getByRole("meter").first()).toHaveJSProperty("value", 74);
    await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
    expect(await region.getByRole("meter").first().evaluate((element, before) => element === before, retained)).toBe(true);
  });
}
