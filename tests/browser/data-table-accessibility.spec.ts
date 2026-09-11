import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

async function hideColumnWithKeyboard(page: Page, section: Locator, name: string): Promise<void> {
  const trigger = section.getByRole("button", { name: "Columns", exact: true });
  if (await trigger.isVisible()) {
    await trigger.focus();
    await trigger.press("Enter");
  } else {
    const more = section.getByRole("button", { name: "More actions", exact: true });
    await more.focus();
    await more.press("Enter");
    const columns = page.getByRole("menuitem", { name: "Columns", exact: true });
    await columns.focus();
    await columns.press("ArrowRight");
  }
  const column = page.getByRole("menuitem", { name, exact: true });
  await column.focus();
  await column.press("ArrowRight");
  const visibility = page.getByRole("menuitemcheckbox", { name: "Show column", exact: true });
  await visibility.focus();
  await visibility.press("Enter");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
}

test("keyboard search, filter, and sort publish atomic assistive state", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table");
  const result = root.locator(".sheen-data-table-result-count");
  const search = root.getByRole("searchbox", { name: "Search Accounts", exact: true });
  await expect(result).toHaveAttribute("aria-live", "polite");
  await expect(result).toHaveAttribute("aria-atomic", "true");
  await expect(result).toHaveText("80 results");

  await page.keyboard.press("Control+f");
  await expect(search).toBeFocused();
  await search.evaluate(element => element.setAttribute("data-focus-identity", "retained"));
  await page.keyboard.type("Acme 01");
  await expect(root).toHaveAttribute("data-previous-results", "");
  await expect(result).toContainText("Previous results");
  await expect(result).toHaveText("1 result");
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("data-focus-identity", "retained");

  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await expect(result).toHaveText("80 results");
  const accountHeader = root.getByRole("columnheader", { name: /Account/u });
  const accountSort = accountHeader.getByRole("button", { name: "Account", exact: true });
  await accountSort.focus();
  await accountSort.press("Enter");
  await expect(accountHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(accountSort).toHaveAccessibleDescription("ascending");

  const addFilter = root.getByRole("button", { name: "+ Filter", exact: true });
  await addFilter.focus();
  await addFilter.press("Enter");
  const picker = page.getByRole("dialog", { name: "Filter columns", exact: true });
  const pickerSearch = picker.getByRole("searchbox", { name: "Search filter columns", exact: true });
  await pickerSearch.focus();
  await page.keyboard.type("Acco");
  const accountColumn = picker.getByRole("button", { name: "Account", exact: true });
  await accountColumn.focus();
  await accountColumn.press("Enter");
  const editor = page.getByRole("dialog", { name: "+ Filter: Account", exact: true });
  const value = editor.getByRole("textbox", { name: "Value", exact: true });
  await value.focus();
  await page.keyboard.type("Acme 01");
  const apply = editor.getByRole("button", { name: "Apply filter", exact: true });
  await apply.focus();
  await apply.press("Enter");
  await expect(result).toHaveText("1 result");
  await expect(root.getByRole("button", { name: "Account contains Acme 01", exact: true })).toBeVisible();
});

