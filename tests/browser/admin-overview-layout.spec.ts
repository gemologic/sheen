import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`Overview retains one main scroll owner and visible context at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/admin");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const pane = page.locator(".loupe-admin-overview");
    await expect(pane.locator(".loupe-admin-overview-context")).toContainText("Current account snapshot · Traffic:");
    await expect(pane.locator(".loupe-admin-overview-context")).toContainText("Sep 1, 2026");
    await expect(pane.locator(".loupe-admin-overview-context")).toContainText("UTC");
    const chart = pane.locator(".loupe-admin-chart-card");
    const rail = pane.locator(".loupe-admin-service-panel");
    const chartBox = await chart.boundingBox();
    const railBox = await rail.boundingBox();
    if (!chartBox || !railBox) throw new Error("Missing overview regions");
    if (width === 1440) expect(chartBox.width).toBeGreaterThan(railBox.width * 1.8);
    else expect(railBox.y).toBeGreaterThanOrEqual(chartBox.y + chartBox.height);
    const topbar = page.locator(".sheen-admin-topbar");
    const before = await topbar.boundingBox();
    if (width === 1440) {
      expect(Math.abs(chartBox.height - railBox.height)).toBeLessThan(48);
      await pane.evaluate(element => { element.scrollTop = 350; });
      await expect(pane).toHaveJSProperty("scrollTop", 350);
      expect(await topbar.boundingBox()).toEqual(before);
    } else {
      await page.evaluate(() => window.scrollTo(0, 350));
      expect(await page.evaluate(() => window.scrollY)).toBe(350);
      await expect(pane).toHaveJSProperty("scrollTop", 0);
    }
    expect(await pane.evaluate(element => {
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor !== document.scrollingElement && ancestor.scrollTop !== 0) return false;
      }
      return document.documentElement.scrollWidth <= innerWidth;
    })).toBe(true);
    await pane.getByRole("link", { name: "View all", exact: true }).scrollIntoViewIfNeeded();
    await expect(pane.getByRole("link", { name: "View all", exact: true })).toBeInViewport();
  });
}
