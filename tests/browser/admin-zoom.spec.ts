import { expect, test } from "@playwright/test";

for (const route of ["", "/accounts", "/policies", "/settings"]) {
  test(`admin${route || "/overview"} keeps page width and fields bounded at 200 percent CSS zoom`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/admin${route}`);
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await page.locator("html").evaluate(element => { element.style.zoom = "2"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const clippedInputs = await page.locator('input:not([type="hidden"]), textarea').evaluateAll(elements => elements.filter(element => {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      return box.width < 24 || box.height < 24;
    }).map(element => element.getAttribute("aria-label") ?? element.getAttribute("name")));
    expect(clippedInputs).toEqual([]);
    const obscuredControls = await page.locator(".sheen-shell-header button, .sheen-shell-header a").evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return element.scrollWidth > element.clientWidth + 1 || hit === null || !element.contains(hit);
    }).map(element => element.getAttribute("aria-label") ?? element.textContent?.trim()));
    expect(obscuredControls).toEqual([]);
    if (route === "") {
      const lineCounts = await page.locator(".sheen-stat-value").evaluateAll(elements => elements.map(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
      }));
      expect(lineCounts).toEqual([1, 1, 1, 1, 1, 1]);
    }
    await page.screenshot({ path: `/tmp/sheen-admin-zoom-${route.slice(1) || "overview"}.png` });
  });
}