test("virtualized and hidden structure exposes full row and column context", async ({ page }) => {
  await page.goto("/data-table");
  await ready(page);
  const continuousSection = page.getByRole("region", { name: "Continuous client example", exact: true });
  const continuous = continuousSection.getByRole("table", { name: "Continuous client rows", exact: true });
  await expect(continuous).toHaveAttribute("aria-rowcount", "301");
  await expect(continuous).toHaveAttribute("aria-colcount", "2");
  await expect(continuous.locator("thead tr")).toHaveAttribute("aria-rowindex", "1");
  const first = continuous.locator('[data-row-id="client-0"]');
  await expect(first).toHaveAttribute("aria-rowindex", "2");
  await expect(first.locator("td").nth(0)).toHaveAttribute("aria-colindex", "1");
  await expect(first.locator("td").nth(1)).toHaveAttribute("aria-colindex", "2");
  await first.focus();
  await first.press("End");
  const last = continuous.locator('[data-row-id="client-299"]');
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-rowindex", "301");

  const columnSection = page.getByRole("region", { name: "Column interaction example", exact: true });
  const columns = columnSection.getByRole("table", { name: "Interactive columns", exact: true });
  await expect(columns).toHaveAttribute("aria-colcount", "3");
  await hideColumnWithKeyboard(page, columnSection, "Amount");
  await expect(columns.locator('th[data-column="amount"]')).toHaveCount(0);
  await expect(columns).toHaveAttribute("aria-colcount", "3");
  await expect(columns.locator('th[data-column="name"]')).toHaveAttribute("aria-colindex", "1");
  await expect(columns.locator('th[data-column="identifier"]')).toHaveAttribute("aria-colindex", "3");
  await expect(columns.locator('[data-row-id="client-0"] td[data-column="identifier"]')).toHaveAttribute("aria-colindex", "3");

  const selectionSection = page.getByRole("region", { name: "Paginated client example", exact: true });
  const selectionTable = selectionSection.getByRole("table", { name: "Paginated client rows", exact: true });
  const selectedRow = selectionTable.locator('[data-row-id="client-20"]');
  await expect(selectionTable).toHaveAttribute("aria-colcount", "3");
  await expect(selectedRow).toHaveAttribute("aria-rowindex", "22");
  await expect(selectedRow).toHaveAttribute("aria-selected", "false");
  await selectedRow.focus();
  await selectedRow.press("Space");
  await expect(selectedRow).toHaveAttribute("aria-selected", "true");
  await expect(selectionSection.getByRole("checkbox", { name: "Select row client-20", exact: true })).toBeChecked();
});

test("invalid editing state is described and keyboard focus recovers", async ({ page }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state", exact: true })).toHaveText("Ready");
  const cell = page.getByRole("region", { name: "Editable DataTable", exact: true }).locator('td[data-column="title"]');
  const resting = cell.locator('span[tabindex="0"]');
  await resting.focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  await expect(editor).toBeFocused();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(" ");
  await editor.press("Enter");
  await expect(editor).toHaveAttribute("aria-invalid", "true");
  const description = await editor.getAttribute("aria-describedby");
  if (!description) throw new Error("Expected the invalid editor to reference its error");
  await expect(page.locator(`[id="${description}"]`)).toHaveRole("alert");
  await expect(page.locator(`[id="${description}"]`)).toHaveText("Title is required");
  await expect(editor).toBeFocused();
  await editor.press("Escape");
  await expect(cell.locator('span[tabindex="0"]')).toBeFocused();
  await expect(cell.locator('span[tabindex="0"]')).toHaveText("Initial title");
});

test("server refresh and pagination retain accepted announcements and focus", async ({ page }) => {
  await page.goto("/data-table");
  await ready(page);
  const section = page.getByRole("region", { name: "Paginated server example", exact: true });
  const root = section.locator(".sheen-data-table");
  const table = section.getByRole("table", { name: "Paginated server rows", exact: true });
  const result = root.locator(".sheen-data-table-result-count");
  const search = root.getByRole("searchbox", { name: "Search Paginated server rows", exact: true });
  await search.focus();
  await search.evaluate(element => element.setAttribute("data-refresh-focus", "retained"));
  await page.keyboard.type("Server");
  await expect(root).toHaveAttribute("aria-busy", "true");
  await expect(result).toContainText("55 results");
  await expect(result).toContainText("Previous results");
  await expect(table.locator('[data-row-id="server-0"]')).toHaveAttribute("aria-rowindex", "2");
  await expect(search).toBeFocused();
  await expect(root).not.toHaveAttribute("aria-busy", "true");
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("data-refresh-focus", "retained");

  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await expect(root).toHaveAttribute("aria-busy", "true");
  await expect(root).not.toHaveAttribute("aria-busy", "true");
  const pagination = root.getByRole("navigation", { name: "Pagination", exact: true });
  const status = pagination.getByRole("status");
  const next = pagination.getByRole("button", { name: "Next page", exact: true });
  await expect(status).toHaveText("Page 1 of 6");
  await next.focus();
  await next.press("Enter");
  await expect(pagination).toHaveAttribute("aria-busy", "true");
  await expect(pagination).toHaveAttribute("aria-disabled", "true");
  await expect(status).toHaveText("Page 1 of 6");
  await expect(table.locator('[data-row-id="server-0"]')).toBeVisible();
  await expect(next).toBeFocused();
  await expect(status).toHaveText("Page 2 of 6");
  await expect(table.locator('[data-row-id="server-10"]')).toHaveAttribute("aria-rowindex", "12");
  await expect(table).toHaveAttribute("aria-rowcount", "56");
  await expect(next).toBeFocused();
});
