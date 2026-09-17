import { expect, test } from "@playwright/test";

test("declared cells retain owners while changed values, dependencies, handlers and locale update", async ({ page }) => {
  const response = await page.goto("/cell-retention");
  expect((await response?.text())?.replace(/<[^>]*>/gu, "")).toContain("$1,250.50");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const amount = page.locator('td[data-column="amount"] .sheen-number-text');
  const action = page.getByRole("button", { name: "Choose Alpha", exact: true });
  const owners = await page.evaluateHandle(() => ({
    amount: document.querySelector('td[data-column="amount"] .sheen-number-text'),
    action: document.querySelector('td[data-column="name"] button'),
  }));
  try {
    await page.getByRole("button", { name: "Refresh revision", exact: true }).click();
    await expect(page.getByText("Revision 2", { exact: true })).toBeVisible();
    expect(await owners.evaluate(nodes => Boolean(nodes.amount?.isConnected && nodes.action?.isConnected))).toBe(true);
    await action.press("Enter");
    await expect(page.getByRole("status", { name: "Chosen account" })).toHaveText("Alpha");
    await page.getByRole("button", { name: "Rename", exact: true }).click();
    await page.getByRole("button", { name: "Choose Beta", exact: true }).press("Enter");
    await expect(page.getByRole("status", { name: "Chosen account" })).toHaveText("Beta");
    expect(await owners.evaluate(nodes => Boolean(nodes.amount?.isConnected))).toBe(true);
    await page.getByRole("button", { name: "Change amount", exact: true }).click();
    await expect(amount).toHaveText("$2,000.75");
    await page.getByRole("button", { name: "German locale", exact: true }).click();
    await expect(amount).toHaveText(new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(2000.75));
  } finally { await owners.dispose(); }
});

test("heavy refresh retains unchanged account cells and reuses their numeric formats", async ({ page }) => {
  await page.goto("/admin?workload=heavy&table=continuous&configure=1");
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  const balance = row.locator('td[data-column="balance"]');
  const before = await balance.textContent();
  const owners = await row.evaluateHandle(element => [...element.querySelectorAll('.sheen-badge, .sheen-meter, .loupe-admin-account-cell')]);
  await page.evaluate(() => {
    document.documentElement.dataset.accountFormatters = "0";
    Intl.NumberFormat = new Proxy(Intl.NumberFormat, { construct(target, args, newTarget) {
      const options: unknown = args[1];
      if (typeof options === "object" && options !== null && Reflect.get(options, "minimumFractionDigits") === 2 && Reflect.get(options, "maximumFractionDigits") === 2) {
        document.documentElement.dataset.accountFormatters = String(Number(document.documentElement.dataset.accountFormatters) + 1);
      }
      return Reflect.construct(target, args, newTarget);
    } });
  });
  try {
    expect(await owners.evaluate(nodes => nodes.length)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Refresh", exact: true }).first().click();
    await expect(page.locator(".sheen-status-bar").getByText(/^Revision \d+ ·/u)).toHaveText("Revision 2 · 20000 chart samples");
    await expect(balance).not.toHaveText(before ?? "");
    expect(await owners.evaluate(nodes => nodes.every(node => node.isConnected))).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-account-formatters", "0");
  } finally { await owners.dispose(); }
});
