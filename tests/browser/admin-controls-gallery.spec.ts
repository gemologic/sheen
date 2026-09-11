import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("account and workspace gallery controls execute app-owned HTTP adapters", async ({ page }) => {
  await page.goto("/gallery/admin-controls");
  const account = page.locator(".loupe-admin-controls-grid > .sheen-card").nth(0);
  await account.getByRole("button", { name: "Account: Ada Lovelace", exact: true }).click();
  const accountResponse = page.waitForResponse(response => response.url().endsWith("/api/admin-controls") && response.request().method() === "POST");
  await page.getByRole("menuitem", { name: "Open profile", exact: true }).click();
  expect((await accountResponse).ok()).toBe(true);
  await expect(page.getByLabel("Control operation")).toHaveText("accepted");

  const workspace = page.locator(".loupe-admin-control-sidebar");
  await workspace.locator("[data-sheen-menu-trigger]").click();
  const workspaceResponse = page.waitForResponse(response => response.url().endsWith("/api/admin-controls") && response.request().method() === "POST");
  await page.getByRole("menuitemradio", { name: /Forge\s+Development/u }).click();
  expect((await workspaceResponse).ok()).toBe(true);
  await expect(workspace.locator("[data-sheen-menu-trigger]")).toContainText("Forge");
});

test("notification gallery exposes per-item unread text, native destinations, and app-owned read updates", async ({ page }) => {
  await page.goto("/gallery/admin-controls");
  const card = page.locator(".loupe-admin-controls-grid > .sheen-card").nth(2);
  const trigger = card.locator("[data-sheen-popover-trigger]");
  await expect(trigger).toContainText("2");
  await trigger.click();
  const panel = page.locator(".sheen-admin-notification-popover:visible");
  await expect(panel.locator('[data-notification-id="deploy"]')).toContainText("Unread");
  await expect(panel.locator('[data-notification-id="review"]')).toContainText("Unread");
  const notificationResponse = page.waitForResponse(response => response.url().endsWith("/api/admin-controls") && response.request().method() === "POST");
  await panel.locator('[data-notification-id="review"] button').click();
  expect((await notificationResponse).ok()).toBe(true);
  await expect(page.getByLabel("Control operation")).toHaveText("accepted");
  await trigger.click();
  await expect(panel.locator('[data-notification-id="review"]')).not.toContainText("Unread");
  const allResponse = page.waitForResponse(response => response.url().endsWith("/api/admin-controls") && response.request().method() === "POST");
  await panel.getByRole("button", { name: "Mark all read", exact: true }).click();
  expect((await allResponse).ok()).toBe(true);
  await expect(trigger.locator(".sheen-badge")).toHaveCount(0);
  await panel.locator('[data-notification-id="deploy"] a').click();
  await expect(page).toHaveURL(/#deployment$/);
});

test("accepted control refresh retains open notification, item, trigger, and focus identities", async ({ page }) => {
  await page.goto("/gallery/admin-controls");
  const account = page.locator(".loupe-admin-controls-grid > .sheen-card").nth(0).locator("[data-sheen-menu-trigger]");
  const workspace = page.locator(".loupe-admin-control-sidebar [data-sheen-menu-trigger]");
  const notifications = page.locator(".loupe-admin-controls-grid > .sheen-card").nth(2);
  const trigger = notifications.getByRole("button", { name: /Notifications 2/u });
  await trigger.click();
  const item = page.locator('.sheen-admin-notification-popover:visible [data-notification-id="deploy"]');
  const link = item.getByRole("link");
  await account.evaluate(element => element.setAttribute("data-account-owner", "retained"));
  await workspace.evaluate(element => element.setAttribute("data-workspace-owner", "retained"));
  await trigger.evaluate(element => element.setAttribute("data-notification-trigger-owner", "retained"));
  await item.evaluate(element => element.setAttribute("data-notification-owner", "retained"));
  await link.focus();
  await page.getByRole("button", { name: "Refresh controls", exact: true }).evaluate(element => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(page.getByLabel("Control operation")).toHaveText("pending");
  for (let frame = 0; frame < 12; frame += 1) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    await expect(item).toContainText("Deploy finished");
    await expect(item).toHaveAttribute("data-notification-owner", "retained");
  }
  await expect(item).toContainText("Deploy evidence verified");
  await expect(item).toHaveAttribute("data-notification-owner", "retained");
  await expect(link).toBeFocused();
  await expect(account).toHaveAttribute("data-account-owner", "retained");
  await expect(account).toContainText("ada+verified@gemologic.dev");
  await expect(workspace).toHaveAttribute("data-workspace-owner", "retained");
  await expect(trigger).toHaveAttribute("data-notification-trigger-owner", "retained");
});

test("admin-control gallery is accessible with scoped RTL footer overlays", async ({ page }) => {
  await page.goto("/gallery/admin-controls");
  const scope = page.locator(".loupe-admin-controls-scope");
  const account = scope.getByRole("button", { name: "Account: Ada Lovelace", exact: true });
  await account.click();
  const menu = page.getByRole("menu", { name: "Account: Ada Lovelace", exact: true });
  await expect(menu).toBeVisible();
  expect(await menu.evaluate(element => element.closest('[data-sheen-portal="scope"]') !== null)).toBe(true);
  await page.keyboard.press("Escape");
  const notification = scope.getByRole("button", { name: /Notifications 2/u });
  await notification.click();
  const popover = page.locator(".sheen-admin-notification-popover:visible");
  expect(await popover.evaluate(element => element.closest('[data-sheen-portal="scope"]') !== null)).toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("admin-control server identities and focused trigger survive delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/gallery/admin-controls", { waitUntil: "commit" });
    const trigger = page.locator(".loupe-admin-control-sidebar [data-sheen-menu-trigger]");
    await trigger.evaluate(element => element.setAttribute("data-admin-control-hydration", "retained"));
    await trigger.focus();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(trigger).toHaveAttribute("data-admin-control-hydration", "retained");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  } finally { release(); }
});
