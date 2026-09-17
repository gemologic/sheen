import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const mode of ["dark", "light"]) {
  for (const width of [375, 768, 1024, 1440]) {
    test(`Studio admin ${mode} at ${width}px has complete readable first paint`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/admin?mode=${mode}`);
      await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
      const scope = page.locator(".sheen-admin-scope");
      await expect(scope).toHaveAttribute("data-sheen-theme", "studio");
      await expect(scope).toHaveAttribute("data-sheen-accent", "indigo");
      await expect(page.getByText("Customize starter", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Reset appearance", exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
      await expect(page.getByRole("group", { name: "Operational summary" })).toContainText("Needs review");
      const measurements = await page.locator(".loupe-admin-stat-group").evaluate(async element => {
        await document.fonts.ready;
        const value = element.querySelector(".sheen-stat-value");
        const title = document.querySelector(".loupe-admin-page .sheen-heading");
        if (!value || !title) throw new Error("Missing first-paint content");
        return {
          font: getComputedStyle(value).fontFamily,
          loaded: document.fonts.check('510 30px "Inter Variable"'),
          size: getComputedStyle(value).fontSize,
          titleSize: getComputedStyle(title).fontSize,
          overflow: document.documentElement.scrollWidth > innerWidth,
          animated: document.getAnimations().some(animation => animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && element.contains(animation.effect.target)),
        };
      });
      expect(measurements).toEqual({ font: '"Inter Variable", system-ui, sans-serif', loaded: true, size: "30px", titleSize: "20px", overflow: false, animated: false });
      await expect(page).toHaveScreenshot(`studio-admin-${mode}-${width}.png`, { animations: "disabled" });
      if (width === 1440 || width === 375) {
        const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(accessibility.violations).toEqual([]);
      }
    });
  }
}

test("admin numeric cells use fixed precision without unsupported historical trends", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator('.loupe-admin-stat-group [data-trend]')).toHaveCount(0);
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator('[data-column="balance"]')).toHaveText("1,250.00");
  await expect(row.locator('[data-column="requests"]')).toHaveText("18,000");
  await expect(row.locator('[data-column="utilization"]')).toContainText("35.0%");
  const alignment = await row.locator('[data-column="balance"]').evaluate(element => getComputedStyle(element).textAlign);
  expect(alignment).toBe("end");
});
