import { expect, test } from "@playwright/test";

test("logical-side panels use scoped portals, trap focus, dismiss, and restore their trigger", async ({ page }) => {
  await page.goto("/drawer");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const startTrigger = page.getByRole("button", { name: "Open start drawer" });
  await startTrigger.click();
  const scopedPortal = page.locator('[data-sheen-portal="scope"][data-sheen-theme="paper"]');
  const drawer = scopedPortal.getByRole("dialog", { name: "Start panel" });
  await expect(drawer).toBeVisible();
  const startBox = await drawer.boundingBox();
  if (!startBox) throw new Error("Expected start drawer geometry");
  expect(startBox.x).toBeLessThanOrEqual(1);
  expect(Math.abs(startBox.height - await page.evaluate(() => innerHeight))).toBeLessThanOrEqual(1);
  await page.getByRole("textbox", { name: "Drawer field" }).fill("retained draft");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(startTrigger).toBeFocused();

  const endTrigger = page.getByRole("button", { name: "Open end sheet" });
  await endTrigger.click();
  const sheet = scopedPortal.getByRole("dialog", { name: "End panel" });
  const endBox = await sheet.boundingBox();
  if (!endBox) throw new Error("Expected end sheet geometry");
  const width = await page.evaluate(() => innerWidth);
  expect(Math.abs(endBox.x + endBox.width - width)).toBeLessThanOrEqual(1);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(endTrigger).toBeFocused();

  await page.getByRole("button", { name: "Toggle panel direction" }).click();
  await startTrigger.click();
  const rtlStartBox = await drawer.boundingBox();
  if (!rtlStartBox) throw new Error("Expected RTL start drawer geometry");
  expect(Math.abs(rtlStartBox.x + rtlStartBox.width - width)).toBeLessThanOrEqual(1);
});

test("drawer trigger hydrates in place before opening the scoped panel", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/drawer", { waitUntil: "commit" });
    const trigger = page.getByRole("button", { name: "Open start drawer" });
    await expect(trigger).toBeVisible();
    await trigger.evaluate(element => element.setAttribute("data-server-trigger", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(trigger).toHaveAttribute("data-server-trigger", "retained");
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Start panel" });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
