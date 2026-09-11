import { expect, test } from "@playwright/test";

test("Loupe landing page exposes Composer and reflows without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Build the application, then inspect every seam.", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Composer", exact: true })).toHaveAttribute("href", "/composer");
  await expect(page.getByRole("link", { name: "Open Composer", exact: true })).toHaveAttribute("href", "/composer");
  expect(await page.locator("#app").evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
});

test("Composer keeps a real page scroll owner and usable intermediate-width canvas", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto("/composer");
  await expect(page.frameLocator('iframe[title="Editable AdminApp preview"]').locator(".sheen-admin-app")).toBeVisible();

  const geometry = await page.locator("#app").evaluate(element => {
    const before = element.scrollTop;
    element.scrollTo({ top: 700, behavior: "instant" });
    return { before, after: element.scrollTop, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY, horizontalOverflow: element.scrollWidth - element.clientWidth };
  });
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  expect(geometry.after).toBeGreaterThan(geometry.before);
  expect(geometry.overflowY).toBe("auto");
  expect(geometry.horizontalOverflow).toBe(0);

  await page.locator("#app").evaluate(element => element.scrollTo({ top: 0, behavior: "instant" }));
  const palette = page.locator(".loupe-composer-palette-column");
  const canvas = page.locator(".loupe-composer-canvas-scroll");
  await page.locator(".loupe-composer-workspace").scrollIntoViewIfNeeded();
  const paletteBox = await palette.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(paletteBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(paletteBox?.width ?? 0).toBeGreaterThan(200);
  expect(canvasBox?.width ?? 0).toBeGreaterThan(560);
  const clearSearch = page.locator(".loupe-composer-palette .sheen-input-addon > .sheen-button");
  await expect(clearSearch).toHaveText("Clear search");
  const clearSize = await clearSearch.evaluate(element => {
    const style = getComputedStyle(element);
    return { width: style.width, compactControl: style.getPropertyValue("--sheen-control-h-sm").trim() };
  });
  expect(clearSize.width).toBe(clearSize.compactControl);
});
