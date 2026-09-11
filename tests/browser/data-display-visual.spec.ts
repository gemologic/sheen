import { expect, test } from "@playwright/test";

test("data display and loading primitives render the bounded theme, density, and RTL matrix", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto("/data-display-visual");
  for (const name of ["dark", "light", "compact", "contrast", "rtl"]) {
    const sample = page.locator(`[data-qualification="${name}"]`);
    await sample.scrollIntoViewIfNeeded();
    await expect(sample.getByRole("heading", { name, exact: true })).toBeInViewport({ ratio: 1 });
    await expect(sample.locator("[data-final-action]")).toBeInViewport({ ratio: 1 });
    await expect(sample).toHaveScreenshot(`data-display-${name}.png`);
  }
});
