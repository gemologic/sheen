import { expect, test } from "@playwright/test";

test("rail transitions recover focus from hidden disclosure controls and destinations", async ({ page }) => {
  await page.goto("/sidebar/home");
  const root = page.getByRole("group", { name: "Workspace sidebar", exact: true });
  const team = page.getByRole("button", { name: "Team", exact: true });
  await page.getByRole("button", { name: "Toggle rail", exact: true }).click();
  await team.focus();
  await expect(root).toHaveAttribute("data-collapsed", "true");
  await expect(root.getByRole("link", { name: "People 3 members", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Toggle rail", exact: true }).click();
  await root.getByRole("link", { name: "Settings", exact: true }).focus();
  await expect(root).toHaveAttribute("data-collapsed", "false");
  await expect(team).toBeFocused();
  await expect(team).toHaveAttribute("aria-expanded", "false");
});

test("collapsed RTL sidebar paints and hydrates without replacing early focused links", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/sidebar/home?collapsed=true&rtl=true", { waitUntil: "commit" });
    const root = page.getByRole("group", { name: "Workspace sidebar", exact: true });
    await expect(root).toHaveAttribute("data-collapsed", "true");
    await expect(root).toHaveCSS("direction", "rtl");
    const box = await root.boundingBox();
    expect(box?.width).toBe(48);
    const settings = root.getByRole("link", { name: "Settings", exact: true });
    await expect(settings).toBeVisible();
    const linkBox = await settings.boundingBox();
    expect(linkBox?.width).toBeLessThanOrEqual(48);
    await settings.focus();
    await settings.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(page.getByRole("tooltip")).toHaveText("Settings");
    await expect(page.getByRole("tooltip")).toHaveCSS("direction", "rtl");
    await expect(settings).toBeFocused();
    await expect(settings).toHaveAttribute("data-server", "retained");
    expect(await root.boundingBox()).toEqual(box);
  } finally { release(); }
});

test("collapsed rail retains links, exposes nested destinations and restores disclosure state", async ({ page }) => {
  await page.goto("/sidebar/home");
  const root = page.getByRole("group", { name: "Workspace sidebar", exact: true });
  const home = root.getByRole("link", { name: "Home", exact: true });
  const team = page.getByRole("button", { name: "Team", exact: true });
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Toggle rail", exact: true }).click();
  await home.focus();
  await home.evaluate(element => element.setAttribute("data-retained", "yes"));
  await expect(root).toHaveAttribute("data-collapsed", "true");
  await expect(home).toBeFocused();
  await expect(home).toHaveAttribute("data-retained", "yes");
  await expect(page.getByRole("tooltip")).toHaveText("Home");
  await expect(root.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(team).toHaveCount(0);
  expect((await root.boundingBox())?.width).toBe(48);
  await page.keyboard.press("Tab");
  await expect(root.getByRole("link", { name: "People 3 members", exact: true })).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText("People");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Toggle rail", exact: true }).click();
  await home.focus();
  await expect(root).toHaveAttribute("data-collapsed", "false");
  await expect(home).toBeFocused();
  await expect(home).toHaveAttribute("data-retained", "yes");
  await expect(team).toHaveAttribute("aria-expanded", "false");
});

test("empty sidebar retains a visible focus fallback and repopulates without taking focus", async ({ page }) => {
  await page.goto("/sidebar/settings");
  const root = page.getByRole("group", { name: "Workspace sidebar", exact: true });
  await page.getByRole("button", { name: "Clear sidebar", exact: true }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(root.getByRole("link")).toHaveCount(0);
  await expect(root).toBeFocused();
  await expect(root).toHaveCSS("outline-style", "solid");
  expect((await root.boundingBox())?.height).toBeGreaterThan(4);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Open settings directly", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Restore sidebar", exact: true }).click();
  await root.focus();
  await expect(root.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(root).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(root.getByRole("link", { name: "Home", exact: true })).toBeFocused();
});

test("clearing every section preserves deliberate outside focus", async ({ page }) => {
  await page.goto("/sidebar/settings");
  await page.getByRole("button", { name: "Clear sidebar", exact: true }).click();
  const outside = page.getByRole("link", { name: "Open settings directly", exact: true });
  await outside.focus();
  await expect(page.locator(".sheen-sidebar-nav section")).toHaveCount(0);
  await expect(outside).toBeFocused();
});

test("reordering retains a nested link and removing its group recovers to surviving navigation", async ({ page }) => {
  await page.goto("/sidebar/settings");
  const settings = page.getByRole("link", { name: "Settings", exact: true });
  await page.getByRole("button", { name: "Reverse sidebar", exact: true }).click();
  await settings.focus();
  await settings.evaluate(element => element.setAttribute("data-retained", "yes"));
  await expect(page.locator(".sheen-sidebar-navigation > section > nav > ul > li").first()).toContainText("Team");
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute("data-retained", "yes");
  await page.getByRole("button", { name: "Remove team", exact: true }).click();
  await settings.focus();
  await expect(settings).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeFocused();
});

test("removing a sidebar group does not steal deliberate outside focus", async ({ page }) => {
  await page.goto("/sidebar/settings");
  await page.getByRole("button", { name: "Remove team", exact: true }).click();
  const outside = page.getByRole("link", { name: "Open settings directly", exact: true });
  await outside.focus();
  await expect(page.getByRole("button", { name: "Team", exact: true })).toHaveCount(0);
  await expect(outside).toBeFocused();
});

test("same-route refresh respects a deliberately closed active group", async ({ page }) => {
  await page.goto("/sidebar/people");
  const team = page.getByRole("button", { name: "Team", exact: true });
  await expect(team).toHaveAttribute("aria-expanded", "true");
  await team.click();
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Refresh sidebar", exact: true }).click();
  await expect(page.locator('.sheen-sidebar-nav a[href="/sidebar/people"]')).toContainText("Updated people");
  await expect(team).toHaveAttribute("aria-expanded", "false");
});

test("fresh sidebar objects retain focused links and manually expanded groups", async ({ page }) => {
  await page.goto("/sidebar/home");
  const team = page.getByRole("button", { name: "Team", exact: true });
  await team.click();
  const admin = page.getByRole("button", { name: "Administration", exact: true });
  await admin.click();
  await team.evaluate(element => element.setAttribute("data-retained", "yes"));
  await page.getByRole("button", { name: "Refresh sidebar", exact: true }).click();
  const people = page.getByRole("link", { name: "People 3 members", exact: true });
  await people.focus();
  await people.evaluate(element => element.setAttribute("data-retained", "yes"));
  const updated = page.getByRole("link", { name: "Updated people 3 members", exact: true });
  await expect(updated).toBeFocused();
  await expect(updated).toHaveAttribute("data-retained", "yes");
  await expect(team).toHaveAttribute("data-retained", "yes");
  await expect(team).toHaveAttribute("aria-expanded", "true");
  await expect(admin).toHaveAttribute("aria-expanded", "true");
});

test("nested sidebar follows accepted routes and reveals active ancestors", async ({ page }) => {
  await page.goto("/sidebar/home");
  const team = page.getByRole("button", { name: "Team", exact: true });
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await team.focus();
  await page.keyboard.press("Enter");
  await expect(team).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  const people = page.getByRole("link", { name: "People 3 members", exact: true });
  await expect(people).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sidebar\/people$/);
  await expect(people).toHaveAttribute("aria-current", "page");
  await team.click();
  await expect(team).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "Open settings directly", exact: true }).click();
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(team).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Administration", exact: true })).toHaveAttribute("aria-expanded", "true");
  expect(await page.locator('[aria-current="page"]').count()).toBe(1);
});

test("sidebar server markup reveals a deep route before hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/sidebar/settings", { waitUntil: "commit" });
    const settings = page.getByRole("link", { name: "Settings", exact: true });
    await expect(settings).toBeVisible();
    await expect(settings).toHaveAttribute("aria-current", "page");
    await settings.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Team", exact: true }).click();
    release();
    await expect(page.getByRole("button", { name: "Team", exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator('.sheen-sidebar-nav a[href="/sidebar/settings"]')).toHaveAttribute("data-server", "retained");
  } finally { release(); }
});
