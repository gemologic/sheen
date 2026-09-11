import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("surfaces set focus offsets to their actual fill in every theme and mode", async ({ page }) => {
  await page.goto("/surfaces");
  await page.keyboard.press("Tab");
  const samples = await page.locator(".surface-sample input, .surface-sample button").evaluateAll(elements => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    function color(value: string): string {
      if (!context) throw new Error("Canvas unavailable");
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      return "#" + [...context.getImageData(0, 0, 1, 1).data].map(value => value.toString(16).padStart(2, "0")).join("");
    }
    return elements.map(element => {
      if (!(element instanceof HTMLElement)) throw new Error("Expected focusable element");
      const surface = element.closest(".sheen-surface, .sheen-notice");
      const scope = element.closest(".surface-sample");
      if (!surface || !scope) throw new Error("Missing surface context");
      element.focus({ preventScroll: true });
      const style = getComputedStyle(element), parent = getComputedStyle(surface);
      return {
        name: `${scope.getAttribute("data-sheen-theme")}/${scope.getAttribute("data-sheen-mode")}/${surface.getAttribute("data-surface") ?? surface.getAttribute("data-tone")}`,
        offset: color(style.getPropertyValue("--sheen-color-focus-ring-offset")), background: color(parent.backgroundColor),
        ring: color(style.outlineColor), outline: style.outlineStyle,
        text: color(style.color), fill: color(style.backgroundColor === "rgba(0, 0, 0, 0)" ? parent.backgroundColor : style.backgroundColor),
        minimum: scope.getAttribute("data-sheen-theme") === "contrast" ? 7 : 4.5,
      };
    });
  });
  expect(samples).toHaveLength(12 * 14);
  for (const sample of samples) {
    expect(sample.offset, `${sample.name}: offset`).toBe(sample.background);
    expect(sample.outline, sample.name).toBe("solid");
    expect(contrastRatio(sample.ring, sample.background), `${sample.name}: focus`).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(sample.text, sample.fill), `${sample.name}: text`).toBeGreaterThanOrEqual(sample.minimum);
  }
});

test("alerts do not steal focus, separators preserve semantics, and surface changes retain drafts", async ({ page }) => {
  await page.goto("/surfaces");
  const toggle = page.getByRole("button", { name: "Toggle alert" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("Refresh failed");
  await expect(page.getByRole("note")).toHaveCount(12 * 4);
  const sample = page.locator('.surface-sample[data-sheen-theme="paper"][data-sheen-mode="light"]');
  await expect(sample.getByRole("separator")).toHaveCount(2);
  await expect(sample.getByRole("separator", { name: "Vertical section" })).toHaveAttribute("aria-orientation", "vertical");
  await expect(sample.locator("[data-decorative]")).toHaveAttribute("aria-hidden", "true");
  await expect(sample.getByRole("separator", { name: "Vertical section" })).toHaveCSS("width", "1px");
  await expect(sample.getByRole("separator", { name: "Vertical section" })).toHaveCSS("height", "30px");
  const input = sample.getByLabel("paper-light card");
  await input.fill("Retained card draft");
  await input.evaluate(element => element.setAttribute("data-identity", "original"));
  await page.getByRole("button", { name: "Change card surface" }).click();
  await expect(sample.locator("[data-card]")).toHaveAttribute("data-surface", "inset");
  await expect(sample.locator("[data-card]")).toHaveCSS("box-shadow", "none");
  await expect(input).toHaveValue("Retained card draft");
  await expect(input).toHaveAttribute("data-identity", "original");
  await page.getByRole("button", { name: "Toggle direction" }).click();
  await expect(sample.getByRole("note").first()).toHaveCSS("border-right-width", "4px");
  await expect(sample.getByRole("note").first()).toHaveCSS("border-left-width", "1px");
});

test("surface hydration reuses server content and matches reviewed visual states", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto("/surfaces", { waitUntil: "commit" });
    const input = page.getByLabel("obsidian-dark raised");
    await expect(input).toBeVisible();
    await input.evaluate(element => element.setAttribute("data-server-node", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(input).toHaveAttribute("data-server-node", "retained");
    expect(errors).toEqual([]);
    for (const variant of [{ theme: "obsidian", mode: "dark", image: "surfaces-dark.png" }, { theme: "contrast", mode: "light", image: "surfaces-contrast.png" }]) {
      const sample = page.locator(`.surface-sample[data-sheen-theme="${variant.theme}"][data-sheen-mode="${variant.mode}"]`);
      await sample.scrollIntoViewIfNeeded();
      await expect(sample.getByRole("heading")).toBeInViewport({ ratio: 1 });
      await expect(sample.getByRole("button", { name: "Action for danger" })).toBeInViewport({ ratio: 1 });
      await expect(sample).toHaveScreenshot(variant.image);
    }
  } finally { release(); }
});
