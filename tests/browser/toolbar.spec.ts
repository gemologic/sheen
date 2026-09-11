import { expect, test } from "@playwright/test";

test("a toolbar narrower than its overflow label keeps that trigger readable and usable", async ({ page }) => {
  await page.goto("/toolbar");
  await page.getByRole("button", { name: "Toggle tiny toolbar", exact: true }).click();
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  const more = toolbar.getByRole("button", { name: "More actions", exact: true });
  await expect(more).toBeVisible();
  await expect.poll(() => toolbar.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  await more.click();
  await page.getByRole("menuitem", { name: "Save document", exact: true }).click();
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("Saved");
  await page.getByRole("button", { name: "Toggle toolbar direction", exact: true }).click();
  await expect.poll(() => toolbar.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  await more.focus();
  await expect.poll(() => more.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const button = element.getBoundingClientRect();
    return text.left >= button.left && text.right <= button.right && text.top >= button.top && text.bottom <= button.bottom;
  })).toBe(true);
  await more.press("Enter");
  await page.getByRole("menuitem", { name: "Copy selection", exact: true }).click();
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("Copied");
});

test("overflowed measurement groups do not create horizontal scrolling in narrow chrome", async ({ page }) => {
  await page.goto("/toolbar");
  await page.getByRole("button", { name: "Toggle toolbar width", exact: true }).click();
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  await expect(toolbar.getByRole("button", { name: "More actions", exact: true })).toBeVisible();
  await expect.poll(() => toolbar.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
  await page.getByRole("button", { name: "Toggle toolbar direction", exact: true }).click();
  await expect.poll(() => toolbar.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
});

test("toolbar reserves the full keyboard focus ring inside its scrolling boundary", async ({ page }) => {
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  const save = toolbar.getByRole("button", { name: "Save document", exact: true });
  await save.focus();
  await page.keyboard.press("Home");
  const root = await toolbar.boundingBox();
  const control = await save.boundingBox();
  if (!root || !control) throw new Error("Missing toolbar focus geometry");
  const ring = await save.evaluate(element => { const style = getComputedStyle(element); return Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset); });
  expect(control.x - root.x).toBeGreaterThanOrEqual(ring);
  expect(control.y - root.y).toBeGreaterThanOrEqual(ring);
  expect(root.y + root.height - control.y - control.height).toBeGreaterThanOrEqual(ring);
  await expect(toolbar.locator("..")).toHaveScreenshot("toolbar-dark-focus.png");
  await page.getByRole("button", { name: "Toggle toolbar theme", exact: true }).click();
  await page.getByRole("button", { name: "Toggle toolbar direction", exact: true }).click();
  await save.focus();
  await page.keyboard.press("Home");
  await expect(toolbar.locator("..")).toHaveScreenshot("toolbar-light-rtl-focus.png");
});

test("clearing all actions closes overflow and restores focus to the empty toolbar", async ({ page }) => {
  await page.goto("/toolbar");
  await page.getByRole("button", { name: "Toggle toolbar width", exact: true }).click();
  await page.getByRole("button", { name: "Clear actions after request", exact: true }).click();
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  await toolbar.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Copy selection", exact: true }).focus();
  await expect(page.getByRole("menuitem", { name: "Copy selection", exact: true })).toHaveCount(0);
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(toolbar).toBeFocused();
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("None");
  await page.getByRole("button", { name: "Restore actions", exact: true }).click();
  await toolbar.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Save document", exact: true }).click();
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("Saved");
});

test("an outside focus move during a pending clear is not reclaimed by empty overflow cleanup", async ({ page }) => {
  await page.goto("/toolbar");
  await page.getByRole("button", { name: "Toggle toolbar width", exact: true }).click();
  await page.getByRole("button", { name: "Clear actions after request", exact: true }).click();
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  await toolbar.getByRole("button", { name: "More actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Copy selection", exact: true }).focus();
  const outside = page.getByRole("textbox", { name: "Outside toolbar", exact: true });
  await outside.focus();
  await expect(toolbar.locator(".sheen-toolbar-group")).toHaveCount(0);
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(outside).toBeFocused();
});

test("removing a focused overflow action keeps keyboard focus on a surviving menu item", async ({ page }) => {
  await page.goto("/toolbar");
  await page.getByRole("button", { name: "Toggle toolbar width", exact: true }).click();
  await page.getByRole("button", { name: "Remove copy after request", exact: true }).click();
  await page.getByRole("toolbar").getByRole("button", { name: "More actions", exact: true }).click();
  const copy = page.getByRole("menuitem", { name: "Copy selection", exact: true });
  await copy.focus();
  await expect(copy).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Paste selection", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("Pasted");
});

test("an open overflow menu retains its action set across resize and promotes groups after focus leaves", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 750 });
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  await toolbar.getByRole("button", { name: "More actions", exact: true }).click();
  const overflowItems = page.getByRole("menuitem");
  const copy = page.getByRole("menuitem", { name: "Copy selection", exact: true });
  await copy.focus();
  const initialOverflowLabels = await overflowItems.allTextContents();
  await copy.evaluate(element => element.setAttribute("data-retained", "yes"));
  await page.setViewportSize({ width: 1100, height: 750 });
  await expect(copy).toBeFocused();
  await expect(copy).toHaveAttribute("data-retained", "yes");
  await expect(overflowItems).toHaveCount(initialOverflowLabels.length);
  expect(await overflowItems.allTextContents()).toEqual(initialOverflowLabels);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("Copied");
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(toolbar.getByRole("button", { name: "More actions", exact: true })).toBeFocused();
  await page.getByRole("textbox", { name: "Outside toolbar", exact: true }).focus();
  await expect(toolbar.getByRole("button", { name: "Copy selection", exact: true })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "More actions", exact: true })).toHaveCount(0);
});

