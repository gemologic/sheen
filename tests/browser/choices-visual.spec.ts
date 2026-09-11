import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("choice controls match the bounded visual and contrast matrix", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto("/choices-visual");
  for (const name of ["dark", "light", "compact", "contrast", "rtl"]) {
    const sample = page.locator(`[data-choice-sample="${name}"]`);
    await sample.scrollIntoViewIfNeeded();
    await sample.getByRole("switch", { name: `${name} invalid switch`, exact: true }).focus();
    await expect(sample.getByRole("heading", { name, exact: true })).toBeInViewport({ ratio: 1 });
    await expect(sample.locator("[data-final-choice-content]")).toBeInViewport({ ratio: 1 });
    const colors = await sample.locator(".sheen-switch-control, .sheen-checkbox-control, .sheen-radio-control").evaluateAll(elements => {
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      function color(value: string): string {
        if (!context) throw new Error("Canvas unavailable");
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
      }
      return elements.map(element => {
        const surface = element.closest("[data-choice-sample]");
        if (!surface) throw new Error("Missing sample surface");
        const input = element.previousElementSibling;
        if (!(input instanceof HTMLInputElement)) throw new Error("Missing native control input");
        if (!input.matches(":disabled")) input.focus({ preventScroll: true });
        const style = getComputedStyle(element);
        const mark = element.querySelector(".sheen-switch-thumb, .sheen-checkbox-mark, .sheen-radio-indicator");
        const markStyle = mark ? getComputedStyle(mark) : undefined;
        const label = element.parentElement?.querySelector("label");
        if (!label) throw new Error("Missing control label");
        const bounds = element.getBoundingClientRect(), labelBounds = label.getBoundingClientRect();
        const gap = style.direction === "rtl" ? bounds.left - labelBounds.right : labelBounds.left - bounds.right;
        return {
          fill: color(style.backgroundColor), boundary: color(style.borderInlineStartColor),
          surface: color(getComputedStyle(surface).backgroundColor),
          mark: markStyle?.visibility === "visible" ? color(markStyle.backgroundColor) : undefined,
          focus: style.outlineStyle === "solid" ? color(style.outlineColor) : undefined,
          labelClearance: gap - parseFloat(style.outlineWidth) - parseFloat(style.outlineOffset),
          enabled: !input.matches(":disabled"),
        };
      });
    });
    expect(colors).toHaveLength(28);
    expect(colors.filter(color => color.focus)).toHaveLength(colors.filter(color => color.enabled).length);
    for (const color of colors) {
      expect(contrastRatio(color.boundary, color.surface), `${name}: boundary`).toBeGreaterThanOrEqual(3);
      if (color.mark) expect(contrastRatio(color.mark, color.fill), `${name}: state indicator`).toBeGreaterThanOrEqual(3);
      if (color.focus) {
        expect(contrastRatio(color.focus, color.surface), `${name}: focus`).toBeGreaterThanOrEqual(3);
        expect(color.labelClearance, `${name}: focus must not touch its label`).toBeGreaterThan(0);
      }
    }
    await sample.getByRole("switch", { name: `${name} invalid switch`, exact: true }).focus();
    await expect(sample).toHaveScreenshot(`choices-${name}.png`);
  }
});
