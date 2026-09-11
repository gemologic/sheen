import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("Floating layers render scoped text, shortcuts, and focus with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/floating");
  await page.getByRole("button", { name: "Save workspace", exact: true }).focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS("animation-duration", "0s");
  await expect(tooltip).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("tooltip-dark.png");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open view options", exact: true }).click();
  const popover = page.getByRole("dialog", { name: "View options", exact: true });
  await expect(popover).toBeInViewport({ ratio: 1 });
  await expect(popover).toHaveCSS("animation-duration", "0s");
  await expect(page).toHaveScreenshot("popover-dark.png");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open scoped settings" }).click();
  await page.getByRole("button", { name: "Open scoped options" }).click();
  const scoped = page.getByRole("dialog", { name: "Scoped options", exact: true });
  await expect(scoped).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("popover-light-rtl.png");
  const colors = await scoped.evaluate(element => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    const color = (value: string): string => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
    };
    const input = element.querySelector("input");
    if (!input) throw new Error("Missing focus sample");
    return { fill: color(getComputedStyle(element).backgroundColor), text: color(getComputedStyle(element).color), focus: color(getComputedStyle(input).outlineColor) };
  });
  expect(contrastRatio(colors.text, colors.fill)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(colors.focus, colors.fill)).toBeGreaterThanOrEqual(3);
});
