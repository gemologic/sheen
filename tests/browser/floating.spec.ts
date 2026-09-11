import { expect, test } from "@playwright/test";

test("Tooltip supports focus, shortcut text, hoverable content, Escape, and native action", async ({ page }) => {
  await page.goto("/floating");
  const trigger = page.getByRole("button", { name: "Save workspace", exact: true });
  await trigger.focus();
  const tooltip = page.getByRole("tooltip");
  const mod = await page.evaluate(() => /^(Mac|iPhone|iPad|iPod)/.test(navigator.platform) ? "Meta" : "Control");
  const displayed = mod === "Meta" ? "⌘+S" : "Ctrl+S";
  await expect(tooltip).toHaveText(`Save the workspace${displayed}`);
  await expect(tooltip.locator("kbd")).toHaveText(displayed);
  await expect(tooltip).toHaveCSS("animation-name", "sheen-dialog-enter");
  await expect(trigger).toHaveAccessibleDescription(`Save local changes. Save the workspace ${displayed}`);
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await expect(trigger).toHaveAccessibleDescription("Save local changes.");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Saved count")).toHaveText("1");
  await page.keyboard.press(`${mod}+s`);
  await expect(page.getByLabel("Saved count")).toHaveText("2");
  await page.keyboard.press(`${mod}+u`);
  await expect(page.getByLabel("Saved count")).toHaveText("2");
  await page.getByRole("button", { name: "Outside action", exact: true }).focus();
  await trigger.hover();
  await expect(tooltip).toBeVisible();
  await tooltip.hover();
  await expect(tooltip).toBeVisible();
  await page.getByRole("heading").hover();
  await expect(tooltip).toHaveCount(0);
  await page.getByRole("button", { name: "Disabled action" }).hover();
  await expect(page.getByRole("button", { name: "Disabled action" })).toBeDisabled();
  await expect(tooltip).toHaveCount(0);
});

test("Popover preserves drafts, unwinds nested layers, and respects controlled rejection", async ({ page }) => {
  await page.goto("/floating");
  const trigger = page.getByRole("button", { name: "Open view options", exact: true });
  await trigger.click();
  const popover = page.getByRole("dialog", { name: "View options", exact: true });
  const input = popover.getByRole("textbox", { name: "View name" });
  await expect(popover).toHaveCSS("animation-name", "sheen-dialog-enter");
  await expect(input).toBeFocused();
  await input.fill("Retained view");
  await input.evaluate(element => element.setAttribute("data-original", "retained"));
  await popover.getByRole("button", { name: "Refresh description" }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("data-original", "retained");
  await expect(input).toHaveValue("Retained view");
  await expect(popover).toHaveAccessibleDescription("Updated without replacing your draft.");
  const nestedTrigger = popover.getByRole("button", { name: "Open nested options" });
  await nestedTrigger.click();
  await expect(page.getByRole("dialog", { name: "Nested options", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nestedTrigger).toBeFocused();
  await expect(popover).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Request open" }).click();
  await expect(page.getByRole("dialog", { name: "Rejected options" })).toHaveCount(0);
  await expect(page.getByLabel("Open requests")).toHaveText("1");
  await trigger.click();
  await page.getByRole("button", { name: "Outside action", exact: true }).click();
  await expect(popover).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Outside action", exact: true })).toBeFocused();
});

test("Floating layers inherit a modal's scope and Escape closes only the inner layer", async ({ page }) => {
  await page.goto("/floating");
  await page.getByRole("button", { name: "Open scoped settings" }).click();
  const modal = page.getByRole("dialog", { name: "Scoped settings", exact: true });
  await modal.getByRole("button", { name: "Scoped help" }).focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toHaveText("Inspect the nested layer?");
  await expect(tooltip).toHaveCSS("direction", "rtl");
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await expect(modal).toBeVisible();
  const trigger = modal.getByRole("button", { name: "Open scoped options" });
  await trigger.click();
  const popup = page.getByRole("dialog", { name: "Scoped options", exact: true });
  await expect(popup).toHaveCSS("direction", "rtl");
  expect(await popup.evaluate(element => element.closest("[data-sheen-portal]")?.getAttribute("data-sheen-theme"))).toBe("paper");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(modal).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
});

test("Tooltip focus survives delayed hydration without trigger replacement", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/floating", { waitUntil: "commit" });
    const trigger = page.getByRole("button", { name: "Save workspace", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-server-trigger", "retained"));
    await trigger.focus();
    release();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("data-server-trigger", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("Popover replays a pre-hydration click and preserves its native trigger", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/floating", { waitUntil: "commit" });
    const trigger = page.getByRole("button", { name: "Open view options", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-server-trigger", "retained"));
    await trigger.click();
    release();
    const popup = page.getByRole("dialog", { name: "View options", exact: true });
    await expect(popup).toBeVisible();
    await expect(popup.getByRole("textbox", { name: "View name" })).toBeFocused();
    await expect(trigger).toHaveAttribute("data-server-trigger", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
