import { expect, test } from "@playwright/test";

for (const development of [false, true]) {
  test(`shell theme cycling obeys development policy ${development}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(development ? "/shell" : "/shell-production");
    const help = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
    await help.click();
    const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
    await expect(sheet.locator("kbd")).toHaveCount(development ? 3 : 2);
    await expect(sheet.getByText("Cycle theme mode", { exact: true })).toHaveCount(development ? 1 : 0);
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    const draft = page.getByRole("textbox", { name: "Workspace draft", exact: true });
    await draft.fill("Mode changes retain my draft");
    await draft.evaluate(element => element.setAttribute("data-retained", "true"));
    const mod = await page.evaluate(() => /^(Mac|iPhone|iPad|iPod)/.test(navigator.platform) ? "Meta" : "Control");
    for (const preference of ["light", "system", "dark"]) {
      await page.keyboard.press(`${mod}+Shift+d`);
      await expect(page.locator("html")).toHaveAttribute("data-sheen-preference", development ? preference : "dark");
      await expect(draft).toBeFocused();
      await expect(draft).toHaveValue("Mode changes retain my draft");
      await expect(draft).toHaveAttribute("data-retained", "true");
    }
    expect(errors).toEqual([]);
  });
}

test("shell help uses the shared registry and retains content through opening and refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/shell");
  const help = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await help.click();
  await expect(sheet.locator("kbd")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  const draft = page.getByRole("textbox", { name: "Workspace draft", exact: true });
  await draft.fill("Retained shell draft");
  await draft.evaluate(element => element.setAttribute("data-retained", "true"));
  const refresh = page.getByRole("button", { name: "Refresh workspace", exact: true });
  await refresh.focus();
  await page.keyboard.press("?");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Application", exact: true })).toBeVisible();
  await expect(sheet.locator("kbd")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(refresh).toBeFocused();
  await refresh.click();
  await expect(page.getByText("Row 1: refreshed", { exact: true })).toBeVisible();
  await expect(draft).toHaveValue("Retained shell draft");
  await expect(draft).toHaveAttribute("data-retained", "true");
  const preference = page.getByRole("switch", { name: "Character shortcuts", exact: true });
  await preference.focus();
  await page.keyboard.press("Space");
  await expect(preference).not.toBeChecked();
  await refresh.focus();
  await page.keyboard.press("?");
  await expect(sheet).toHaveCount(0);
  await help.click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Character shortcut disabled", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  expect(errors).toEqual([]);
});

test("shell help replays an early click while retaining the server editor", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shell", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Workspace draft", exact: true });
    await draft.fill("Early shell draft");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    const help = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
    await help.evaluate(element => element.setAttribute("data-server", "retained"));
    await help.click();
    release();
    const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
    await expect(sheet).toHaveCount(1);
    await expect(sheet.locator("kbd")).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    await expect(help).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveValue("Early shell draft");
  } finally { release(); }
});
