import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

function searchField(scope: Locator, name: string): Locator {
  return scope.getByRole("searchbox", { name, exact: true });
}

async function saveCurrentView(page: Page): Promise<void> {
  await page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]").click();
  await page.getByRole("menuitem", { name: "Save current view", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Save current view", exact: true });
  await dialog.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]")).toHaveText("Operations view");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
}

test("integrated client search debounces one accepted state and round-trips through saved views", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table");
  const search = searchField(root, "Search Accounts");
  const retained = page.locator('[data-row-id="account-1"]');
  await retained.evaluate(element => element.setAttribute("data-retained-search", "true"));
  await page.getByRole("checkbox", { name: "Select row account-1", exact: true }).press("Space");
  await expect(page.getByRole("status", { name: "Selection snapshot" })).toHaveText("1 IDs");

  const pending = await search.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected the account search input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Expected the native input value setter");
    setter.call(element, "Acme 01");
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "Acme 01" }));
    const root = element.closest(".sheen-data-table");
    return Object.freeze({ pending: root?.hasAttribute("data-pending") ?? false, previous: root?.hasAttribute("data-previous-results") ?? false });
  });
  expect(pending).toEqual({ pending: true, previous: true });
  await expect(retained).toHaveAttribute("data-retained-search", "true");
  await expect(page.locator('[data-row-id="account-1"]')).toBeVisible();
  await expect(page.locator("[data-row-id]")).toHaveCount(1);
  await expect(root).not.toHaveAttribute("data-pending");
  await expect(root).not.toHaveAttribute("data-previous-results");
  await expect(page.getByRole("status", { name: "Selection snapshot" })).toHaveText("0 IDs");
  await expect(root.getByRole("button", { name: "Select all matching", exact: true })).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await root.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: "Export CSV", exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("Expected a completed client export");
  const exported = await readFile(path, "utf8");
  expect(exported).toContain("Acme 01");
  expect(exported).not.toContain("Beacon 02");

  await saveCurrentView(page);
  await root.locator(".sheen-data-table-search-field").getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator('[data-row-id="account-1"]')).toBeVisible();
  await page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]").click();
  await page.getByRole("menuitem", { name: "Restore view", exact: true }).click();
  await expect(searchField(page.locator(".sheen-data-table"), "Search Accounts")).toHaveValue("Acme 01");
  await expect(page.locator('[data-row-id="account-1"]')).toBeVisible();
});

test("search shortcut focuses the integrated field without replacing accepted rows", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table");
  const search = searchField(root, "Search Accounts");
  const row = page.locator('[data-row-id="account-1"]');
  await row.evaluate(element => element.setAttribute("data-shortcut-row", "true"));
  await page.keyboard.press("Control+f");
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("data-sheen-shortcut", "Ctrl+F");
  await expect(row).toHaveAttribute("data-shortcut-row", "true");
});

test("exact search is discoverable by mode control and apostrophe shortcut", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table");
  const search = searchField(root, "Search Accounts");
  const mode = root.getByRole("button", { name: "Search match mode: Smart", exact: true });
  await expect(mode).toBeVisible();
  await search.fill("'Acme 01");
  await expect(root.getByRole("button", { name: "Search match mode: Exact", exact: true })).toBeVisible();
  await expect(root.locator('[data-row-id="account-1"]')).toBeVisible();
  await expect(root.locator("[data-row-id]")).toHaveCount(1);

  await root.getByRole("button", { name: "Search match mode: Exact", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Smart", exact: true }).click();
  await expect(search).toHaveValue("Acme 01");
  await search.fill("Acme");
  await expect(root.locator(".sheen-data-table-result-count")).toContainText("40 results");
});

test("IME drafts do not schedule ranked search until composition commits", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}`);
  await ready(page);
  const root = page.locator(".sheen-data-table");
  const search = searchField(root, "Search Accounts");
  await search.dispatchEvent("compositionstart", { data: "" });
  await search.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected search input");
    element.value = "Beacon 02";
    element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, data: "Beacon 02", inputType: "insertCompositionText", isComposing: true }));
  });
  await page.waitForTimeout(180);
  await expect(root).not.toHaveAttribute("aria-busy");
  await expect(page.locator('[data-row-id="account-1"]')).toBeVisible();
  await search.dispatchEvent("compositionend", { data: "Beacon 02" });
  await expect(root).toHaveAttribute("data-pending", "");
  await expect(page.locator('[data-row-id="account-2"]')).toBeVisible();
  await expect(page.locator("[data-row-id]")).toHaveCount(1);
});

test("server search aborts stale work, retains accepted rows, and separates failure from busy state", async ({ page }) => {
  await page.goto("/data-table");
  const section = page.getByRole("region", { name: "Paginated server example", exact: true });
  const root = section.locator(".sheen-data-table");
  const search = searchField(root, "Search Paginated server rows");
  const retained = root.locator('[data-row-id="server-0"]');
  await retained.evaluate(element => element.setAttribute("data-server-search-row", "true"));

  await search.fill("Server row 4");
  await expect(root).toHaveAttribute("data-pending", "");
  await expect(retained).toHaveAttribute("data-server-search-row", "true");
  await search.fill("Server row 2");
  await expect(root.locator('[data-row-id="server-2"]')).toBeVisible();
  await expect(root.locator('[data-row-id="server-4"]')).toHaveCount(0);
  await expect(root).not.toHaveAttribute("data-pending");

  await section.getByRole("button", { name: "Fail next server request", exact: true }).click();
  await search.fill("Server row 5");
  const error = root.getByRole("alert");
  await expect(error).toContainText("DataTable request failed (503)");
  await expect(search).toHaveValue("Server row 5");
  await expect(root).toHaveAttribute("data-previous-results", "");
  await expect(root).not.toHaveAttribute("aria-busy");
  const pagination = root.getByRole("navigation", { name: "Pagination", exact: true });
  await expect(pagination).toHaveAttribute("aria-disabled", "true");
  await expect(pagination).not.toHaveAttribute("aria-busy");
  await error.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(root.locator('[data-row-id="server-5"]')).toBeVisible();
  await expect(root).not.toHaveAttribute("data-previous-results");
});

test("delayed hydration adopts a native search draft and retains its server input", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto(`/data-table-page?session=${randomUUID()}`, { waitUntil: "commit" });
    const root = page.locator(".sheen-data-table");
    const search = searchField(root, "Search Accounts");
    const row = page.locator('[data-row-id="account-3"]');
    await search.fill("Acme 03");
    await search.evaluate(element => element.setAttribute("data-server-search", "true"));
    await row.evaluate(element => element.setAttribute("data-server-row", "true"));
    release();
    await ready(page);
    await expect(search).toHaveValue("Acme 03");
    await expect(search).toHaveAttribute("data-server-search", "true");
    await expect(search).toBeFocused();
    await expect(row).toHaveAttribute("data-server-row", "true");
    await expect(row).toBeVisible();
    await expect(page.locator("[data-row-id]")).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
