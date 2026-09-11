import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.getByRole("heading", { name: "Theme editor", exact: true })).toBeVisible();
  await expect(page.getByRole("status", { name: "Theme editor recovery status", exact: true })).not.toHaveText(/Checking/u);
}

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function downloadText(page: Page): Promise<string> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export theme.ts", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("custom-theme.theme.ts");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

test("theme editor derives and edits a retained scoped preview with recoverable canvas refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/theme-editor");
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  const preview = page.locator(".loupe-theme-editor-preview");
  const canvas = page.getByRole("img", { name: "Live chart token preview", exact: true });
  const draft = page.getByRole("textbox", { name: "Retained preview draft", exact: true });
  await preview.evaluate(element => element.setAttribute("data-editor-identity", "retained"));
  await canvas.evaluate(element => element.setAttribute("data-canvas-identity", "retained"));
  await draft.fill("Keep the local component owner");

  await page.getByRole("textbox", { name: "dark background", exact: true }).fill("#101820");
  await choose(page, "Accent preset", "cyan");
  await page.getByRole("spinbutton", { name: "Neutral hue", exact: true }).fill("230");
  await preview.evaluate(element => {
    let frames = 0;
    let opaque = true;
    const sample = (): void => {
      const background = getComputedStyle(element).backgroundColor;
      opaque = opaque && element.isConnected && background !== "transparent" && background !== "rgba(0, 0, 0, 0)";
      frames += 1;
      if (frames === 20) element.setAttribute("data-editor-frames", opaque ? "opaque" : "blank");
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("button", { name: "Derive dark mode", exact: true }).click();
  await expect(preview).toHaveCSS("background-color", "rgb(16, 24, 32)");
  await expect(preview).toHaveAttribute("data-editor-frames", "opaque");
  await expect(preview).toHaveAttribute("data-editor-identity", "retained");
  await expect(draft).toHaveValue("Keep the local component owner");
  await expect(page.getByText("Both modes pass contrast and chart-palette validation.", { exact: true })).toBeVisible();

  await choose(page, "Token", "chart-1");
  const raw = page.getByRole("textbox", { name: "Raw CSS value", exact: true });
  const paints = Number(await canvas.getAttribute("data-paint-count"));
  await raw.fill("#ff00aa");
  await expect.poll(async () => Number(await canvas.getAttribute("data-paint-count"))).toBeGreaterThan(paints);
  await expect(canvas).toHaveAttribute("data-canvas-identity", "retained");
  expect(await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected a canvas");
    return [...(element.getContext("2d")?.getImageData(10, 10, 1, 1).data ?? [])];
  })).toEqual([255, 0, 170, 255]);
  await expect.poll(() => page.evaluate(() => {
    const value: unknown = JSON.parse(localStorage.getItem("sheen:loupe:theme-editor:v1") ?? "null");
    if (typeof value !== "object" || value === null || !("definition" in value)) return undefined;
    const definition = value.definition;
    if (typeof definition !== "object" || definition === null || !("dark" in definition)) return undefined;
    const dark = definition.dark;
    return typeof dark === "object" && dark !== null && "chart-1" in dark ? dark["chart-1"] : undefined;
  })).toBe("#ff00aa");

  await page.reload();
  await ready(page);
  await choose(page, "Token", "chart-1");
  await expect(page.getByRole("textbox", { name: "Raw CSS value", exact: true })).toHaveValue("#ff00aa");
  await expect(page.getByRole("img", { name: "Live chart token preview", exact: true })).toHaveAttribute("data-paint-count", /[1-9]/u);
  expect(errors).toEqual([]);
});

test("theme editor round-trips generated modules and rejects executable imports", async ({ page }) => {
  await page.goto("/theme-editor");
  await ready(page);
  const source = await downloadText(page);
  expect(source).toContain('import { defineTheme } from "@gemologic/sheen-tokens";');
  expect(source).toContain('"defaultMode": "dark"');

  const renamed = source.replace('"id": "custom-theme"', '"id": "roundtrip-theme"').replace('"label": "Custom theme"', '"label": "Round-trip theme"');
  const imported = page.getByRole("textbox", { name: "Theme JSON or Loupe theme.ts", exact: true });
  await imported.fill(renamed);
  await page.getByRole("button", { name: "Import theme", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Theme ID", exact: true })).toHaveValue("roundtrip-theme");
  await expect(page.getByText("Both modes pass contrast and chart-palette validation.", { exact: true })).toBeVisible();

  await imported.fill('console.log("must not run");');
  await page.getByRole("button", { name: "Import theme", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("TypeScript is never executed");
  await expect(page.getByRole("textbox", { name: "Theme ID", exact: true })).toHaveValue("roundtrip-theme");
});

test("theme editor has a dark, hydration-stable loading boundary before recoverable client state", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/theme-editor", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    await expect(page.locator(".loupe-theme-editor-loading")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".loupe-theme-editor-preview")).toHaveCount(0);
    const background = await page.locator(".loupe-theme-editor-loading").evaluate(element => getComputedStyle(element).backgroundColor);
    expect(background).not.toBe("rgba(0, 0, 0, 0)");
    release();
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    await expect(page.locator(".loupe-theme-editor-preview")).toBeVisible();
    expect(errors).toEqual([]);
  } finally { release(); }
});
