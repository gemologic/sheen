import { expect, test } from "@playwright/test";

for (const width of [375, 768, 1440]) {
  test(`RTL metric strip keeps dividers, complete values, and its utilization visual at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/admin?direction=rtl");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const group = page.getByRole("group", { name: "Operational summary" });
    const meter = group.getByRole("meter", { name: "Mean account utilization" });
    await expect(meter).toBeVisible();
    if (width === 1440) {
      const fillRules = await page.evaluate(() => {
        const selectors: string[] = [];
        function visit(rules: CSSRuleList): void {
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule && rule.style.background.includes("--sheen-meter-fill")) selectors.push(rule.selectorText);
            if (rule instanceof CSSGroupingRule) visit(rule.cssRules);
          }
        }
        for (const sheet of document.styleSheets) visit(sheet.cssRules);
        return selectors;
      });
      expect(fillRules.some(selector => selector.includes("::-webkit-meter-optimum-value"))).toBe(true);
    }
    await expect(group.locator("dt")).toHaveCount(6);
    await expect(group.locator(".sheen-stat-value")).toHaveCount(6);
    const geometry = await group.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const cells = [...element.querySelectorAll(".sheen-stat-group-item")].map(cell => cell.getBoundingClientRect());
      const gaps = cells.flatMap(cell => cells.filter(other => other.top === cell.top && other.left > cell.left).sort((a, b) => a.left - b.left).slice(0, 1).map(other => other.left - cell.right));
      return { direction: getComputedStyle(element).direction, fits: cells.every(cell => cell.left >= bounds.left && cell.right <= bounds.right), gaps, rows: new Set(cells.map(cell => cell.top)).size };
    });
    expect(geometry.direction).toBe("rtl");
    expect(geometry.fits).toBe(true);
    expect(geometry.gaps.every(gap => Math.abs(gap - 1) < 0.1)).toBe(true);
    expect(geometry.rows).toBe(width === 1440 ? 1 : 3);
    if (width === 1440) {
      await meter.evaluate(element => element.setAttribute("data-retained", "yes"));
      const initial = await meter.evaluate(element => element instanceof HTMLMeterElement ? element.value : -1);
      expect(initial).toBeGreaterThan(0);
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(group.locator("dl").first()).toContainText("240");
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect(meter).toHaveAttribute("data-retained", "yes");
      await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
      await expect(meter).toHaveAttribute("data-retained", "yes");
      await expect(meter).toHaveJSProperty("value", initial);
    }
  });
}
