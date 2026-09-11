import { expect, test } from "@playwright/test";

test("page header retains actions and tabs across title updates and RTL wrapping", async ({ page }) => {
  await page.goto("/page-header");
  const header = page.locator(".sheen-page-header").filter({ has: page.getByRole("textbox", { name: "Header draft", exact: true }) });
  const draft = header.getByRole("textbox", { name: "Header draft", exact: true });
  await draft.fill("Persistent draft");
  await header.evaluate(element => element.setAttribute("data-original", "retained"));
  await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
  await expect(header).toHaveCSS("direction", "rtl");
  await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
  await expect(header).toHaveCSS("direction", "ltr");
  await header.getByRole("tab", { name: "Active", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(header.getByRole("tab", { name: "Archived", exact: true })).toBeFocused();
  await expect(header.getByRole("tab", { name: "Archived", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Refresh title", exact: true }).click();
  await expect(header.getByRole("heading", { level: 2 })).toHaveText("Updated orders");
  await expect(header.getByRole("tab", { name: "Archived", exact: true })).toHaveAttribute("aria-selected", "true");
  await header.getByRole("button", { name: "Save header", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(header).toHaveAccessibleName("Saved orders");
  await expect(header.getByRole("button", { name: "Save header", exact: true })).toBeFocused();
  await expect(draft).toHaveValue("Persistent draft");
  await expect(header).toHaveAttribute("data-original", "retained");
  await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
  await page.setViewportSize({ width: 375, height: 750 });
  await expect(header).toHaveCSS("direction", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(page.locator(".sheen-page-header[hidden]")).toBeHidden();
});

test("page header compact variants have a reviewed dark and light RTL baseline", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 650 });
  await page.goto("/page-header");
  for (const row of await page.locator("[data-header-matrix] .sheen-page-header-row").all()) {
    await expect(row).toHaveCSS("height", "44px");
  }
  await expect(page.locator("[data-header-matrix]")).toHaveScreenshot("page-header-dark-light-rtl.png");
});

test("page header hydrates without replacing action drafts or losing replayed title updates", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/page-header", { waitUntil: "commit" });
    const header = page.getByRole("group", { name: "Orders", exact: true }).filter({ has: page.getByRole("textbox", { name: "Header draft", exact: true }) });
    const draft = header.getByRole("textbox", { name: "Header draft", exact: true });
    await draft.fill("Before hydration");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Refresh title", exact: true }).click();
    release();
    await expect(page.getByRole("heading", { name: "Updated orders", exact: true })).toBeVisible();
    const retained = page.getByRole("textbox", { name: "Header draft", exact: true });
    await expect(retained).toHaveAttribute("data-server", "retained");
    await expect(retained).toHaveValue("Before hydration");
    expect(errors).toEqual([]);
  } finally { release(); }
});
