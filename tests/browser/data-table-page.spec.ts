import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

async function openSavedViewAction(page: Page, name: string): Promise<void> {
  await page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]").click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

test("page composes real table query controls, selection actions, views, and status", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  await expect(page.getByRole("heading", { name: "Accounts", exact: true })).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Account page actions" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saved views", exact: true })).toBeVisible();
  await expect(page.getByRole("toolbar")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "+ Filter", exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Accounts", exact: true })).toBeVisible();
  const tableRoot = page.locator(".sheen-data-table");
  await expect(tableRoot).not.toHaveAttribute("data-variant");
  await expect(tableRoot).toHaveCSS("border-top-width", "0px");
  await expect(tableRoot).toHaveCSS("border-radius", "0px");
  expect(await page.locator(".sheen-data-table-page-content").evaluate(content => {
    const table = content.querySelector(".sheen-data-table");
    if (!(table instanceof HTMLElement)) throw new Error("Expected an integrated DataTable");
    return Math.abs(content.getBoundingClientRect().height - table.getBoundingClientRect().height);
  })).toBeLessThanOrEqual(1);
  await page.getByRole("checkbox", { name: "Select row account-1", exact: true }).press("Space");
  const selectionActions = page.getByRole("toolbar", { name: "Selection actions", exact: true });
  await expect(selectionActions).toBeVisible();
  await selectionActions.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("status", { name: "Last table action" })).toHaveText("Archived 1");
  await expect(page.getByRole("status", { name: "Selection snapshot" })).toHaveText("1 IDs");
});

test("page context defaults to integrated chrome while an explicit frame wins", async ({ page }) => {
  const session = randomUUID();
  await page.goto(`/data-table-page?session=${session}&variant=framed`);
  await ready(page);
  const root = page.locator(".sheen-data-table");
  await expect(root).toHaveAttribute("data-variant", "framed");
  await expect(root).toHaveCSS("border-top-width", "1px");
  await expect(root).toHaveCSS("border-radius", "8px");
  await expect(page.locator(".sheen-data-table-viewport")).toHaveCSS("height", "420px");
});

test("page leaves explicit numbered or continuous presentation to DataTable", async ({ page }) => {
  const session = randomUUID();
  await page.goto(`/data-table-page?session=${session}`);
  await ready(page);
  await expect(page.getByRole("navigation", { name: "Pagination", exact: true })).toHaveCount(0);
  await page.goto(`/data-table-page?session=${session}&table=paged`);
  await ready(page);
  const pagination = page.getByRole("navigation", { name: "Pagination", exact: true });
  await expect(pagination).toBeVisible();
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 8");
  await expect(page.getByRole("checkbox", { name: "Select row account-10", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Select row account-11", exact: true })).toHaveCount(0);
  await pagination.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(pagination.getByRole("status")).toHaveText("Page 2 of 8");
  await expect(page.getByRole("checkbox", { name: "Select row account-11", exact: true })).toBeVisible();
});

test("saved views use the real adapter and restore one complete accepted table state", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table-page");
  await root.evaluate(element => element.setAttribute("data-retained-page", "yes"));
  const account = page.getByRole("columnheader", { name: /Account/u });
  const sort = account.getByRole("button", { name: "Account", exact: true });
  await sort.click();
  await expect(account).toHaveAttribute("aria-sort", "ascending");
  await openSavedViewAction(page, "Save current view");
  const saveDialog = page.getByRole("dialog", { name: "Save current view", exact: true });
  await saveDialog.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]")).toHaveText("Operations view");
  await saveDialog.getByRole("button", { name: "Close", exact: true }).click();
  await sort.click();
  await expect(account).toHaveAttribute("aria-sort", "descending");
  await openSavedViewAction(page, "Save current view");
  await saveDialog.getByRole("textbox", { name: "View name", exact: true }).fill("Descending view");
  await saveDialog.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]")).toHaveText("Descending view");
  await saveDialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]").click();
  await page.getByRole("menuitemradio", { name: "Operations view", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: /Account/u })).toHaveAttribute("aria-sort", "ascending");
  await sort.click();
  await expect(account).toHaveAttribute("aria-sort", "descending");
  await page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]").click();
  await page.getByRole("menuitem", { name: "Restore view", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: /Account/u })).toHaveAttribute("aria-sort", "ascending");
  await expect(root).toHaveAttribute("data-retained-page", "yes");

  await openSavedViewAction(page, "Manage saved views");
  const manage = page.getByRole("dialog", { name: "Manage saved views", exact: true });
  await manage.getByRole("textbox", { name: "View name", exact: true }).fill("Month end");
  await manage.getByRole("button", { name: "Rename view", exact: true }).click();
  await expect(page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]")).toHaveText("Month end");
  await manage.getByRole("button", { name: "Delete view", exact: true }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete saved view?", exact: true });
  await expect(confirm).toContainText("Delete Month end? This cannot be undone.");
  await confirm.getByRole("button", { name: "Delete view", exact: true }).click();
  await expect(page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]")).toHaveText("Saved views");
  await expect(root).toHaveAttribute("data-retained-page", "yes");
});

