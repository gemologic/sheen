import { expect, test } from "@playwright/test";

test("empty accounts and a filtered query expose different recovery actions", async ({ page }) => {
  await page.goto("/admin/accounts?state=empty");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.getByRole("region", { name: "Nothing here yet", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toHaveCount(0);
  await expect(page.locator("tbody tr[data-row-id]")).toHaveCount(0);

  await page.goto("/admin/accounts");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const search = page.getByRole("searchbox", { name: "Search Northstar accounts", exact: true });
  await search.fill("nonexistent-account-xyz");
  await expect(page.getByRole("region", { name: "No results", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filters", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator('tbody tr[data-row-id="account-0001"]')).toBeVisible();
  await expect(page.locator(".sheen-data-table-viewport")).toBeFocused();
});

test("initial load failure offers a working retry without an empty-results message", async ({ page }) => {
  await page.goto("/admin/accounts?state=error");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.getByText("Accounts could not be loaded. Try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Nothing here yet", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator('tbody tr[data-row-id="account-0001"]')).toBeVisible();
  await expect(page.getByText("Accounts could not be loaded. Try again.", { exact: true })).toHaveCount(0);
});

test("cold loading reserves a visible content region", async ({ page }) => {
  await page.goto("/admin/accounts?state=loading");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator("tbody tr[data-row-id]")).toHaveCount(0);
  const skeleton = page.locator(".sheen-skeleton");
  await expect(skeleton).toBeVisible();
  const size = await skeleton.boundingBox();
  const rootFontSize = await page.locator("html").evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(size?.height).toBeCloseTo(28 * rootFontSize);
  expect(size?.width).toBeGreaterThan(200);
});
