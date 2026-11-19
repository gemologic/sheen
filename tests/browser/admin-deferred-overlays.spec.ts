import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-admin-app")).toBeVisible();
}

/** Hold one deferred overlay module until the test releases it, so the first open is queued against a missing chunk. */
async function gateModule(page: Page, pattern: RegExp): Promise<{ readonly requested: Promise<unknown>; readonly release: () => void }> {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route(pattern, async route => { await barrier; await route.continue(); });
  return { requested: page.waitForRequest(pattern), release };
}

test("the first Ctrl+K opens the deferred command palette and returns focus to its trigger", async ({ page }) => {
  const palette = await gateModule(page, /\/admin-command-palette\.ts(?:\?|$)/u);
  await page.goto("/admin");
  await ready(page);
  const trigger = page.locator(".sheen-admin-command-trigger");
  await trigger.focus();
  await palette.requested;
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Command palette", exact: true });
  await expect(dialog).toHaveCount(0);
  palette.release();
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Command palette", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
});

test("the first question-mark press opens the deferred shortcut sheet", async ({ page }) => {
  const sheet = await gateModule(page, /\/shell-shortcut-sheet\.ts(?:\?|$)/u);
  await page.goto("/admin");
  await ready(page);
  const trigger = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  await trigger.focus();
  await sheet.requested;
  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  sheet.release();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Open command palette", { exact: true })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("account menu and phone drawer move and restore focus after deferred overlays load", async ({ page }) => {
  const loaded = Promise.all([page.waitForResponse(/\/admin-command-palette\.ts(?:\?|$)/u), page.waitForResponse(/\/shell-shortcut-sheet\.ts(?:\?|$)/u)]);
  await page.goto("/admin");
  await ready(page);
  await loaded;

  const account = page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true });
  await account.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(account).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator(".sheen-sidebar-toggle-mobile");
  await expect(toggle).toBeVisible();
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(drawer).toBeVisible();
  expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await drawer.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(toggle).toBeFocused();
});
