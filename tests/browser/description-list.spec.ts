import { expect, test } from "@playwright/test";

test("events during a delayed lazy route preserve server DOM and replay once", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/src/routes/description-list.tsx*", async route => { await barrier; await route.continue(); });
  try {
    await page.goto("/description-list", { waitUntil: "commit" });
    await expect.poll(() => page.evaluate(() => "_$DX_DELEGATE" in document)).toBe(true);
    const input = page.getByLabel("Order notes");
    await input.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await input.hover();
    await input.fill("Typed while route module loads");
    await page.getByRole("button", { name: "Toggle layout" }).click();
    release();
    await expect(page.locator("dl")).toHaveAttribute("data-layout", "columns");
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    await expect(input).toHaveValue("Typed while route module loads");
    await page.getByRole("button", { name: "Toggle layout" }).click();
    await expect(page.locator("dl")).toHaveAttribute("data-layout", "stacked");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("description lists retain native semantics, wrap long values, and change layout without losing drafts", async ({ page }) => {
  await page.goto("/description-list");
  const list = page.locator('dl[aria-label="Order details"]');
  const term = list.locator("dt").first();
  const details = list.locator("dd").first();
  await expect(list).toHaveAttribute("data-layout", "stacked");
  await expect(page.locator("[data-description-sample]")).toHaveScreenshot("description-stacked-dark.png");
  await expect(list.getByText("Not displayed")).toBeHidden();
  await expect(list.locator("dd[data-numeric]")).toHaveCSS("font-variant-numeric", "tabular-nums");
  const input = page.getByLabel("Order notes");
  await input.fill("Keep this draft");
  await input.evaluate(element => element.setAttribute("data-identity", "retained"));
  await page.getByRole("button", { name: "Toggle layout" }).click();
  await expect(list).toHaveAttribute("data-layout", "columns");
  const nameBox = await term.boundingBox();
  const valueBox = await details.boundingBox();
  if (!nameBox || !valueBox) throw new Error("Description pair missing");
  expect(nameBox.y).toEqual(valueBox.y);
  expect(nameBox.x).toBeLessThan(valueBox.x);
  await page.getByRole("button", { name: "Toggle direction" }).click();
  const rtlName = await term.boundingBox();
  const rtlValue = await details.boundingBox();
  if (!rtlName || !rtlValue) throw new Error("RTL description pair missing");
  expect(rtlName.x).toBeGreaterThan(rtlValue.x);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(input).toHaveValue("Keep this draft");
  await expect(input).toHaveAttribute("data-identity", "retained");
  await expect(page.locator("[data-description-sample]")).toHaveScreenshot("description-columns-light-rtl.png");
  await page.setViewportSize({ width: 375, height: 800 });
  const overflow = await list.evaluate(element => element.scrollWidth > element.clientWidth);
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "Toggle theme" }).focus();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
});

test("description lists hydrate existing names, values, and inputs without replacement", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/description-list", { waitUntil: "commit" });
    const list = page.locator("dl");
    await expect(list).toBeVisible();
    await list.locator("dt, dd, input").evaluateAll(elements => {
      for (const element of elements) element.setAttribute("data-server-identity", "retained");
    });
    const originalCount = await list.locator("[data-server-identity]").count();
    const bounds = await list.boundingBox();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(list.locator("[data-server-identity]")).toHaveCount(originalCount);
    expect(await list.boundingBox()).toEqual(bounds);
    expect(errors).toEqual([]);
  } finally { release(); }
});
