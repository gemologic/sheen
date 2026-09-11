import { expect, test } from "@playwright/test";

test("disposing a pending persistence owner aborts its request and permits a fresh shell", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/optimistic", async route => { await barrier; await route.continue(); });
  try {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto("/shell-drawer-persistence");
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    const draft = page.getByRole("textbox", { name: "Persisted drawer draft", exact: true });
    await draft.fill("Disposed request owner");
    await draft.evaluate(element => element.setAttribute("data-old-owner", "true"));
    const requested = page.waitForRequest(request => request.url().endsWith("/api/optimistic"));
    const failed = page.waitForEvent("requestfailed", request => request.url().endsWith("/api/optimistic"));
    await page.keyboard.press("Escape");
    const request = await requested;
    await expect(page.getByRole("status", { name: "Preference pending", exact: true })).toHaveText("true");
    await drawer.getByRole("button", { name: "Remove persistence shell", exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Restore persistence shell", exact: true })).toBeVisible();
    release();
    expect(await failed).toBe(request);
    expect(request.failure()?.errorText).toBeTruthy();
    await page.getByRole("button", { name: "Restore persistence shell", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(draft).toHaveValue("");
    await expect(draft).not.toHaveAttribute("data-old-owner");
    await expect(page.getByRole("status", { name: "Preference pending", exact: true })).toHaveText("false");
    await expect(page.getByRole("status", { name: "Preference requests", exact: true })).toHaveText("0");
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("async rejected drawer closure retains editing and can be retried", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/optimistic", async route => { await barrier; await route.continue(); });
  try {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto("/shell-drawer-persistence");
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    const draft = page.getByRole("textbox", { name: "Persisted drawer draft", exact: true });
    const pending = page.getByRole("status", { name: "Preference pending", exact: true });
    const requests = page.getByRole("status", { name: "Preference requests", exact: true });
    await draft.fill("Draft survives persistence");
    await draft.evaluate(element => element.setAttribute("data-retained", "true"));
    await page.keyboard.press("Escape");
    await expect(pending).toHaveText("true");
    await expect(drawer).toBeVisible();
    await expect(draft).toBeFocused();
    await draft.fill("Still editable while saving");
    await page.keyboard.press("Escape");
    await expect(requests).toHaveText("1");
    release();
    await expect(pending).toHaveText("false");
    await expect(page.getByRole("alert")).toContainText("Could not save drawer preference");
    await expect(draft).toBeFocused();
    await expect(draft).toHaveAttribute("data-retained", "true");
    await expect(draft).toHaveValue("Still editable while saving");
    await drawer.getByRole("button", { name: "Close", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(draft).toBeFocused();
    await drawer.getByRole("switch", { name: "Reject preference save", exact: true }).focus();
    await page.keyboard.press("Space");
    await drawer.getByRole("button", { name: "Retry preference save", exact: true }).click();
    await expect(pending).toHaveText("true");
    await expect(requests).toHaveText("2");
    await expect(drawer).toHaveCount(0);
    await expect(toggle).toBeFocused();
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(draft).toHaveAttribute("data-retained", "true");
    await expect(draft).toHaveValue("Still editable while saving");
    await expect(pending).toHaveText("false");
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally { release(); }
});

test("an accepted preference save after desktop return preserves desktop state", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/optimistic", async route => { await barrier; await route.continue(); });
  try {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto("/shell-drawer-persistence");
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    await drawer.getByRole("switch", { name: "Reject preference save", exact: true }).focus();
    await page.keyboard.press("Space");
    const draft = page.getByRole("textbox", { name: "Persisted drawer draft", exact: true });
    await draft.fill("Survives delayed desktop completion");
    await draft.evaluate(element => element.setAttribute("data-retained", "true"));
    await page.keyboard.press("Escape");
    const pending = page.getByRole("status", { name: "Preference pending", exact: true });
    await expect(pending).toHaveText("true");
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect(drawer).toHaveCount(0);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await draft.focus();
    release();
    await expect(pending).toHaveText("false");
    await expect(draft).toBeFocused();
    await expect(draft).toHaveAttribute("data-retained", "true");
    await expect(draft).toHaveValue("Survives delayed desktop completion");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(drawer).toHaveCount(0);
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(draft).toHaveValue("Survives delayed desktop completion");
    await expect(page.getByRole("status", { name: "Preference requests", exact: true })).toHaveText("1");
  } finally { release(); }
});
