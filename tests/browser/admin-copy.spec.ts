import { expect, test } from "@playwright/test";

for (const scenario of [{ query: "", accounts: 240, review: 32 }, { query: "?state=empty", accounts: 0, review: 0 }]) {
  test(`admin counts reconcile with the displayed account scope ${scenario.query || "ready"}`, async ({ page }) => {
    await page.goto(`/admin${scenario.query}`);
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(page.getByRole("link", { name: `Accounts ${scenario.accounts}`, exact: true })).toBeVisible();
    const stats = page.getByRole("group", { name: "Operational summary" });
    await expect(stats.locator("dl").filter({ has: page.locator("dt", { hasText: /^Accounts$/ }) }).locator(".sheen-stat-value")).toHaveText(String(scenario.accounts));
    await expect(stats.locator("dl").filter({ has: page.locator("dt", { hasText: /^Needs review$/ }) }).locator(".sheen-stat-value")).toHaveText(String(scenario.review));
    const counts = page.locator(".sheen-status-counts");
    await expect(counts.locator("div").filter({ has: page.locator("dt", { hasText: /^Accounts$/ }) }).locator("dd")).toHaveText(String(scenario.accounts));
    await expect(counts.locator("div").filter({ has: page.locator("dt", { hasText: /^Needs review$/ }) }).locator("dd")).toHaveText(String(scenario.review));
    await expect(page.locator(".sheen-admin-app")).not.toContainText("chart samples");
    await expect(page.locator(".sheen-admin-app")).not.toContainText("Revision 1");
    await page.getByRole("button", { name: "Notifications 2", exact: true }).click();
    await expect(page.getByText(`${scenario.review} accounts need review.`, { exact: true })).toBeVisible();
  });
}
