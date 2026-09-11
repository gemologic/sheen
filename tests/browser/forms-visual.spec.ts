import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("form controls render labels, errors, addons, search, and textareas across the bounded visual matrix", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto("/forms-visual");
  for (const name of ["dark", "light", "compact", "contrast", "rtl"]) {
    const sample = page.locator(`[data-form-sample="${name}"]`);
    await sample.scrollIntoViewIfNeeded();
    await sample.getByLabel(`${name} invalid account`, { exact: true }).focus();
    await expect(sample.getByRole("heading", { name, exact: true })).toBeInViewport({ ratio: 1 });
    await expect(sample.locator("[data-final-form-action]")).toBeInViewport({ ratio: 1 });
    const placeholders = await sample.locator("input[placeholder]").evaluateAll(elements => {
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      function color(value: string): string {
        if (!context) throw new Error("Canvas unavailable");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
      }
      return elements.map(element => ({
        label: element.getAttribute("placeholder"),
        foreground: color(getComputedStyle(element, "::placeholder").color),
        background: color(getComputedStyle(element).backgroundColor),
        opacity: getComputedStyle(element, "::placeholder").opacity,
      }));
    });
    expect(placeholders).toHaveLength(3);
    for (const placeholder of placeholders) {
      expect(placeholder.opacity).toBe("1");
      expect(contrastRatio(placeholder.foreground, placeholder.background), `${name}/${placeholder.label}: placeholder`).toBeGreaterThanOrEqual(name === "contrast" ? 7 : 4.5);
    }
    await expect(sample).toHaveScreenshot(`forms-${name}.png`);
  }
});