test("saved-view failure retains accepted table content and retries the exact operation", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}&views=fail-once`);
  await ready(page);
  const table = page.locator(".sheen-data-table");
  const row = page.locator('[data-row-id="account-1"]');
  await table.evaluate(element => element.setAttribute("data-view-failure-table", "retained"));
  await row.evaluate(element => element.setAttribute("data-view-failure-row", "retained"));
  await openSavedViewAction(page, "Save current view");
  const dialog = page.getByRole("dialog", { name: "Save current view", exact: true });
  await dialog.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Existing results were retained");
  await expect(table).toHaveAttribute("data-view-failure-table", "retained");
  await expect(row).toHaveAttribute("data-view-failure-row", "retained");
  await dialog.getByRole("button", { name: "Retry view operation", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]")).toHaveText("Operations view");
  await expect(table).toHaveAttribute("data-view-failure-table", "retained");
  await expect(row).toHaveAttribute("data-view-failure-row", "retained");
});

test("compact saved-view switcher retains server identity and focus through delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  const viewRequests: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/table-views") viewRequests.push(request.method()); });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto(`/data-table-page?session=${randomUUID()}`, { waitUntil: "commit" });
    const trigger = page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]");
    const row = page.locator('[data-row-id="account-1"]');
    await expect(trigger).toHaveText("Saved views");
    await trigger.evaluate(element => {
      element.setAttribute("data-server-switcher", "retained");
      element.focus();
    });
    await row.evaluate(element => element.setAttribute("data-server-row", "retained"));
    release();
    await ready(page);
    await expect(trigger).toHaveAttribute("data-server-switcher", "retained");
    await expect(trigger).toBeFocused();
    await expect(row).toHaveAttribute("data-server-row", "retained");
    await trigger.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Save current view", exact: true })).toBeVisible();
    expect(viewRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test("background refresh retains table identity, rows, scroll, and content on every sampled frame", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table-page");
  const table = page.locator(".sheen-data-table");
  const row = page.locator('[data-row-id="account-1"]');
  const viewport = page.locator(".sheen-data-table-viewport");
  await root.evaluate(element => element.setAttribute("data-retained-page", "yes"));
  await table.evaluate(element => element.setAttribute("data-retained-table", "yes"));
  await row.evaluate(element => element.setAttribute("data-retained-row", "yes"));
  await viewport.evaluate(element => { element.scrollTop = 240; });
  await page.getByRole("button", { name: "Refresh accounts", exact: true }).click();
  await expect(root).toHaveAttribute("data-phase", "refresh");
  const samples = await page.evaluate(async () => {
    const frames: string[] = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      frames.push(document.querySelector(".sheen-data-table")?.textContent ?? "");
    }
    return frames;
  });
  expect(samples.every(sample => sample.includes("Acme 01") && sample.includes("Beacon 02"))).toBe(true);
  await expect(page.getByRole("status", { name: "Accepted revision" })).toHaveText("Revision 1");
  await expect(root).toHaveAttribute("data-phase", "idle");
  await expect(root).toHaveAttribute("data-retained-page", "yes");
  await expect(table).toHaveAttribute("data-retained-table", "yes");
  await expect(row).toHaveAttribute("data-retained-row", "yes");
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBe(240);
});

test("cold loading retains server table markup and permission loss removes it immediately", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}&page=cold`);
  const root = page.locator(".sheen-data-table-page");
  const table = page.locator(".sheen-data-table");
  await table.evaluate(element => element.setAttribute("data-server-table", "yes"));
  await ready(page);
  await expect(root).toHaveAttribute("data-phase", "cold");
  await expect(page.locator(".loupe-data-table-page-skeleton")).toBeVisible();
  await expect(root).toHaveAttribute("data-phase", "idle");
  await expect(table).toBeVisible();
  await expect(table).toHaveAttribute("data-server-table", "yes");
  await page.getByRole("button", { name: "Revoke access", exact: true }).click();
  await expect(root).toHaveAttribute("data-state", "permission-denied");
  await expect(page.getByText("Account access was revoked.", { exact: true })).toBeVisible();
  await expect(page.locator(".sheen-data-table")).toHaveCount(0);
});

test("permission-denied server output hydrates in place without exposing table content", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto(`/data-table-page?session=${randomUUID()}&page=permission-denied`, { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const root = page.locator(".sheen-data-table-page");
    await root.evaluate(element => element.setAttribute("data-server-page", "yes"));
    await expect(root).toHaveAttribute("data-state", "permission-denied");
    await expect(page.locator(".sheen-data-table")).toHaveCount(0);
    release();
    await ready(page);
    await expect(root).toHaveAttribute("data-server-page", "yes");
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByRole("table", { name: "Accounts", exact: true })).toBeVisible();
    await expect(root).toHaveAttribute("data-server-page", "yes");
  } finally { release(); }
});

test("data table page has a bounded dark desktop baseline", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  await expect(page.locator(".sheen-data-table-page")).toHaveScreenshot("data-table-page-dark.png", { animations: "disabled" });
});
