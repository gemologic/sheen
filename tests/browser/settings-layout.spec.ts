import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

test("settings sections, persistent save controls, and AppShell dirty ownership compose", async ({ page }) => {
  await page.goto("/settings-layout");
  await ready(page);
  const layout = page.getByRole("group", { name: "Account settings", exact: true });
  await expect(layout).toHaveAttribute("data-dirty", "false");
  const save = page.getByRole("button", { name: "Save changes", exact: true });
  await expect(save).toBeDisabled();
  await page.getByRole("textbox", { name: "Display name", exact: true }).fill("Grace Hopper");
  await expect(layout).toHaveAttribute("data-dirty", "true");
  await expect(save).toBeEnabled();
  await page.getByRole("link", { name: "Leave settings", exact: true }).click();
  const guard = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await expect(guard).toBeVisible();
  await guard.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/settings-layout$/u);
  await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue("Grace Hopper");
});

test("saving retains the layout, section, input, draft, and save bar on every sampled frame", async ({ page }) => {
  await page.goto("/settings-layout");
  await ready(page);
  const layout = page.locator(".sheen-settings-layout");
  const section = page.locator('[data-section-id="profile"]');
  const input = page.getByRole("textbox", { name: "Display name", exact: true });
  const saveBar = page.getByRole("group", { name: "Settings save bar", exact: true });
  await layout.evaluate(element => element.setAttribute("data-retained-layout", "yes"));
  await section.evaluate(element => element.setAttribute("data-retained-section", "yes"));
  await input.evaluate(element => element.setAttribute("data-retained-input", "yes"));
  await saveBar.evaluate(element => element.setAttribute("data-retained-save", "yes"));
  await input.fill("First submission");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(layout).toHaveAttribute("data-pending", "true");
  await input.fill("Edited during save");
  const samples = await layout.evaluate(async element => {
    const frames: string[] = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      frames.push(element.textContent ?? "");
    }
    return frames;
  });
  expect(samples.every(sample => sample.includes("Profile") && sample.includes("Appearance") && sample.includes("Save changes"))).toBe(true);
  await expect(layout).not.toHaveAttribute("data-pending", "true");
  await expect(layout).toHaveAttribute("data-dirty", "true");
  await expect(input).toHaveValue("Edited during save");
  await expect(page.getByRole("status").filter({ hasText: "Unsaved changes" })).toBeVisible();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(layout).toHaveAttribute("data-dirty", "false");
  await expect(page.getByRole("status", { name: "Accepted display name" })).toHaveText("Edited during save");
  await expect(layout).toHaveAttribute("data-retained-layout", "yes");
  await expect(section).toHaveAttribute("data-retained-section", "yes");
  await expect(input).toHaveAttribute("data-retained-input", "yes");
  await expect(saveBar).toHaveAttribute("data-retained-save", "yes");
});

test("failed save retains the dirty editor and succeeds on the next real request", async ({ page }) => {
  await page.goto("/settings-layout");
  await ready(page);
  const input = page.getByRole("textbox", { name: "Display name", exact: true });
  await input.fill("Retained failure draft");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("checkbox", { name: "Reject next save", exact: true }).press("Space");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Save failed. Your changes were retained.", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("Retained failure draft");
  await expect(page.locator(".sheen-settings-layout")).toHaveAttribute("data-dirty", "true");
  await page.getByRole("checkbox", { name: "Reject next save", exact: true }).press("Space");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".sheen-settings-layout")).toHaveAttribute("data-dirty", "false");
});

test("phone presentation keeps all sections and a reachable horizontal nav without replacing markup", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/settings-layout");
  await ready(page);
  const layout = page.locator(".sheen-settings-layout");
  const profile = page.locator('[data-section-id="profile"]');
  await layout.evaluate(element => element.setAttribute("data-retained-layout", "yes"));
  await profile.evaluate(element => element.setAttribute("data-retained-profile", "yes"));
  const appearance = page.getByRole("button", { name: "Appearance", exact: true });
  await appearance.click();
  await expect(appearance).toHaveAttribute("aria-current", "location");
  await expect(page.locator('[data-section-id="appearance"]')).toBeVisible();
  await expect(layout).toHaveAttribute("data-retained-layout", "yes");
  await expect(profile).toHaveAttribute("data-retained-profile", "yes");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("dark server markup adopts an early draft and hydrates the same settings nodes", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/settings-layout", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const layout = page.locator(".sheen-settings-layout");
    const input = page.getByRole("textbox", { name: "Display name", exact: true });
    const saveBar = page.getByRole("group", { name: "Settings save bar", exact: true });
    await layout.evaluate(element => element.setAttribute("data-server-layout", "yes"));
    await input.evaluate(element => element.setAttribute("data-server-input", "yes"));
    await saveBar.evaluate(element => element.setAttribute("data-server-save", "yes"));
    await input.fill("Before hydration");
    release();
    await ready(page);
    await expect(input).toHaveValue("Before hydration");
    await expect(layout).toHaveAttribute("data-dirty", "true");
    await expect(layout).toHaveAttribute("data-server-layout", "yes");
    await expect(input).toHaveAttribute("data-server-input", "yes");
    await expect(saveBar).toHaveAttribute("data-server-save", "yes");
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  } finally { release(); }
});

test("settings layout has a bounded dark desktop baseline", async ({ page }) => {
  await page.goto("/settings-layout");
  await ready(page);
  await expect(page.locator(".sheen-settings-layout")).toHaveScreenshot("settings-layout-dark.png", { animations: "disabled" });
});
