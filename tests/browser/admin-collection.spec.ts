import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`Accounts has one collection heading and bounded native controls at ${width}px`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/admin/accounts");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const collection = page.locator(".sheen-data-table-page");
    await expect(collection.getByRole("heading", { level: 1, name: "Accounts", exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(collection.getByPlaceholder("Search accounts", { exact: true })).toHaveCount(1);
    await expect(collection.getByRole("navigation", { name: "Pagination", exact: true })).toHaveCount(1);
    await expect(page.getByRole("group", { name: "Operational summary" })).toHaveCount(0);
    const geometry = await collection.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const content = element.querySelector(".sheen-data-table-page-content")?.getBoundingClientRect();
      if (!content) throw new Error("Missing collection content");
      return { bottomGap: bounds.bottom - content.bottom, overflow: document.documentElement.scrollWidth > innerWidth, height: content.height };
    });
    expect(Math.abs(geometry.bottomGap)).toBeLessThan(2);
    expect(geometry.overflow).toBe(false);
    expect(geometry.height).toBeGreaterThan(500);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (browserName === "chromium") await expect(page).toHaveScreenshot(`admin-collection-${width}.png`, { animations: "disabled" });
  });
}

test("collection and long-name details retain accepted owners through failed refresh and retry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/accounts?content=long&refresh=fail-first");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const collection = page.locator(".sheen-data-table-page");
  const row = collection.locator('tr[data-row-id="account-0001"]');
  await row.focus();
  await row.press("Enter");
  const details = page.locator(".sheen-admin-details-owner");
  const title = details.getByRole("heading", { name: "Northstar International Research and Reliability Operations, Enterprise Production Account", exact: true });
  await expect(title).toBeVisible();
  expect(await title.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const note = details.getByRole("textbox", { name: "Account note", exact: true });
  await note.fill("Keep this collection draft");
  await collection.evaluate(element => element.setAttribute("data-retained", "yes"));
  await row.evaluate(element => element.setAttribute("data-retained", "yes"));
  await note.evaluate(element => element.setAttribute("data-retained", "yes"));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await note.focus();
  await expect(collection).toHaveAttribute("data-phase", "refresh");
  const samples = await collection.evaluate(async element => {
    const frames: boolean[] = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const row = element.querySelector('tr[data-row-id="account-0001"]');
      const note = document.querySelector('input[data-retained="yes"]');
      frames.push(element.isConnected && row?.getAttribute("data-retained") === "yes" && note instanceof HTMLInputElement && note.value === "Keep this collection draft" && document.activeElement === note && getComputedStyle(row).visibility === "visible");
    }
    return frames;
  });
  expect(samples.every(Boolean)).toBe(true);
  await expect(page.locator('.loupe-admin-refresh-error[role="alert"]')).toBeVisible();
  await expect(collection).toHaveAttribute("data-retained", "yes");
  await page.getByRole("button", { name: "Retry refresh", exact: true }).click();
  await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
  await expect(row).toHaveAttribute("data-retained", "yes");
  await expect(note).toHaveAttribute("data-retained", "yes");
  await expect(note).toHaveValue("Keep this collection draft");
  await expect(title).toBeVisible();
});

test("collection layout and rows survive delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/admin/accounts", { waitUntil: "commit" });
    const collection = page.locator(".sheen-data-table-page");
    const row = collection.locator('tr[data-row-id="account-0001"]');
    await collection.evaluate(element => element.setAttribute("data-server", "yes"));
    await row.evaluate(element => element.setAttribute("data-server", "yes"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(collection).toHaveAttribute("data-server", "yes");
    await expect(row).toHaveAttribute("data-server", "yes");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("collection, registry, settings, and grouped activity share chrome while retaining distinct page structures", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/accounts");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const shell = page.locator(".sheen-admin-app");
  await shell.evaluate(element => element.setAttribute("data-retained-shell", "yes"));
  await page.getByRole("button", { name: "Configuration", exact: true }).click();
  await page.getByRole("link", { name: "Access policies", exact: true }).click();
  await expect(page.getByRole("form", { name: "Create policy", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Policies", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-data-table-page")).toHaveCount(0);
  await expect(shell).toHaveAttribute("data-retained-shell", "yes");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.locator(".sheen-settings-layout")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
  await expect(shell).toHaveAttribute("data-retained-shell", "yes");
  await page.getByRole("link", { name: "Audit log", exact: true }).click();
  await expect(page.locator(".loupe-admin-audit-day")).toHaveCount(4);
  await expect(page.locator(".loupe-admin-audit li")).toHaveCount(80);
  const pane = page.locator(".loupe-admin-content");
  const today = page.getByRole("heading", { name: "Today", exact: true });
  await pane.evaluate(element => { element.scrollTop = 200; });
  await expect(pane).toHaveJSProperty("scrollTop", 200);
  const before = await today.boundingBox();
  await pane.evaluate(element => { element.scrollTop = 280; });
  await expect(pane).toHaveJSProperty("scrollTop", 280);
  const after = await today.boundingBox();
  const bounds = await pane.boundingBox();
  if (!before || !after || !bounds) throw new Error("Missing sticky day heading");
  expect(Math.abs(before.y - after.y)).toBeLessThan(1);
  expect(after.y).toBeGreaterThanOrEqual(bounds.y - 1);
  expect(after.y + after.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  await expect(today).toBeVisible();
  await expect(shell).toHaveAttribute("data-retained-shell", "yes");
});
