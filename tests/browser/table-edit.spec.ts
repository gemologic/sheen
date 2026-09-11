import { expect, test } from "@playwright/test";

test("resting markup hydrates in place and invalid drafts stay editable", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith("/api/table-edit")) requests.push(request.url()); });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table-edit", { waitUntil: "commit" });
    const cell = page.getByRole("region", { name: "Editable DataTable" }).locator('td[data-column="title"]');
    const resting = cell.locator("span[tabindex='0']");
    await expect(resting).toHaveText("Initial title");
    await resting.evaluate(element => element.setAttribute("data-server", "retained"));
    await resting.click();
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
    await expect(editor).toBeFocused();
    await editor.fill(" ");
    await editor.press("Enter");
    await expect(editor).toHaveAttribute("aria-invalid", "true");
    await expect(cell).toHaveAttribute("data-invalid", "");
    await expect(editor).toHaveValue(" ");
    await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("0");
    expect(requests).toEqual([]);
    await editor.press("Escape");
    await expect(cell.locator("span[tabindex='0']")).toHaveText("Initial title");
    await expect(cell.locator("span[tabindex='0']")).toBeFocused();
  } finally { release(); }
});

test("transport failure restores committed state, retains the draft, and retries from a toast", async ({ page }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const cell = page.getByRole("region", { name: "Editable DataTable" }).locator('td[data-column="title"]');
  await cell.locator("span[tabindex='0']").focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  await editor.fill("transport failure");
  await editor.press("Enter");
  await expect(cell).toHaveAttribute("data-pending", "");
  const toast = page.getByRole("group", { name: "Cell update failed", exact: true });
  await expect(toast).toBeVisible();
  await expect(cell).toHaveAttribute("data-invalid", "");
  await expect(editor).toHaveValue("transport failure");
  await expect(page.getByRole("status", { name: "Committed title" })).toHaveText("Initial title");
  await toast.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(cell.locator("span[tabindex='0']")).toHaveText("transport failure");
  await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("2");
  await expect(toast).toHaveCount(0);
  await expect(cell).not.toHaveAttribute("data-invalid", "");
});

test("refetch keeps an uncontrolled draft and marks it stale until discard", async ({ page }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const cell = page.getByRole("region", { name: "Editable DataTable" }).locator('td[data-column="title"]');
  await cell.locator("span[tabindex='0']").focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  await editor.fill("Local draft");
  await page.getByRole("button", { name: "Refetch server value", exact: true }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected refetch button");
    element.click();
  });
  await expect(editor).toHaveValue("Local draft");
  await expect(editor).toBeFocused();
  await expect(cell).toHaveAttribute("data-stale", "");
  await expect(page.getByRole("status", { name: "Committed title" })).toHaveText("Server refresh");
  await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("0");
  await editor.press("Escape");
  await expect(cell.locator("span[tabindex='0']")).toHaveText("Server refresh");
  await expect(cell).not.toHaveAttribute("data-stale", "");
});

test("an explicit version conflict stays visible through a newer draft", async ({ page, browserName }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const region = page.getByRole("region", { name: "Editable DataTable" });
  const cell = region.locator('td[data-column="title"]');
  await cell.locator("span[tabindex='0']").focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  await editor.fill("version conflict");
  await editor.press("Enter");
  const conflict = cell.getByRole("alert");
  await expect(conflict).toContainText("Server version");
  await expect(cell).toHaveAttribute("data-stale", "");
  await expect(editor).toHaveValue("version conflict");
  if (browserName === "chromium") await expect(region).toHaveScreenshot("data-table-edit-conflict-dark.png", { animations: "disabled" });
  await editor.fill("Revised title");
  await expect(conflict).toBeVisible();
  await editor.press("Enter");
  await expect(cell.locator("span[tabindex='0']")).toHaveText("Revised title");
  await expect(conflict).toHaveCount(0);
  await expect(cell).not.toHaveAttribute("data-stale", "");
  await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("2");
});

test("a newer commit wins when the transport ignores abort", async ({ page }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const cell = page.getByRole("region", { name: "Editable DataTable" }).locator('td[data-column="title"]');
  await cell.locator("span[tabindex='0']").focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  await editor.fill("slow");
  await editor.press("Enter");
  await expect(cell).toHaveAttribute("data-pending", "");
  await editor.fill("Newer title");
  await editor.press("Enter");
  await expect(cell.locator("span[tabindex='0']")).toHaveText("Newer title");
  await page.waitForTimeout(900);
  await expect(cell.locator("span[tabindex='0']")).toHaveText("Newer title");
  await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("2");
});

test("Tab traverses native number, select, and boolean editors while blur commits each cell", async ({ page }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const region = page.getByRole("region", { name: "Editable DataTable" });
  await region.locator('td[data-column="amount"] span[tabindex="0"]').focus();
  const amount = page.getByRole("spinbutton", { name: "Edit Amount for row row-1", exact: true });
  await amount.fill("44");
  await amount.press("Tab");
  const status = page.getByRole("combobox", { name: "Edit Status for row row-1", exact: true });
  await expect(status).toBeFocused();
  await status.selectOption("closed");
  await status.press("Tab");
  const enabled = page.getByRole("checkbox", { name: "Edit Enabled for row row-1", exact: true });
  await expect(enabled).toBeFocused();
  await expect(enabled).toBeChecked();
  await enabled.press("Space");
  await enabled.press("Enter");
  await expect(region.locator('td[data-column="amount"] span[tabindex="0"]')).toHaveText("44");
  await expect(region.locator('td[data-column="status"] span[tabindex="0"]')).toHaveText("closed");
  await expect(region.locator('td[data-column="enabled"] span[tabindex="0"]')).toHaveText("No");
  await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("3");
});

test("changing the edit boundary discards a local draft without transport", async ({ page }) => {
  await page.goto("/table-edit");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const cell = page.getByRole("region", { name: "Editable DataTable" }).locator('td[data-column="title"]');
  await cell.locator("span[tabindex='0']").focus();
  const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
  await editor.fill("Private draft");
  await page.getByRole("button", { name: "Change edit boundary", exact: true }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected reset button");
    element.click();
  });
  await expect(cell.locator("span[tabindex='0']")).toHaveText("Initial title");
  await expect(page.getByRole("status", { name: "Commit requests" })).toHaveText("0");
});
