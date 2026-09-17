import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("appearance previews retain the current history entry and scrolled content", async ({ page }) => {
  await page.goto("/admin/audit?configure=1");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await page.getByText("Customize starter", { exact: true }).click();
  const pane = page.locator(".loupe-admin-content");
  const identity = await pane.elementHandle();
  const accounts = page.getByRole("link", { name: "Accounts 240", exact: true });
  await accounts.evaluate(element => element.setAttribute("data-retained-navigation", "true"));
  const createPolicy = page.getByRole("link", { name: "Create policy", exact: true });
  const createIcon = await createPolicy.locator('svg[data-sheen-icon-default="true"]').elementHandle();
  const refreshIcon = await page.getByRole("button", { name: "Refresh", exact: true }).locator('svg[data-sheen-icon-default="true"]').elementHandle();
  const history = await page.evaluate(() => ({ length: window.history.length, state: window.history.state }));
  await page.getByRole("button", { name: "Theme Studio", exact: true }).click();
  await pane.evaluate(element => { element.scrollTop = 280; });
  await expect(pane).toHaveJSProperty("scrollTop", 280);
  await page.getByRole("option", { name: "Graphite", exact: true }).click();
  await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-theme", "graphite");
  await expect(page).toHaveURL(/theme=graphite/u);
  expect(await page.evaluate(() => ({ length: window.history.length, state: window.history.state }))).toEqual(history);
  expect(await pane.evaluate((element, retained) => element === retained, identity)).toBe(true);
  await expect(pane).toHaveJSProperty("scrollTop", 280);
  await expect(accounts).toHaveAttribute("data-retained-navigation", "true");
  await expect(accounts).toHaveAttribute("href", /theme=graphite/u);
  await expect(createPolicy).toHaveAttribute("href", /theme=graphite.*#create-policy/u);
  expect(await createPolicy.locator('svg[data-sheen-icon-default="true"]').evaluate((element, retained) => element === retained, createIcon)).toBe(true);
  expect(await page.getByRole("button", { name: "Refresh", exact: true }).locator('svg[data-sheen-icon-default="true"]').evaluate((element, retained) => element === retained, refreshIcon)).toBe(true);
  await accounts.click();
  await expect(page).toHaveURL(/\/admin\/accounts\?.*theme=graphite/u);
  await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-theme", "graphite");
});

test("settings save and discard real values while failed refresh retains the editor", async ({ page }) => {
  await page.goto("/admin/settings?refresh=fail-first");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const name = page.getByRole("textbox", { name: "Organization name" });
  const layout = page.getByRole("group", { name: "Workspace settings", exact: true });
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  await expect(save).toBeDisabled();
  await name.fill("Northstar Europe");
  const identity = await name.elementHandle();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await name.focus();
  await name.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected input");
    element.setSelectionRange(3, 9);
  });
  const frames = await name.evaluate(async element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected input");
    const samples = [];
    for (let index = 0; index < 12; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push({ connected: element.isConnected, value: element.value, focused: document.activeElement === element, start: element.selectionStart, end: element.selectionEnd });
    }
    return samples;
  });
  expect(frames).toEqual(Array.from({ length: 12 }, () => ({ connected: true, value: "Northstar Europe", focused: true, start: 3, end: 9 })));
  await expect(page.locator('.loupe-admin-refresh-error[role="alert"]')).toContainText("Could not refresh workspace data");
  await expect(page.locator(".sheen-toast-title")).toHaveCount(0);
  await expect(name).toHaveValue("Northstar Europe");
  await page.getByRole("button", { name: "Retry refresh" }).click();
  await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
  await page.locator(".sheen-toast").getByRole("button", { name: "Close", exact: true }).click();
  expect(await name.evaluate((element, before) => element === before, identity)).toBe(true);
  await expect(layout).toHaveAttribute("data-dirty", "true");
  await save.click();
  await expect(layout).toHaveAttribute("data-dirty", "false");
  await page.getByRole("group", { name: "Settings saved", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await name.fill("Discard this draft");
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(name).toHaveValue("Northstar Europe");
  await name.fill(" ");
  await save.click();
  await expect(layout).toContainText("Enter an organization name.");
  await expect(layout).toHaveAttribute("data-dirty", "true");
});

test("appearance reset restores defaults and keeps a settings draft", async ({ page }) => {
  await page.goto("/admin/settings?configure=1&theme=paper&mode=light&accent=rose&chrome=tonal");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const input = page.getByRole("textbox", { name: "Organization name" });
  await input.fill("Keep this draft");
  const identity = await input.elementHandle();
  const trigger = page.getByRole("button", { name: "Reset appearance", exact: true });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", { name: "Reset starter appearance?" });
  await dialog.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-theme", "studio");
  await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-accent", "indigo");
  await expect(input).toHaveValue("Keep this draft");
  expect(await input.evaluate((element, before) => element === before, identity)).toBe(true);
  await expect(trigger).toBeFocused();
  await page.getByRole("link", { name: "Access policies", exact: true }).click();
  const leave = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await expect(leave).toBeVisible();
  await leave.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(input).toHaveValue("Keep this draft");
  await expect(page).toHaveURL(/\/admin\/settings/u);
});

test("audit groups retain sticky headings and export all recorded events", async ({ page }) => {
  await page.goto("/admin/audit");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".loupe-admin-audit-day > h3")).toHaveText(["Today", "Yesterday", "2 days ago", "3 days ago"]);
  await expect(page.locator(".loupe-admin-audit-day > h3").first()).toHaveCSS("position", "sticky");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export log", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("northstar-audit.json");
  const path = await download.path();
  if (!path) throw new Error("Missing audit download");
  const exported: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(exported)) throw new Error("Expected event array");
  expect(exported).toHaveLength(80);
  expect(exported[0]).toMatchObject({ id: "audit-1", day: "Today" });
  expect(exported[79]).toMatchObject({ id: "audit-80", day: "3 days ago" });
});

test("overflow help supports keyboard opening, scoped styling and focus restoration", async ({ page }) => {
  await page.goto("/admin/policies");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const trigger = page.getByRole("button", { name: "More", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const panel = page.locator(".sheen-admin-action-popover");
  await expect(panel.getByRole("link", { name: "Docs", exact: true })).toBeVisible();
  expect(await panel.evaluate(element => element.closest('[data-sheen-portal="scope"]')?.getAttribute("data-sheen-theme"))).toBe("studio");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
