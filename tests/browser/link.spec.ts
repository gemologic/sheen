import { expect, test } from "@playwright/test";

test.describe("native links without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("server links navigate without hydration or an app router", async ({ page }) => {
    await page.goto("/link");
    const link = page.getByRole("link", { name: "Destination", exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#destination$/);
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "New tab destination", exact: true }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/#new-tab$/);
    await popup.close();
  });
});

test("links preserve native keyboard navigation and reactive anchor identity", async ({ page }) => {
  await page.goto("/link");
  await page.getByRole("button", { name: "Ready action", exact: true }).click();
  await expect(page.getByRole("status", { name: "Link fixture count" })).toHaveText("1");
  const link = page.getByRole("link", { name: "Destination", exact: true });
  await link.evaluate(element => element.setAttribute("data-retained", "true"));
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  expect(await link.evaluate(element => element.matches(":focus-visible"))).toBe(true);
  await expect(link).toHaveCSS("outline-style", "solid");
  await link.press("Space");
  await expect(page).toHaveURL(/\/link$/);
  await link.press("Enter");
  await expect(page).toHaveURL(/#destination$/);
  await page.getByRole("button", { name: "Toggle link appearance", exact: true }).click();
  await expect(link).toHaveAttribute("data-link-variant", "button");
  await expect(link).toHaveAttribute("data-retained", "true");
  await expect(link).toHaveCSS("display", "inline-flex");
  await page.getByRole("button", { name: "Toggle link destination", exact: true }).click();
  await expect(link).toHaveAttribute("href", "/link#alternate");
  await link.press("Space");
  await expect(page).toHaveURL(/#destination$/);
  await link.press("Enter");
  await expect(page).toHaveURL(/#alternate$/);
  await expect(link).toHaveAttribute("data-retained", "true");
  await page.getByRole("link", { name: "Intercepted destination", exact: true }).click();
  await expect(page.getByRole("status", { name: "Link fixture count" })).toHaveText("2");
  await expect(page).toHaveURL(/#alternate$/);
});

test("links preserve native new tabs, modified clicks, and downloads", async ({ page, context }) => {
  await page.goto("/link");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "New tab destination", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/#new-tab$/);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true);
  await popup.close();
  const modifiedPromise = context.waitForEvent("page");
  const destination = page.getByRole("link", { name: "Destination", exact: true });
  await expect(destination).toHaveAttribute("href", "/link#destination");
  await destination.click({ modifiers: ["ControlOrMeta"] });
  const modified = await modifiedPromise;
  await modified.close();
  await expect(page).toHaveURL(/\/link$/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download report", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sheen-report.txt");
  expect(await download.failure()).toBeNull();
});

test("hydration reuses native server links without duplicating handlers", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/link", { waitUntil: "commit" });
    const link = page.getByRole("link", { name: "Destination", exact: true });
    await link.evaluate(element => element.setAttribute("data-server", "retained"));
    await expect(link).toHaveAttribute("href", "/link#destination");
    release();
    await page.getByRole("button", { name: "Ready action", exact: true }).click();
    await expect(page.getByRole("status", { name: "Link fixture count" })).toHaveText("1");
    await expect(link).toHaveAttribute("data-server", "retained");
    await page.getByRole("link", { name: "Intercepted destination", exact: true }).press("Enter");
    await expect(page.getByRole("status", { name: "Link fixture count" })).toHaveText("2");
    await expect(page).toHaveURL(/\/link$/);
  } finally { release(); }
});
