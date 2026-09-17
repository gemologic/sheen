import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

for (const locale of ["de-DE", "ar-EG"]) {
  test(`account numeric values retain locale ordering and precision in ${locale}`, async ({ page }) => {
    await page.addInitScript(locale => localStorage.setItem("sheen", JSON.stringify({ locale })), locale);
    await page.goto("/admin/accounts");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const row = page.locator('tbody tr[data-row-id="account-0001"]');
    const balance = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(1250);
    const requests = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(18000);
    const percent = new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(0.35);
    await expect(row.locator('[data-column="balance"]')).toHaveText(balance);
    await expect(row.locator('[data-column="requests"]')).toHaveText(requests);
    await expect(row.locator('[data-column="utilization"] .sheen-number-text')).toHaveText(percent);
    await row.focus();
    await row.press("Enter");
    const details = page.locator(".sheen-admin-details-owner");
    await expect(details).toContainText(balance);
    await expect(details).toContainText(requests);
    await expect(details).toContainText(percent);
  });
}

test("account sorting and JSON export preserve raw numeric values", async ({ page }) => {
  await page.goto("/admin/accounts");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const header = page.locator('th[data-column="balance"]');
  await header.locator(".sheen-data-table-sort").click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await header.locator(".sheen-data-table-sort").click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator("tbody tr[data-row-id]").first()).toHaveAttribute("data-row-id", "account-0240");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export JSON", exact: true }).click();
  const download = await downloading;
  const path = await download.path();
  if (!path) throw new Error("Missing exported accounts");
  const rows: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(rows)) throw new Error("Expected account array");
  expect(rows).toHaveLength(240);
  expect(rows[0]).toMatchObject({ balance: 1250 + 239 * 173.25 });
  expect(rows.at(-1)).toMatchObject({ balance: 1250, requests: 18000, utilization: 35 });
});

test("account details and table use the same exact monetary, count, and percentage formats", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  await expect(row).toContainText("1,250.00");
  await expect(row).toContainText("18,000");
  await expect(row).toContainText("35.0%");
  await expect(row.locator('[data-column="status"]')).toHaveText("Paused");
  await expect(row.locator('[data-column="status"] .sheen-icon')).toHaveAttribute("aria-hidden", "true");
  for (const [id, label, icon] of [["account-0001", "Paused", "remove"], ["account-0002", "Active", "check"], ["account-0008", "Review", "info"]] satisfies readonly (readonly [string, string, string])[]) {
    const status = page.locator(`tr[data-row-id="${id}"] [data-column="status"]`);
    await expect(status).toHaveText(label);
    await expect(status.locator(".sheen-icon")).toHaveAttribute("data-sheen-icon", icon);
    await expect(status.locator("svg:visible")).toHaveCount(1);
  }
  await row.focus();
  await row.press("Enter");
  const details = page.locator(".sheen-admin-details-owner");
  await expect(details).toContainText("Managed balance (USD)1,250.00");
  await expect(details).toContainText("Monthly requests18,000");
  await expect(details).toContainText("Capacity35.0%");
});
