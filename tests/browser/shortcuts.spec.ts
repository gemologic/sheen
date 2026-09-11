import { expect, test } from "@playwright/test";

test("pending feedback retains its live region and layout slot without taking keyboard focus", async ({ page }) => {
  await page.goto("/shortcuts");
  const origin = page.getByRole("button", { name: "Toggle pane scope", exact: true });
  await origin.click();
  await expect(page.getByRole("status", { name: "Pane active" })).toHaveText("true");
  const pending = page.getByRole("status", { name: "Pending shortcut", exact: true });
  const help = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  await pending.evaluate(element => element.setAttribute("data-retained", "yes"));
  const before = await pending.boundingBox();
  const helpBefore = await help.boundingBox();
  expect(before?.height).toBeGreaterThan(0);
  await page.keyboard.press("x");
  await expect(pending).toHaveAttribute("data-pending", "true");
  await expect(pending).toHaveAttribute("aria-live", "polite");
  await expect(pending.locator("kbd")).toHaveText(["X → I", "X → P"]);
  expect(await pending.boundingBox()).toEqual(before);
  expect(await help.boundingBox()).toEqual(helpBefore);
  await expect(origin).toBeFocused();
  await page.keyboard.press("i");
  await expect(pending).toBeEmpty();
  await expect(pending).toHaveAttribute("data-retained", "yes");
  expect(await pending.boundingBox()).toEqual(before);
  expect(await help.boundingBox()).toEqual(helpBefore);
  await expect(origin).toBeFocused();
});

test("users can disable character shortcuts while keeping modified actions and sequences", async ({ page }) => {
  await page.goto("/shortcuts");
  const preference = page.getByRole("switch", { name: "Character shortcuts", exact: true });
  await preference.focus();
  await page.keyboard.press("Space");
  await expect(preference).not.toBeChecked();
  await page.getByRole("button", { name: "Toggle pane scope", exact: true }).focus();
  const count = page.getByRole("status", { name: "Action count" });
  await page.keyboard.press("g");
  await page.keyboard.press("?");
  await page.keyboard.press("x");
  await page.keyboard.press("i");
  await expect(count).toHaveText("0");
  await expect(page.getByRole("status", { name: "Pending shortcut", exact: true })).toBeEmpty();
  await page.keyboard.press("Control+j");
  await expect(count).toHaveText("1");
  await page.keyboard.press("Control+b");
  await page.keyboard.press("i");
  await expect(count).toHaveText("2");
  await expect(page.getByRole("status", { name: "Last action" })).toHaveText("modified inbox");
  await preference.focus();
  await page.keyboard.press("Space");
  await expect(preference).toBeChecked();
  await page.getByRole("button", { name: "Toggle pane scope", exact: true }).focus();
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(count).toHaveText("3");
  await expect(page.getByRole("status", { name: "Last action" })).toHaveText("help");
});

test("a character-shortcut preference changed before hydration is retained", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shortcuts", { waitUntil: "commit" });
    const preference = page.getByRole("switch", { name: "Character shortcuts", exact: true });
    await preference.evaluate(element => element.setAttribute("data-server", "retained"));
    await preference.focus();
    await page.keyboard.press("Space");
    await expect(preference).not.toBeChecked();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(preference).toHaveAttribute("data-server", "retained");
    await expect(preference).toBeFocused();
    await expect(preference).not.toBeChecked();
    await page.getByRole("button", { name: "Toggle pane scope", exact: true }).focus();
    await page.keyboard.press("g");
    await page.keyboard.press("x");
    await page.keyboard.press("i");
    await expect(page.getByRole("status", { name: "Action count" })).toHaveText("0");
    await page.keyboard.press("Control+j");
    await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
    expect(errors).toEqual([]);
  } finally { release(); }
});

for (const owner of ["bindings", "provider"]) {
  test(`pending sequence cannot finish after ${owner} removal and remount`, async ({ page }) => {
    await page.goto("/shortcuts");
    await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
    await page.keyboard.press("x");
    await expect(page.getByRole("status", { name: "Pending shortcut", exact: true })).not.toBeEmpty();
    const toggle = page.getByRole("button", { name: owner === "bindings" ? "Toggle bindings" : "Toggle provider", exact: true });
    await toggle.click();
    await toggle.click();
    await page.keyboard.press("i");
    await expect(page.getByRole("status", { name: "Action count" })).toHaveText("0");
    await expect(page.getByRole("status", { name: "Pending shortcut", exact: true })).toBeEmpty();
    await page.keyboard.press("x");
    await page.keyboard.press("p");
    await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
    await expect(page.getByRole("status", { name: "Last action" })).toHaveText("projects");
  });
}

