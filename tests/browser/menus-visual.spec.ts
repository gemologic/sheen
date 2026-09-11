import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("menus render checked values, shortcuts, scoped RTL, and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/menus");
  await page.getByRole("button", { name: "Workspace actions" }).press("ArrowDown");
  await page.getByRole("menuitemcheckbox", { name: "Show archived" }).click();
  const menu = page.getByRole("menu", { name: "Workspace actions", exact: true });
  await expect(menu).toHaveCSS("animation-duration", "0s");
  await expect(menu).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("menu-dark.png");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open scoped settings" }).click();
  await page.getByRole("button", { name: "Scoped actions" }).press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "More", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("menuitem", { name: "Export", exact: true })).toBeFocused();
  const scoped = page.getByRole("menu", { name: "More", exact: true });
  for (const layer of await page.getByRole("menu").all()) await expect(layer).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("menu-light-rtl.png");
  const colors = await scoped.evaluate(element => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    const color = (value: string): string => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
    };
    const focused = element.querySelector("[data-highlighted]");
    if (!focused) throw new Error("Missing focused menu item");
    const style = getComputedStyle(focused);
    return { fill: color(style.backgroundColor), text: color(style.color), focus: color(style.outlineColor) };
  });
  expect(contrastRatio(colors.text, colors.fill)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(colors.focus, colors.fill)).toBeGreaterThanOrEqual(3);
});
