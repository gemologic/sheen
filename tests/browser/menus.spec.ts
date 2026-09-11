import { expect, test } from "@playwright/test";

for (const triggerName of ["Workspace actions", "Changing scope actions"]) {
  test(`${triggerName} retains open portal content through a theme update`, async ({ page }) => {
    await page.goto("/menus");
    await page.getByRole("button", { name: "Change theme after request", exact: true }).click();
    await page.getByRole("button", { name: triggerName, exact: true }).click();
    const save = page.getByRole("menuitem", { name: "Save", exact: true });
    await save.focus();
    await save.evaluate(element => element.setAttribute("data-retained", "yes"));
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-mode", "light");
    await expect(save).toBeFocused();
    await expect(save).toHaveAttribute("data-retained", "yes");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status", { name: "Saved count", exact: true })).toHaveText("1");
  });
}

test("nested menu mutation recovers within its own layer and preserves subsequent keyboard navigation", async ({ page }) => {
  await page.goto("/menus");
  await page.getByRole("button", { name: "Remove export after request", exact: true }).click();
  await page.getByRole("button", { name: "Workspace actions", exact: true }).click();
  const more = page.getByRole("menuitem", { name: "More", exact: true });
  await more.focus();
  await page.keyboard.press("ArrowRight");
  const exported = page.getByRole("menuitem", { name: "Export", exact: true });
  await exported.focus();
  await expect(exported).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Advanced", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitem", { name: "Inspect", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Saved count", exact: true })).toHaveText("100");
});

for (const activation of ["click", "ArrowDown", "Enter"]) {
  test(`menu replays pre-hydration ${activation} without replacing its trigger`, async ({ page }) => {
    let release: () => void = () => {};
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
    try {
      await page.goto("/menus", { waitUntil: "commit" });
      const trigger = page.getByRole("button", { name: "Workspace actions" });
      await trigger.evaluate(element => element.setAttribute("data-server-trigger", "retained"));
      if (activation === "click") await trigger.click();
      else await trigger.press(activation);
      release();
      await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toBeFocused();
      await expect(trigger).toHaveAttribute("data-server-trigger", "retained");
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Saved count")).toHaveText("1");
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}

test("menu keyboard navigation, checked values, and action ownership", async ({ page }) => {
  await page.goto("/menus");
  const trigger = page.getByRole("button", { name: "Workspace actions" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const checkbox = page.getByRole("menuitemcheckbox", { name: "Show archived" });
  await expect(checkbox).toBeFocused();
  await page.keyboard.press("Space");
  await expect(checkbox).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Archive state")).toHaveText("true");
  await page.getByRole("menuitemradio", { name: "Date", exact: true }).click();
  await expect(page.getByRole("menuitemradio", { name: "Date", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Sort state")).toHaveText("date");
  await page.keyboard.press("Home");
  await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByLabel("Saved count")).toHaveText("1");
  await expect(trigger).toBeFocused();
  await trigger.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "More", exact: true })).toBeFocused();
  await page.keyboard.press("s");
  await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Refresh items", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh items", exact: true })).toBeFocused();
});

test("menu item icons stay decorative and root content can match its trigger width", async ({ page }) => {
  await page.goto("/menus");
  const trigger = page.getByRole("button", { name: "Workspace actions", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu");
  const triggerBox = await trigger.boundingBox();
  const menuBox = await menu.boundingBox();
  if (!triggerBox || !menuBox) throw new Error("Expected trigger and menu geometry");
  expect(Math.abs(menuBox.width - triggerBox.width)).toBeLessThanOrEqual(1);
  await expect(menu.locator('.sheen-menu-item-icon [data-menu-icon="save"]')).toBeVisible();
  await expect(menu.locator('.sheen-menu-item-icon [data-menu-icon="archive"]')).toBeVisible();
  await expect(menu.locator('.sheen-menu-item-icon [data-menu-icon="name"]')).toBeVisible();
  await expect(menu.locator('.sheen-menu-item-icon [data-menu-icon="more"]')).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toHaveAccessibleName("Save");
});

test("nested menus unwind one layer and preserve the scoped dialog", async ({ page }) => {
  await page.goto("/menus");
  await page.getByRole("button", { name: "Open scoped settings" }).click();
  await page.getByRole("button", { name: "Scoped actions" }).click();
  const more = page.getByRole("menuitem", { name: "More", exact: true });
  await more.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("menuitem", { name: "Export", exact: true })).toBeFocused();
  const advanced = page.getByRole("menuitem", { name: "Advanced", exact: true });
  await page.keyboard.press("ArrowDown");
  await expect(advanced).toBeFocused();
  // Flush the primitive's deferred autofocus after navigation has already advanced.
  await page.evaluate(() => new Promise<void>(resolve => window.setTimeout(resolve, 0)));
  await expect(advanced).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("menuitem", { name: "Inspect", exact: true })).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(3);
  for (const menu of await page.getByRole("menu").all()) {
    await expect(menu).toHaveCSS("direction", "rtl");
    expect(await menu.evaluate(element => element.closest("[data-sheen-theme]")?.getAttribute("data-sheen-theme"))).toBe("paper");
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(2);
  await expect(advanced).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(1);
  await expect(more).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Scoped settings" })).toBeVisible();
});

test("menu refresh retains focused nodes and controlled opening may be rejected", async ({ page }) => {
  await page.goto("/menus");
  await page.getByRole("button", { name: "Schedule refresh" }).click();
  await page.getByRole("button", { name: "Workspace actions" }).press("ArrowDown");
  const item = page.getByRole("menuitem", { name: "Save", exact: true });
  const node = await item.elementHandle();
  await expect(page.getByRole("menuitem", { name: "Save revised", exact: true })).toBeFocused();
  expect(await node?.evaluate(element => element.isConnected && element === element.ownerDocument.activeElement)).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Rejected menu" }).click();
  await expect(page.getByLabel("Open requests")).toHaveText("1");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Disabled menu" })).toBeDisabled();
});
