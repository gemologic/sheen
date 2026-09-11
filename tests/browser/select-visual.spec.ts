import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("Select visual states and popup contrast in five configurations", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/select-visual");
  for (const name of ["dark", "light", "compact", "contrast", "rtl"]) {
    const sample = page.locator(`[data-select-sample="${name}"]`).first();
    await sample.scrollIntoViewIfNeeded();
    await expect(sample).toBeInViewport({ ratio: 1 });
    await sample.getByRole("button", { name: `${name} popup Live`, exact: true }).click();
    const listbox = page.getByRole("listbox", { name: `${name} popup`, exact: true });
    await expect(listbox).toBeVisible();
    await expect(listbox).toBeInViewport({ ratio: 1 });
    const colors = await sample.evaluate(element => {
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      function color(value: string): string {
        if (!context) throw new Error("Canvas unavailable");
        context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
        return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
      }
      const popup = element.querySelector(".sheen-select-content");
      if (!popup) throw new Error("Missing contextual popup");
      const fill = color(getComputedStyle(popup).backgroundColor);
      return [...popup.querySelectorAll(".sheen-select-option:not([data-disabled])")].map(option => {
        const style = getComputedStyle(option);
        return { text: color(style.color), fill: option.hasAttribute("data-highlighted") ? color(style.backgroundColor) : fill,
          focus: option.hasAttribute("data-highlighted") ? color(style.outlineColor) : undefined };
      });
    });
    expect(colors).toHaveLength(2);
    for (const color of colors) {
      expect(contrastRatio(color.text, color.fill)).toBeGreaterThanOrEqual(name === "contrast" ? 7 : 4.5);
      if (color.focus) expect(contrastRatio(color.focus, color.fill)).toBeGreaterThanOrEqual(3);
    }
    await expect(sample).toHaveScreenshot(`select-${name}.png`);
    await page.keyboard.press("Escape");
    await expect(listbox).toHaveCount(0);
  }
});
