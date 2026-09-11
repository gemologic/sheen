import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.getByRole("status", { name: "Root resolved token" })).not.toHaveText("pending");
}

test("one probe per effective theme scope resolves and cleans up", async ({ page }) => {
  await page.goto("/chart-tokens");
  await ready(page);
  await expect(page.locator("[data-sheen-theme-token-probe]"), "root plus two scopes").toHaveCount(3);
  await page.getByRole("button", { name: "Toggle scoped probes" }).click();
  await expect(page.locator("[data-sheen-theme-token-probe]"), "disposed scopes remove probes").toHaveCount(1);
  await page.getByRole("button", { name: "Toggle scoped probes" }).click();
  await expect(page.locator("[data-sheen-theme-token-probe]"), "remounted scopes acquire fresh probes").toHaveCount(3);
});

test("inherited mode changes redraw retained canvases without a blank frame", async ({ page }) => {
  await page.goto("/chart-tokens");
  await ready(page);
  const output = page.getByRole("status", { name: "Inherited paper resolved token" });
  const before = await output.getAttribute("data-token-value");
  const canvas = page.locator('canvas[aria-label="Inherited paper token canvas"]');
  await canvas.evaluate(element => element.setAttribute("data-retained", "yes"));
  const initial = await canvas.boundingBox();
  await page.getByRole("button", { name: "Toggle inherited mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
  await expect.poll(() => output.getAttribute("data-token-value")).not.toBe(before);
  const samples = await canvas.evaluate(async element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
    const context = element.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable");
    const frames: Array<{ readonly connected: boolean; readonly marker: string | null; readonly alpha: number; readonly width: number; readonly height: number }> = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const bounds = element.getBoundingClientRect();
      frames.push({ connected: element.isConnected, marker: element.getAttribute("data-retained"), alpha: context.getImageData(10, 10, 1, 1).data[3] ?? 0, width: bounds.width, height: bounds.height });
    }
    return frames;
  });
  expect(samples.every(sample => sample.connected && sample.marker === "yes" && sample.alpha === 255 && sample.width === initial?.width && sample.height === initial?.height)).toBe(true);
});

test("Loupe invalidation applies a last-write token edit on the existing canvas", async ({ page }) => {
  await page.goto("/chart-tokens");
  await ready(page);
  const canvas = page.locator('canvas[aria-label="Editor override token canvas"]');
  await canvas.evaluate(element => element.setAttribute("data-retained", "yes"));
  const beforePaints = Number(await canvas.getAttribute("data-paint-count"));
  await page.getByRole("button", { name: "Apply live token override" }).click();
  const output = page.getByRole("status", { name: "Editor override resolved token" });
  await expect(output).toHaveAttribute("data-token-value", "rgb(255 0 170)");
  expect(await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
    const context = element.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable");
    return [...context.getImageData(10, 10, 1, 1).data];
  })).toEqual([255, 0, 170, 255]);
  await expect(canvas).toHaveAttribute("data-paint-count", String(beforePaints + 1));
  await expect(canvas).toHaveAttribute("data-retained", "yes");
  await expect(page.locator("style[data-loupe-token-editor]")).toHaveCount(1);
});

test("dark server fallback and scoped canvas nodes survive delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-tokens", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const canvas = page.locator('canvas[aria-label="Root token canvas"]');
    await canvas.evaluate(element => element.setAttribute("data-server-canvas", "yes"));
    await expect(page.getByRole("status", { name: "Root resolved token" })).toHaveText("pending");
    await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(0);
    const fallbackAlpha = await canvas.evaluate(element => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Canvas context unavailable");
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return context.getImageData(0, 0, 1, 1).data[3] ?? 0;
    });
    expect(fallbackAlpha).toBe(255);
    release();
    await ready(page);
    await expect(canvas).toHaveAttribute("data-server-canvas", "yes");
    await expect(page.locator("[data-sheen-theme-token-probe]")).toHaveCount(3);
    expect(await canvas.evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected canvas");
      return element.getContext("2d")?.getImageData(10, 10, 1, 1).data[3] ?? 0;
    })).toBe(255);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("stored light preferences own first paint and hydrate the retained canvas", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ mode: "light", theme: "slate", accent: "rose" })));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/chart-tokens", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
    await expect(page.locator("html")).toHaveAttribute("data-sheen-theme", "slate");
    const canvas = page.locator('canvas[aria-label="Root token canvas"]');
    await canvas.evaluate(element => element.setAttribute("data-light-server-canvas", "yes"));
    expect(await canvas.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    release();
    await ready(page);
    await expect(canvas).toHaveAttribute("data-light-server-canvas", "yes");
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
    const resolved = await page.evaluate(() => {
      const output = document.querySelector<HTMLOutputElement>('output[aria-label="Root resolved token"]');
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[aria-label="Root token canvas"]');
      if (!output || !canvas) throw new Error("Chart token fixture is incomplete");
      return { reported: output.dataset.tokenValue, effective: getComputedStyle(canvas).getPropertyValue("--sheen-chart-1").trim() };
    });
    expect(resolved.reported).toBe(resolved.effective);
  } finally { release(); }
});
