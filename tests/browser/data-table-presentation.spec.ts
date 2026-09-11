import { expect, test } from "@playwright/test";

test("compact density scales every shared table surface without changing implementations", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ density: "compact" })));
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/table-mobile");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");

  const mobileFixture = page.getByRole("region", { name: "Mobile card table" });
  const table = mobileFixture.getByRole("table", { name: "Mobile accounts" });
  await expect(table.locator("thead th").first()).toHaveCSS("height", "28px");
  await expect(table.locator("tbody tr[data-row-id]").first()).toHaveCSS("height", "28px");
  await expect(table.locator("tfoot td").first()).toHaveCSS("height", "28px");
  await expect(table.locator(".sheen-data-table-selection-cell").first()).toHaveCSS("height", "28px");
  await expect(mobileFixture.getByRole("button", { name: "Select all matching" })).toHaveCSS("height", "26px");

  await page.setViewportSize({ width: 390, height: 844 });
  const root = mobileFixture.locator(".sheen-data-table");
  const card = mobileFixture.locator(".sheen-data-table-mobile-card").first();
  const footer = mobileFixture.locator(".sheen-data-table-mobile-footer");
  const pagination = mobileFixture.getByRole("navigation", { name: "Mobile accounts, card view" });
  await expect(root).toHaveCSS("border-top-width", "0px");
  await expect(card).toHaveCSS("padding", "8px 6px");
  await expect(footer).toHaveCSS("padding", "8px 6px");
  await expect(pagination.getByRole("button", { name: "Next page" })).toHaveCSS("height", "26px");

  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const editRegion = page.getByRole("region", { name: "Editable DataTable" });
  const editRow = editRegion.locator("tbody tr[data-row-id]").first();
  const title = editRegion.locator('td[data-column="title"]');
  await expect(editRow).toHaveCSS("height", "28px");
  await title.locator("span[tabindex='0']").focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  const editorHeight = await editor.evaluate(element => element.getBoundingClientRect().height);
  expect(editorHeight).toBeGreaterThan(20);
  expect(editorHeight).toBeLessThan(24);
  await expect(editRow).toHaveCSS("height", "28px");
});
