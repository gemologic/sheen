import { expect, test } from "@playwright/test";

test("a queued server-rendered help trigger hydrates once and retains an early editor draft", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shortcuts", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Shortcut draft", exact: true });
    await draft.fill("Early help draft");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    const trigger = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-server", "retained"));
    await trigger.click();
    release();
    const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
    await expect(sheet).toHaveCount(1);
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Open inbox", { exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveValue("Early help draft");
    await trigger.click();
    await expect(sheet).toHaveCount(1);
    await expect(sheet).toBeVisible();
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("live binding removal and restoration retain the sheet and its focused close control", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "warning" && message.text().includes("computations created outside")) errors.push(message.text()); });
  await page.goto("/shortcuts");
  await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
  const refresh = page.getByRole("button", { name: "Refresh binding availability", exact: true });
  const trigger = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  for (const available of [false, true]) {
    await refresh.click();
    await trigger.click();
    const close = sheet.getByRole("button", { name: "Close", exact: true });
    await close.evaluate(element => element.setAttribute("data-retained", "yes"));
    await sheet.evaluate(element => element.setAttribute("data-retained", "yes"));
    await expect(close).toBeFocused();
    if (available) {
      await expect(sheet.getByText("No results", { exact: true })).toBeVisible();
      await expect(sheet.getByText("Open inbox", { exact: true })).toBeVisible();
      await expect(sheet.getByText("No results", { exact: true })).toHaveCount(0);
    } else {
      await expect(sheet.getByText("Open inbox", { exact: true })).toBeVisible();
      await expect(sheet.getByText("No results", { exact: true })).toBeVisible();
      await expect(sheet.getByRole("heading", { name: "Navigation", exact: true })).toHaveCount(0);
    }
    await expect(close).toHaveAttribute("data-retained", "yes");
    await expect(sheet).toHaveAttribute("data-retained", "yes");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test("question-mark help groups registered actions, traps focus, and suspends application shortcuts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "warning" && message.text().includes("computations created outside")) errors.push(message.text()); });
  await page.goto("/shortcuts");
  const origin = page.getByRole("button", { name: "Toggle pane scope", exact: true });
  await origin.click();
  await page.keyboard.press("?");
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Navigation", exact: true })).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Actions", exact: true })).toBeVisible();
  await expect(sheet.getByText("Ctrl+J", { exact: true })).toBeVisible();
  const close = sheet.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("g");
  await page.keyboard.press("x");
  await page.keyboard.press("i");
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
  await expect(origin).toBeFocused();
  await page.keyboard.press("g");
  await expect(page.getByRole("status", { name: "Last action" })).toHaveText("pane");
  expect(errors).toEqual([]);
});

test("open shortcut help updates after a real refresh without replacing unrelated labels or focus", async ({ page }) => {
  await page.goto("/shortcuts");
  await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
  await page.getByRole("button", { name: "Refresh jump binding", exact: true }).click();
  await page.getByRole("button", { name: "Keyboard shortcuts", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  const retained = sheet.getByText("Open inbox", { exact: true });
  await retained.evaluate(element => element.setAttribute("data-retained", "yes"));
  await expect(sheet.getByText("Ctrl+J", { exact: true })).toBeVisible();
  const close = sheet.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await expect(sheet.getByText("Ctrl+H", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Ctrl+J", { exact: true })).toHaveCount(0);
  await expect(retained).toHaveAttribute("data-retained", "yes");
  await expect(close).toBeFocused();
});

test("visible help remains available with character shortcuts disabled and explains disabled entries", async ({ page }) => {
  await page.goto("/shortcuts");
  const preference = page.getByRole("switch", { name: "Character shortcuts", exact: true });
  await preference.focus();
  await page.keyboard.press("Space");
  await expect(preference).not.toBeChecked();
  const trigger = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Character shortcut disabled", { exact: true }).first()).toBeVisible();
  const modified = sheet.locator(".sheen-shortcut-bindings > div").filter({ has: page.getByText("Modified inbox", { exact: true }) });
  await expect(modified).not.toContainText("Character shortcut disabled");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("?");
  await expect(sheet).not.toBeVisible();
});
