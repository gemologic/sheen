import { expect, test } from "@playwright/test";

for (const expanded of [false, true]) {
  test(`Select typeahead owns character keys with expanded ${expanded}`, async ({ page }) => {
    await page.goto("/shortcut-panes");
    await page.getByRole("button", { name: "Outside scope", exact: true }).click();
    const action = page.getByRole("status", { name: "Scope action", exact: true });
    const trigger = page.getByRole("button", { name: "Pane choice Alpha", exact: true });
    await trigger.focus();
    if (expanded) {
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("option", { name: "Alpha", exact: true })).toBeFocused();
    }
    await page.keyboard.press("g");
    if (expanded) {
      await expect(page.getByRole("option", { name: "Gamma", exact: true })).toBeFocused();
      await expect(action).toHaveText("ready");
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("button", { name: "Pane choice Gamma", exact: true })).toBeFocused();
    await expect(action).toHaveText("ready");
    await page.keyboard.press("Control+j");
    await expect(action).toHaveText("jump left");
    await page.getByRole("button", { name: "Left control", exact: true }).focus();
    await page.keyboard.press("g");
    await expect(action).toHaveText("left");
  });
}

test("Select hydrates early typeahead inside a shortcut scope without replacement", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shortcut-panes", { waitUntil: "commit" });
    await page.getByRole("button", { name: "Outside scope", exact: true }).click();
    const trigger = page.getByRole("button", { name: "Pane choice Alpha", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-server", "retained"));
    await trigger.focus();
    await page.keyboard.press("g");
    release();
    const selected = page.getByRole("button", { name: "Pane choice Gamma", exact: true });
    await expect(selected).toBeFocused();
    await expect(selected).toHaveAttribute("data-server", "retained");
    const action = page.getByRole("status", { name: "Scope action", exact: true });
    await expect(action).toHaveText("ready");
    await page.keyboard.press("g");
    await expect(selected).toBeFocused();
    await expect(action).toHaveText("ready");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("portalled menu typeahead does not also activate a background character shortcut", async ({ page }) => {
  await page.goto("/shortcut-panes");
  await page.getByRole("button", { name: "Outside scope", exact: true }).click();
  const action = page.getByRole("status", { name: "Scope action", exact: true });
  await expect(action).toHaveText("ready");
  const trigger = page.getByRole("button", { name: "Pane menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Alpha", exact: true })).toBeFocused();
  await page.keyboard.press("g");
  await expect(page.getByRole("menuitem", { name: "Gamma", exact: true })).toBeFocused();
  await expect(action).toHaveText("ready");
  await page.keyboard.press("Enter");
  await expect(action).toHaveText("gamma");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("g");
  await expect(action).toHaveText("left");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Alpha", exact: true })).toBeFocused();
  await page.keyboard.press("Control+j");
  await expect(action).toHaveText("jump global");
  await page.keyboard.press("g");
  await expect(page.getByRole("menuitem", { name: "Gamma", exact: true })).toBeFocused();
  await expect(action).toHaveText("jump global");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("g");
  await expect(action).toHaveText("left");
});

test("nested portalled menus own typeahead and unwind back to the pane", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/shortcut-panes");
  await page.getByRole("button", { name: "Outside scope", exact: true }).click();
  const action = page.getByRole("status", { name: "Scope action", exact: true });
  const trigger = page.getByRole("button", { name: "Pane menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Alpha", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  const nested = page.getByRole("menuitem", { name: "Nested actions", exact: true });
  await expect(nested).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitem", { name: "Beta", exact: true })).toBeFocused();
  await page.keyboard.press("g");
  await expect(page.getByRole("menuitem", { name: "Garden", exact: true })).toBeFocused();
  await expect(action).toHaveText("ready");
  await page.keyboard.press("Escape");
  await expect(nested).toBeFocused();
  await page.keyboard.press("g");
  await expect(page.getByRole("menuitem", { name: "Gamma", exact: true })).toBeFocused();
  await expect(action).toHaveText("ready");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("g");
  await expect(action).toHaveText("left");
  expect(errors).toEqual([]);
});

test("focus chooses nested pane scopes and preserves ordinary editor behavior", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/shortcut-panes");
  await page.getByRole("button", { name: "Outside scope", exact: true }).click();
  const action = page.getByRole("status", { name: "Scope action", exact: true });
  await expect(action).toHaveText("ready");
  for (const [name, expected] of [["Outside scope", "global"], ["View control", "view"], ["Left control", "left"], ["Right control", "right"]]) {
    if (!name || !expected) throw new Error("Missing scope fixture");
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("g");
    await expect(action).toHaveText(expected);
  }
  await page.getByRole("button", { name: "Left control", exact: true }).focus();
  await page.keyboard.press("Tab");
  const draft = page.getByRole("textbox", { name: "Left draft", exact: true });
  await expect(draft).toBeFocused();
  await page.keyboard.type("g");
  await expect(draft).toHaveValue("g");
  await expect(action).toHaveText("right");
  await page.keyboard.press("Control+j");
  await expect(action).toHaveText("jump left");
  await page.getByRole("button", { name: "Left control", exact: true }).focus();
  await page.keyboard.press("x");
  await expect(page.getByRole("status", { name: "Pending shortcut", exact: true })).not.toBeEmpty();
  await page.getByRole("button", { name: "Right control", exact: true }).focus();
  await page.keyboard.press("i");
  await expect(action).toHaveText("jump left");
  await expect(page.getByRole("status", { name: "Pending shortcut", exact: true })).toBeEmpty();
  await page.getByRole("button", { name: "Toggle right pane", exact: true }).click();
  await page.getByRole("button", { name: "Toggle right pane", exact: true }).click();
  await page.getByRole("button", { name: "Right control", exact: true }).focus();
  await page.keyboard.press("g");
  await expect(action).toHaveText("right");
  expect(errors).toEqual([]);
});

test("a modal opened from a pane suppresses focus scopes and restores them on close", async ({ page }) => {
  await page.goto("/shortcut-panes");
  await page.getByRole("button", { name: "Outside scope", exact: true }).click();
  const action = page.getByRole("status", { name: "Scope action", exact: true });
  await expect(action).toHaveText("ready");
  await page.getByRole("button", { name: "Open pane modal", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pane modal", exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("g");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(action).toHaveText("ready");
  await expect(page.getByRole("button", { name: "Open pane modal", exact: true })).toBeFocused();
  await page.keyboard.press("g");
  await expect(action).toHaveText("left");
});

test("early focused pane drafts hydrate into the correct scope without replacement", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shortcut-panes", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Left draft", exact: true });
    await draft.fill("Early pane draft");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Outside scope", exact: true }).click();
    await draft.focus();
    release();
    const action = page.getByRole("status", { name: "Scope action", exact: true });
    await expect(action).toHaveText("ready");
    await expect(draft).toBeFocused();
    await expect(draft).toHaveValue("Early pane draft");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await page.keyboard.press("Control+j");
    await expect(action).toHaveText("jump left");
    expect(errors).toEqual([]);
  } finally { release(); }
});
