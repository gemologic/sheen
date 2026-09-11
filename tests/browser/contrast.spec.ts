import { test, expect } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";
import { accents, themes } from "../../packages/tokens/src/themes";

test("the complete theme, mode, and accent palette passes rendered contrast gates without a screenshot Cartesian product", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/contrast");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await page.keyboard.press("Tab");
  for (const accent of Object.keys(accents)) {
    await page.getByLabel("Accent under test").selectOption(accent);
    const samples = await page.locator(".contrast-fixture [data-surface] button").evaluateAll(elements => {
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      function color(css: string): string {
        if (!context) throw new Error("Canvas unavailable");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = css;
        context.fillRect(0, 0, 1, 1);
        return "#" + [...context.getImageData(0, 0, 1, 1).data].map(value => value.toString(16).padStart(2, "0")).join("");
      }
      return elements.map(element => {
        if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a button");
        element.focus({ preventScroll: true });
        const style = getComputedStyle(element);
        const surface = element.closest("[data-surface]");
        const theme = element.closest(".contrast-fixture");
        if (!surface || !theme) throw new Error("Missing contrast fixture context");
        const surfaceColor = color(getComputedStyle(surface).backgroundColor);
        return {
          name: `${theme.getAttribute("data-sheen-theme")}/${theme.getAttribute("data-sheen-mode")}/${surface.getAttribute("data-surface")}/${element.textContent}`,
          enhanced: theme.getAttribute("data-sheen-theme") === "contrast",
          foreground: color(style.color), background: color(style.backgroundColor),
          ring: color(style.outlineColor), offset: color(style.getPropertyValue("--sheen-color-focus-ring-offset")), surface: surfaceColor,
          outline: style.outlineStyle, width: style.outlineWidth,
        };
      });
    });
    expect(samples).toHaveLength(themes.length * 2 * 7 * 8);
    for (const sample of samples) {
      expect(contrastRatio(sample.foreground, sample.background), `${accent}/${sample.name}: text`).toBeGreaterThanOrEqual(sample.enhanced ? 7 : 4.5);
      expect(sample.outline, `${accent}/${sample.name}: visible outline`).toBe("solid");
      expect(sample.width).toBe("2px");
      expect(contrastRatio(sample.ring, sample.offset), `${accent}/${sample.name}: inner adjacent surface`).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(sample.ring, sample.surface), `${accent}/${sample.name}: outer adjacent surface`).toBeGreaterThanOrEqual(3);
    }
  }
});
