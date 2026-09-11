import { expect, test } from "@playwright/test";

test("phone handoff leaves focus in unrelated main content", async ({ page }) => {
  await page.goto("/shell-sidebar-controlled");
  await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
  await expect(page.getByRole("status", { name: "Sidebar proposals", exact: true })).toHaveText("1");
  await page.getByRole("textbox", { name: "Sidebar draft", exact: true }).focus();
  const main = page.getByRole("button", { name: "Accept sidebar changes", exact: true });
  await main.focus();
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(main).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("shell drawer retains sidebar state across breakpoints and owns modal focus", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/shell-sidebar-controlled");
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.click();
  await expect(page.getByRole("status", { name: "Sidebar proposals", exact: true })).toHaveText("1");
  const draft = page.getByRole("textbox", { name: "Sidebar draft", exact: true });
  await draft.fill("Persistent drawer draft");
  await draft.evaluate(element => element.setAttribute("data-retained", "true"));
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(draft).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(drawer).toBeVisible();
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue("Persistent drawer draft");
  await expect(draft).toHaveAttribute("data-retained", "true");
  const drawerId = await drawer.getAttribute("id");
  expect(drawerId).toBeTruthy();
  expect(await page.locator(".sheen-sidebar-toggle-mobile").getAttribute("aria-controls")).toBe(drawerId);
  await expect(page.getByRole("button", { name: "Accept sidebar changes", exact: true })).toHaveCount(0);
  await drawer.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(draft).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue("Persistent drawer draft");
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(drawer).toHaveCount(0);
  await expect(draft).toHaveAttribute("data-retained", "true");
  await expect(draft).toHaveValue("Persistent drawer draft");
  await expect(toggle).toBeFocused();
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("phone sidebar is hidden before JavaScript and its toggle hydrates into one drawer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 750 });
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shell", { waitUntil: "commit" });
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("complementary")).toHaveCount(0);
    const navigation = page.locator(".sheen-shell-sidebar nav");
    await navigation.evaluate(element => element.setAttribute("data-server", "retained"));
    await toggle.click();
    release();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    await expect(drawer).toHaveCount(1);
    await expect(drawer.getByRole("navigation", { name: "Sections", exact: true })).toHaveAttribute("data-server", "retained");
    const bounds = await drawer.boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.height).toBe(750);
    expect(bounds?.width).toBeLessThan(375);
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Workspace draft", exact: true })).toBeVisible();
  } finally { release(); }
});
