import { expect, test } from "@playwright/test";

test("late optional fonts do not move already painted metric text", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*.woff2*", async route => { await barrier; await route.continue(); });
  try {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const metrics = page.locator(".loupe-admin-stat-group .sheen-stat-value");
    await expect(metrics).toHaveCount(6);
    // Keep downloads pending beyond the optional font's initial rendering period.
    await page.waitForTimeout(250);
    const before = await metrics.evaluateAll(elements => elements.map(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
    }));
    release();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('510 30px "Inter Variable"'))).toBe(true);
    const after = await metrics.evaluateAll(elements => elements.map(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
    }));
    expect(after).toEqual(before);
  } finally {
    release();
  }
});

for (const width of [375, 768, 1440]) {
  test(`Studio fallback fonts preserve readable geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const blocked: string[] = [];
    await page.route("**/*.woff2*", async route => {
      blocked.push(route.request().url());
      await route.abort();
    });
    await page.goto("/admin");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await page.evaluate(() => document.fonts.ready);
    expect(blocked.some(url => url.includes("InterVariable"))).toBe(true);
    expect(await page.evaluate(() => document.fonts.check('510 30px "Inter Variable"'))).toBe(false);
    const metrics = page.locator(".loupe-admin-stat-group .sheen-stat-value");
    await expect(metrics).toHaveCount(6);
    const geometry = await metrics.evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { size: style.fontSize, weight: style.fontWeight, fits: element.scrollWidth <= element.clientWidth + 1, visible: element.getBoundingClientRect().height > 0 };
    }));
    expect(geometry).toEqual(Array.from({ length: 6 }, () => ({ size: "30px", weight: "510", fits: true, visible: true })));
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toHaveCSS("font-size", "20px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("group", { name: "Operational summary" })).toContainText("240");
  });
}
