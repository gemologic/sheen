import { expect, test } from "@playwright/test";

test("status bar honors hidden state and renders dark and light RTL variants", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 650 });
  await page.goto("/status-bar");
  await expect(page.locator('.sheen-status-bar[aria-label="Hidden status"]')).toBeHidden();
  await expect(page.getByRole("group", { name: "Light RTL workspace", exact: true })).toHaveCSS("direction", "rtl");
  await expect(page.locator("[data-status-matrix]")).toHaveScreenshot("status-bar-dark-light-rtl.png");
});

test("status updates preserve actions and localize counts without inventing network health", async ({ page, context }) => {
  await page.goto("/status-bar");
  const bar = page.getByRole("group", { name: "Application status", exact: true });
  const live = bar.getByRole("status");
  const draft = bar.getByRole("textbox", { name: "Status draft", exact: true });
  await draft.fill("Keep this draft");
  await bar.evaluate(element => element.setAttribute("data-original", "retained"));
  await expect(live).toContainText("Connected");
  await expect(live).toContainText("Background tasks: 2");
  await expect(live).not.toContainText("Rows");
  await expect(bar.locator("dd")).toHaveText("1,234");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Complete and disconnect", exact: true }).click();
  await expect(live.locator(".sheen-status-connection")).toHaveText("Disconnected");
  await expect(live.locator(".sheen-status-tasks")).toBeHidden();
  await page.getByRole("button", { name: "Toggle locale", exact: true }).click();
  await expect(live.locator(".sheen-status-connection")).toHaveText("Getrennt");
  await expect(bar.locator("dd")).toHaveText("1.234");
  await bar.getByRole("button", { name: "Retry connection", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(live).toContainText("Connecting");
  await expect(live).toContainText("Hintergrundaufgaben: 1");
  await expect(bar.getByRole("button", { name: "Retry connection", exact: true })).toBeFocused();
  await expect(draft).toHaveValue("Keep this draft");
  await expect(bar).toHaveAttribute("data-original", "retained");
  await page.setViewportSize({ width: 375, height: 750 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await context.setOffline(false);
});

test("status bar hydrates in place and replays a pending state change", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/status-bar", { waitUntil: "commit" });
    const bar = page.getByRole("group", { name: "Application status", exact: true });
    const draft = bar.getByRole("textbox", { name: "Status draft", exact: true });
    await draft.fill("Before hydration");
    await bar.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Complete and disconnect", exact: true }).click();
    release();
    await expect(bar.getByRole("status").locator(".sheen-status-connection")).toHaveText("Disconnected");
    await expect(bar.getByRole("status").locator(".sheen-status-tasks")).toBeHidden();
    await expect(bar).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveValue("Before hydration");
    expect(errors).toEqual([]);
  } finally { release(); }
});
