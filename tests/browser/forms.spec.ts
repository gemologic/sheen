import { expect, test } from "@playwright/test";

test("field hydration and validation retain control identity, focus, and descriptive associations", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/forms", { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Account", exact: true });
    await expect(input).toBeVisible();
    await input.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    const id = await input.getAttribute("id");
    const grouped = page.getByRole("textbox", { name: "Amount", exact: true });
    await grouped.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    const search = page.getByRole("searchbox", { name: "Uncontrolled search" });
    await search.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(input).toHaveAttribute("id", id ?? "");
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    await expect(grouped).toHaveAttribute("data-server-identity", "retained");
    await expect(search).toHaveAttribute("data-server-identity", "retained");
    await expect(search).toHaveValue("ETH");
    await expect(input).toHaveAccessibleDescription("Enter the account name.");
    await input.fill("Draft account");
    await input.press("F8");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription("Enter the account name. Account is unavailable.");
    await expect(input).toBeFocused();
    await expect(input).toHaveValue("Draft account");
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    await input.press("F8");
    await expect(input).not.toHaveAttribute("aria-invalid");
    await expect(input).toHaveAccessibleDescription("Enter the account name.");
    await page.getByText("Notes", { exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Notes" })).toBeFocused();
    await expect(page.getByLabel("Disabled account")).toBeDisabled();
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("search inputs preserve ownership and clear with keyboard focus restoration", async ({ page }) => {
  await page.goto("/forms");
  const uncontrolled = page.getByRole("searchbox", { name: "Uncontrolled search" });
  await uncontrolled.fill("Orders");
  await expect(uncontrolled).toHaveValue("Orders");
  await expect(page.locator("output")).toContainText("input events: 1");
  await page.keyboard.press("Tab");
  const clear = page.locator(".sheen-field").filter({ has: uncontrolled }).locator(".sheen-search-input-clear");
  await expect(clear).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(uncontrolled).toHaveValue("");
  await expect(uncontrolled).toBeFocused();
  await expect(clear).toBeDisabled();
  const controlled = page.getByRole("searchbox", { name: "Controlled search", exact: true });
  await controlled.fill("SOL");
  await expect(page.locator("output")).toContainText("Query: SOL");
  await page.locator(".sheen-field").filter({ has: controlled }).getByRole("button", { name: "Clear search" }).click();
  await expect(controlled).toHaveValue("");
  await expect(controlled).toBeFocused();
  const fixed = page.getByRole("searchbox", { name: "Fixed search" });
  await fixed.fill("Rejected");
  await expect(fixed).toHaveValue("Fixed");
});

test("input addons preserve keyboard order, draft identity, and logical placement", async ({ page }) => {
  await page.goto("/forms");
  const input = page.getByRole("textbox", { name: "Amount", exact: true });
  await input.fill("123.45");
  await input.evaluate(element => element.setAttribute("data-identity", "retained"));
  const action = page.getByRole("button", { name: "Change unit" });
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(input).toHaveAccessibleDescription("Amount in EUR");
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  const beforeInput = await input.boundingBox();
  const beforeAction = await action.boundingBox();
  if (!beforeInput || !beforeAction) throw new Error("Missing group controls");
  expect(beforeAction.x).toBeLessThan(beforeInput.x);
  await page.getByRole("button", { name: "Toggle group direction" }).click();
  const afterInput = await input.boundingBox();
  const afterAction = await action.boundingBox();
  if (!afterInput || !afterAction) throw new Error("Missing RTL group controls");
  expect(afterAction.x).toBeGreaterThan(afterInput.x);
  await expect(input).toHaveValue("123.45");
  await expect(input).toHaveAttribute("data-identity", "retained");
});

test("native form reset synchronizes uncontrolled search state and retains controlled ownership", async ({ page }) => {
  await page.goto("/forms");
  const form = page.getByRole("form", { name: "Search reset fixture" });
  const input = form.getByRole("searchbox", { name: "Resettable search" });
  const controlled = form.getByRole("searchbox", { name: "Controlled reset search" });
  const initial = form.getByRole("searchbox", { name: "Initial search" });
  const clear = form.locator(".sheen-field").filter({ has: page.getByRole("searchbox", { name: "Resettable search" }) }).locator(".sheen-search-input-clear");
  await input.fill("Draft query");
  await controlled.fill("SOL");
  await initial.fill("BTC");
  await expect(page.locator("[data-reset-query]")).toHaveText("BTC");
  await expect(clear).toBeEnabled();
  await form.getByRole("button", { name: "Reset searches" }).click();
  await expect(input).toHaveValue("");
  await expect(clear).toBeDisabled();
  await expect(controlled).toHaveValue("SOL");
  await expect(initial).toHaveValue("ETH");
  await expect(page.locator("[data-reset-query]")).toHaveText("ETH");
  await input.fill("Retain canceled reset");
  await page.getByRole("button", { name: "Toggle reset prevention" }).click();
  await form.getByRole("button", { name: "Reset searches" }).click();
  await expect(input).toHaveValue("Retain canceled reset");
  await expect(clear).toBeEnabled();
});

test("native IME composition remains visible until a controlled search accepts or rejects the commit", async ({ page, context }) => {
  await page.goto("/forms");
  const input = page.getByRole("searchbox", { name: "Fixed search" });
  await input.focus();
  await input.selectText();
  await input.evaluate(element => element.addEventListener("input", event => {
    if (event instanceof InputEvent) {
      element.setAttribute("data-native-composing", String(event.isComposing && event.isTrusted));
    }
  }));
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
    await expect(input).toHaveAttribute("data-native-composing", "true");
    await expect(input).toHaveValue("にほん");
    await expect(page.locator(".sheen-field").filter({ has: input }).locator(".sheen-search-input-clear")).toBeDisabled();
    await cdp.send("Input.insertText", { text: "日本" });
    await expect(input).toHaveValue("Fixed");
    await expect(input).toBeFocused();
    for (const name of ["Uncontrolled search", "Controlled search"]) {
      const editable = page.getByRole("searchbox", { name, exact: true });
      await editable.focus();
      await editable.selectText();
      await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
      await expect(editable).toHaveValue("にほん");
      await cdp.send("Input.insertText", { text: "日本" });
      await expect(editable).toHaveValue("日本");
      await expect(editable).toBeFocused();
    }
    await expect(page.locator("output")).toContainText("Query: 日本");
  } finally { await cdp.detach(); }
});
