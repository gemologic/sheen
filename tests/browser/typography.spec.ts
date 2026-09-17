import { test, expect } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";
import { themes } from "../../packages/tokens/src/themes";

test("typography semantics, token roles, and native tag removal survive theme-aware hydration", async ({ page }) => {
  const fontRequests: string[] = [];
  page.on("request", request => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await page.goto("/typography");
  await expect.poll(() => page.evaluate(() => ({
    sans: document.fonts.check('400 13px "IBM Plex Sans"'),
    semibold: document.fonts.check('600 16px "IBM Plex Sans"'),
    mono: document.fonts.check('400 12px "IBM Plex Mono"'),
  }))).toEqual({ sans: true, semibold: true, mono: true });
  expect(fontRequests.map(url => new URL(url).pathname.split("/").at(-1)).sort()).toEqual([
    "IBMPlexMono-Regular.woff2",
    "IBMPlexSans-Regular.woff2",
    "IBMPlexSans-SemiBold.woff2",
    "InterVariable.woff2",
  ]);
  expect(fontRequests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  await expect(page.locator("[data-class-override]")).toHaveCSS("font-size", "20px");
  const mutedColor = await page.locator('.typography-sample[data-sheen-theme="obsidian"][data-sheen-mode="dark"] [data-muted]').evaluate(element => getComputedStyle(element).color);
  await expect(page.locator("[data-class-override]")).toHaveCSS("color", mutedColor);
  const sample = page.locator('.typography-sample[data-sheen-theme="paper"][data-sheen-mode="light"]');
  await expect(sample.getByRole("heading", { name: "Paper / light", level: 2 })).toHaveCSS("font-size", "16px");
  await expect(sample.locator("[data-body]")).toHaveCSS("font-size", "13px");
  await expect(sample.locator("[data-muted]")).toHaveCSS("font-size", "11px");
  await expect(sample.locator("[data-number]")).toHaveCSS("font-variant-numeric", "tabular-nums");
  expect(await sample.locator("[data-number]").evaluate(element => getComputedStyle(element).fontFeatureSettings)).toContain('"tnum"');
  await expect(sample.locator("code")).toHaveText("workspace.id");
  await expect(sample.locator("kbd")).toHaveAttribute("aria-label", "Control K");
  const input = sample.getByLabel("paper-light note");
  await input.fill("Draft survives typography changes");
  await input.evaluate(element => element.setAttribute("data-identity", "original"));
  await page.getByRole("button", { name: "Toggle text role" }).click();
  await expect(sample.locator("[data-body]")).toHaveCSS("font-size", "14px");
  await expect(page.locator('.typography-sample[data-sheen-theme="vellum"][data-sheen-mode="light"] [data-body]')).toHaveCSS("font-size", "16px");
  await expect(input).toHaveAttribute("data-identity", "original");
  await expect(input).toHaveValue("Draft survives typography changes");
  const remove = sample.getByRole("button", { name: "Entfernen Review", exact: true });
  await remove.focus();
  await page.keyboard.press("Enter");
  await expect(sample.getByRole("status")).toHaveText("Removal requests 1");
  await page.keyboard.press("Space");
  await expect(sample.getByRole("status")).toHaveText("Removal requests 2");
  await expect(remove).toBeVisible();
  await expect(sample.getByRole("button", { name: "Entfernen Locked", exact: true })).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(sample.getByRole("button", { name: "Entfernen Solid", exact: true })).toBeFocused();
  await expect(sample.locator('.sheen-badge:not(.sheen-tag)[role="button"]')).toHaveCount(0);
});

test("slow self-hosted fonts do not swap component geometry after first paint", async ({ page }) => {
  let fontRequests = 0;
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route(/IBMPlexSans-Regular[^/]*\.woff2(?:\?|$)/, async route => {
    const request = new URL(route.request().url());
    if (request.searchParams.has("sheen-font-direct")) {
      await route.continue();
      return;
    }
    fontRequests += 1;
    await barrier;
    await route.continue();
  });
  try {
    await page.goto("/typography", { waitUntil: "commit" });
    const probe = page.locator("[data-font-probe]");
    await expect(probe).toBeAttached();
    await expect.poll(() => fontRequests).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType("paint").some(entry => entry.name === "first-contentful-paint"))).toBe(true);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const before = await probe.boundingBox();
    expect(before).not.toBeNull();
    release();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(100);
    expect(await probe.boundingBox()).toEqual(before);
  } finally {
    release();
  }
});

test("rendered badge colors and tag focus remain legible across every theme and mode", async ({ page }) => {
  await page.goto("/typography");
  await page.keyboard.press("Tab");
  const samples = await page.locator(".typography-sample .sheen-badge").evaluateAll(elements => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    function color(css: string): string {
      if (!context) throw new Error("Canvas unavailable");
      context.clearRect(0, 0, 1, 1); context.fillStyle = css; context.fillRect(0, 0, 1, 1);
      return "#" + [...context.getImageData(0, 0, 1, 1).data].map(value => value.toString(16).padStart(2, "0")).join("");
    }
    return elements.map(element => {
      const scope = element.closest(".typography-sample");
      if (!scope) throw new Error("Missing scope");
      const style = getComputedStyle(element);
      const fill = style.backgroundColor === "rgba(0, 0, 0, 0)" ? getComputedStyle(scope).backgroundColor : style.backgroundColor;
      const button = element.querySelector("button:not(:disabled)");
      if (button instanceof HTMLButtonElement) button.focus({ preventScroll: true });
      const focused = button ? getComputedStyle(button) : undefined;
      return {
        name: `${scope.getAttribute("data-sheen-theme")}/${scope.getAttribute("data-sheen-mode")}/${element.textContent}`,
        threshold: scope.getAttribute("data-sheen-theme") === "contrast" ? 7 : 4.5,
        fg: color(style.color), bg: color(fill),
        focus: focused ? { fg: color(focused.color), color: color(focused.outlineColor), style: focused.outlineStyle, offset: color(focused.getPropertyValue("--sheen-color-focus-ring-offset")) } : null,
      };
    });
  });
  expect(samples).toHaveLength(themes.length * 2 * (9 * 3 + 5));
  for (const sample of samples) {
    expect(contrastRatio(sample.fg, sample.bg), sample.name).toBeGreaterThanOrEqual(sample.threshold);
    if (sample.focus) {
      expect(contrastRatio(sample.focus.fg, sample.bg), `${sample.name}/remove text`).toBeGreaterThanOrEqual(sample.threshold);
      expect(sample.focus.style).toBe("solid");
      expect(contrastRatio(sample.focus.color, sample.bg), `${sample.name}/outer focus`).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(sample.focus.color, sample.focus.offset), `${sample.name}/inner focus`).toBeGreaterThanOrEqual(3);
    }
  }
});

test("typography reuses delayed server DOM and matches reviewed visual states", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto("/typography", { waitUntil: "commit" });
    const body = page.locator(".typography-sample [data-body]").first();
    await expect(body).toBeVisible();
    await body.evaluate(element => element.setAttribute("data-server-node", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(body).toHaveAttribute("data-server-node", "retained");
    expect(errors).toEqual([]);
    await expect(page.locator('.typography-sample[data-sheen-theme="obsidian"][data-sheen-mode="dark"]')).toHaveScreenshot("typography-dark.png");
    await expect(page.locator('.typography-sample[data-sheen-theme="contrast"][data-sheen-mode="light"]')).toHaveScreenshot("typography-contrast.png");
  } finally { release(); }
});