test("group reorder retains the focused DOM node and disabling it recovers in the new order", async ({ page }) => {
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  const copy = toolbar.getByRole("button", { name: "Copy selection", exact: true });
  await page.getByRole("button", { name: "Reverse groups after request", exact: true }).click();
  await copy.focus();
  await copy.evaluate(element => element.setAttribute("data-original", "retained"));
  await expect(toolbar.getByRole("group").first()).toHaveAccessibleName("View");
  await expect(copy).toBeFocused();
  await expect(copy).toHaveAttribute("data-original", "retained");
  await page.keyboard.press("ArrowLeft");
  await expect(toolbar.getByRole("button", { name: "Wrap lines", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Disable copy after request", exact: true }).click();
  await copy.focus();
  await expect(copy).toBeDisabled();
  await expect(toolbar.getByRole("button", { name: "Paste selection", exact: true })).toBeFocused();
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1);
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("None");
});

test("removing the focused action after a request recovers to its nearest enabled successor", async ({ page }) => {
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  await page.getByRole("button", { name: "Remove copy after request", exact: true }).click();
  const copy = toolbar.getByRole("button", { name: "Copy selection", exact: true });
  await copy.focus();
  await expect(copy).toHaveCount(0);
  await expect(toolbar.getByRole("button", { name: "Paste selection", exact: true })).toBeFocused();
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1);
  await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("None");
});

test("removal never steals outside focus and clearing focused actions falls back to the toolbar", async ({ page }) => {
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  await page.getByRole("button", { name: "Remove copy after request", exact: true }).click();
  await toolbar.getByRole("button", { name: "Copy selection", exact: true }).focus();
  const outside = page.getByRole("textbox", { name: "Outside toolbar", exact: true });
  await outside.focus();
  await expect(toolbar.getByRole("button", { name: "Copy selection", exact: true })).toHaveCount(0);
  await expect(outside).toBeFocused();
  await page.getByRole("button", { name: "Clear actions after request", exact: true }).click();
  await toolbar.getByRole("button", { name: "Paste selection", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(toolbar.getByRole("button", { name: "Paste selection", exact: true })).toHaveCount(0);
  await expect(toolbar).toBeFocused();
  await expect(toolbar).toHaveCSS("outline-style", "solid");
});

test("toolbar roves enabled actions, retains filters, and invokes overflow toggles", async ({ page }) => {
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  const save = toolbar.getByRole("button", { name: "Save document", exact: true });
  await expect(save).toBeVisible();
  await save.focus();
  await page.keyboard.press("ArrowRight");
  await expect(toolbar.getByRole("button", { name: "Copy selection", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(toolbar.getByRole("button", { name: "Wrap lines", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(toolbar.getByRole("button", { name: "Wrap lines", exact: true })).toHaveAttribute("aria-pressed", "true");
  const filter = page.getByRole("textbox", { name: "Filter documents", exact: true });
  await filter.fill("Retained filter");
  await page.getByRole("button", { name: "Toggle toolbar width", exact: true }).click();
  await toolbar.getByRole("button", { name: "More actions", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Save document", exact: true })).toBeVisible();
  await page.getByRole("menuitemcheckbox", { name: "Wrap lines", exact: true }).click();
  await expect(page.getByRole("status", { name: "Wrapped", exact: true })).toHaveText("false");
  await page.keyboard.press("Escape");
  await expect(filter).toHaveValue("Retained filter");
  await expect(toolbar.getByRole("button", { name: "More actions", exact: true })).toBeFocused();
});

test("queued overflow activation survives hydration and reaches the original action", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/toolbar", { waitUntil: "commit" });
    const filter = page.getByRole("textbox", { name: "Filter documents", exact: true });
    await filter.fill("Before hydration");
    await filter.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "More actions", exact: true }).click();
    release();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("menuitem", { name: "Save document", exact: true }).click();
    await expect(page.getByRole("status", { name: "Last action", exact: true })).toHaveText("Saved");
    await expect(filter).toHaveValue("Before hydration");
    await expect(filter).toHaveAttribute("data-server", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("resize transfers a disappearing action's focus to overflow and RTL leaves filter editing native", async ({ page }) => {
  await page.goto("/toolbar");
  const toolbar = page.getByRole("toolbar", { name: "Document actions", exact: true });
  const wrap = toolbar.getByRole("button", { name: "Wrap lines", exact: true });
  await expect(wrap).toBeVisible();
  await wrap.focus();
  await page.setViewportSize({ width: 375, height: 750 });
  await expect(toolbar.getByRole("button", { name: "More actions", exact: true })).toBeFocused();
  await expect(toolbar.locator('button[tabindex="0"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.setViewportSize({ width: 1100, height: 750 });
  await page.getByRole("button", { name: "Toggle toolbar direction", exact: true }).click();
  const save = toolbar.getByRole("button", { name: "Save document", exact: true });
  await expect(save).toBeVisible();
  await save.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(toolbar.getByRole("button", { name: "Copy selection", exact: true })).toBeFocused();
  const filter = page.getByRole("textbox", { name: "Filter documents", exact: true });
  await filter.fill("abc");
  await page.keyboard.press("Home");
  await expect(filter).toBeFocused();
  expect(await filter.evaluate(element => element instanceof HTMLInputElement ? element.selectionStart : null)).toBe(0);
});