test("native sequences show pending choices, complete, expire, and cancel on focus or Escape", async ({ page }) => {
  await page.goto("/shortcuts");
  await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
  const pending = page.getByRole("status", { name: "Pending shortcut", exact: true });
  const count = page.getByRole("status", { name: "Action count", exact: true });
  await page.keyboard.press("x");
  await expect(pending).toHaveText("X → I: Open inbox; X → P: Open projects");
  await expect(count).toHaveText("0");
  await page.keyboard.press("i");
  await expect(count).toHaveText("1");
  await expect(page.getByRole("status", { name: "Last action" })).toHaveText("inbox");
  await expect(pending).toBeEmpty();
  await page.keyboard.press("x");
  await expect(pending).not.toBeEmpty();
  await expect(pending).toBeEmpty();
  await page.keyboard.press("p");
  await expect(count).toHaveText("1");
  await page.keyboard.press("x");
  await expect(pending).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await expect(pending).toBeEmpty();
  await page.keyboard.press("x");
  await expect(pending).not.toBeEmpty();
  const draft = page.getByRole("textbox", { name: "Shortcut draft", exact: true });
  await draft.focus();
  await expect(pending).toBeEmpty();
  await page.keyboard.type("ip");
  await expect(draft).toHaveValue("ip");
  await expect(count).toHaveText("1");
});

test("refresh replaces a binding without replacing the focused editor or selection", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/shortcuts");
  await page.getByRole("button", { name: "Refresh jump binding", exact: true }).click();
  await expect(page.getByRole("status", { name: "Refreshing binding" })).toHaveText("true");
  const draft = page.getByRole("textbox", { name: "Shortcut draft", exact: true });
  await draft.fill("Retained draft");
  await draft.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected native input");
    element.setAttribute("data-retained", "yes");
    element.setSelectionRange(2, 7, "backward");
  });
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
  await expect(page.getByRole("status", { name: "Jump binding" })).toHaveText("mod+h");
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue("Retained draft");
  await expect(draft).toHaveAttribute("data-retained", "yes");
  expect(await draft.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected native input");
    return [element.selectionStart, element.selectionEnd, element.selectionDirection];
  })).toEqual([2, 7, "backward"]);
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
  await page.keyboard.press("Control+h");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("2");
  expect(errors).toEqual([]);
});

test("shortcuts honor handled controls and contenteditable text", async ({ page }) => {
  await page.goto("/shortcuts");
  await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
  await expect(page.getByRole("status", { name: "Pane active" })).toHaveText("true");
  const handled = page.getByRole("textbox", { name: "Handled shortcut draft", exact: true });
  await handled.fill("Retained");
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("0");
  await expect(handled).toHaveValue("Retained");
  const editable = page.getByRole("textbox", { name: "Editable shortcut prose", exact: true });
  await editable.fill("Notes ");
  await page.keyboard.type("g");
  await expect(editable).toHaveText("Notes g");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("0");
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
  await expect(editable).toHaveText("Notes g");
});

test("shortcut hydration preserves an early draft and installs one working listener", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shortcuts", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Shortcut draft", exact: true });
    await draft.fill("Early draft");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
    await draft.focus();
    release();
    await expect(page.getByRole("status", { name: "Pane active" })).toHaveText("true");
    await expect(draft).toBeFocused();
    await expect(draft).toHaveValue("Early draft");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await page.keyboard.press("Control+j");
    await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
    await page.getByRole("button", { name: "Toggle pane scope", exact: true }).focus();
    await page.keyboard.press("g");
    await expect(page.getByRole("status", { name: "Action count" })).toHaveText("2");
    await expect(page.getByRole("status", { name: "Last action" })).toHaveText("pane");
    expect(errors).toEqual([]);
  } finally { release(); }
});

for (const disposal of ["none", "bindings", "provider"]) {
  test(`async shortcut rejection with ${disposal} disposal`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/shortcuts");
    await page.getByRole("button", { name: "Toggle pane scope", exact: true }).click();
    const response = page.waitForResponse(result => result.url().endsWith("/api/optimistic"));
    await page.keyboard.press("Control+y");
    if (disposal !== "none") {
      const toggle = page.getByRole("button", { name: disposal === "bindings" ? "Toggle bindings" : "Toggle provider", exact: true });
      await toggle.click();
      await toggle.click();
    }
    await (await response).finished();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.getByRole("status", { name: "Errors" })).toHaveText(disposal === "none" ? "1" : "0");
    await page.keyboard.press("Control+j");
    await expect(page.getByRole("status", { name: "Last action" })).toHaveText("jump");
    expect(errors).toEqual([]);
  });
}

test("native shortcut scopes suppress editing and dispose registrations and listeners", async ({ page }) => {
  await page.goto("/shortcuts");
  const toggle = page.getByRole("button", { name: "Toggle pane scope", exact: true });
  await toggle.click();
  await page.keyboard.press("g");
  await expect(page.getByRole("status", { name: "Last action" })).toHaveText("pane");
  const draft = page.getByRole("textbox", { name: "Shortcut draft", exact: true });
  await draft.focus();
  await page.keyboard.type("g");
  await expect(draft).toHaveValue("g");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("1");
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("status", { name: "Last action" })).toHaveText("jump");
  await page.keyboard.press("Control+e");
  await expect(page.getByRole("status", { name: "Errors" })).toHaveText("1");
  await expect(draft).toBeFocused();
  await page.getByRole("button", { name: "Toggle bindings", exact: true }).click();
  await page.keyboard.press("g");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("2");
  await page.getByRole("button", { name: "Toggle bindings", exact: true }).click();
  await page.getByRole("button", { name: "Toggle provider", exact: true }).click();
  await page.keyboard.press("g");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("2");
  await page.getByRole("button", { name: "Toggle provider", exact: true }).click();
  await page.keyboard.press("g");
  await expect(page.getByRole("status", { name: "Action count" })).toHaveText("3");
});
