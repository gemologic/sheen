import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("toast cards render bounded dark and light RTL failure states", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/toast");
  await page.getByRole("button", { name: "Root show", exact: true }).click();
  const root = page.getByRole("group", { name: "Root saved", exact: true });
  await root.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(root.getByRole("button", { name: "Close", exact: true })).toHaveCSS("outline-style", "solid");
  await expect(root).toBeInViewport({ ratio: 1 });
  await expect(root).toHaveScreenshot("toast-card-dark.png");
  await page.getByRole("button", { name: "Scoped show", exact: true }).click();
  const scoped = page.getByRole("group", { name: "Scoped saved", exact: true });
  await scoped.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(scoped.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
  await scoped.getByRole("button", { name: "Try again", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(scoped.getByRole("button", { name: "Try again", exact: true })).toHaveCSS("outline-style", "solid");
  await scoped.scrollIntoViewIfNeeded();
  await expect(scoped).toBeInViewport({ ratio: 1 });
  await expect(scoped).toHaveScreenshot("toast-card-light-rtl-error.png");
  const colors = await scoped.evaluate(element => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    const color = (value: string): string => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
    };
    const focused = element.querySelector("button:focus");
    if (!focused) throw new Error("Missing focus sample");
    return { fill: color(getComputedStyle(element).backgroundColor), focus: color(getComputedStyle(focused).outlineColor),
      text: [...element.querySelectorAll("strong,p")].map(item => color(getComputedStyle(item).color)) };
  });
  for (const text of colors.text) expect(contrastRatio(text, colors.fill)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(colors.focus, colors.fill)).toBeGreaterThanOrEqual(3);
});
