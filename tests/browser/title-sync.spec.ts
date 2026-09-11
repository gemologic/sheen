import { expect, test } from "@playwright/test";

const overviewTitle = 'Overview <Sheen> & "quotes"';

test("accepted router state owns one escaped title without remounting the shell", async ({ page, request }) => {
  const response = await request.get("/title-sync");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html.match(/<title\b/g)).toHaveLength(1);
  expect(html).toContain('Overview &lt;Sheen> &amp; "quotes"');

  await page.goto("/title-sync");
  await expect(page).toHaveTitle(overviewTitle);
  await expect(page.locator("head title")).toHaveCount(1);
  const shell = page.locator(".sheen-app-shell");
  await shell.evaluate(element => element.setAttribute("data-retained", "true"));
  await page.getByRole("link", { name: "Open orders", exact: true }).click();
  await expect(page).toHaveURL(/\/title-sync\?view=orders$/);
  await expect(page).toHaveTitle("Orders · Sheen");
  await expect(shell).toHaveAttribute("data-retained", "true");
  await page.goBack();
  await expect(page).toHaveURL(/\/title-sync$/);
  await expect(page).toHaveTitle(overviewTitle);
  await page.goForward();
  await expect(page).toHaveTitle("Orders · Sheen");
  await page.getByRole("button", { name: "Unmount shell", exact: true }).click();
  await expect(shell).toHaveCount(0);
  await expect(page).toHaveTitle("Loupe · Sheen");
});

test("blocked destinations cannot update the accepted title", async ({ page }) => {
  await page.goto("/title-sync");
  await page.getByRole("textbox", { name: "Title fixture draft", exact: true }).fill("dirty");
  const link = page.getByRole("link", { name: "Open orders", exact: true });
  await link.click();
  const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await expect(prompt).toBeVisible();
  await expect(page).toHaveURL(/\/title-sync$/);
  await expect(page).toHaveTitle(overviewTitle);
  await page.keyboard.press("Escape");
  await expect(link).toBeFocused();
  await page.getByRole("button", { name: "Save title fixture", exact: true }).click();
  await link.click();
  await expect(page).toHaveURL(/\/title-sync\?view=orders$/);
  await expect(page).toHaveTitle("Orders · Sheen");
});

test("route title remains stable while delayed scripts hydrate the server document", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/title-sync", { waitUntil: "commit" });
    await expect(page).toHaveTitle(overviewTitle);
    const shell = page.locator(".sheen-app-shell");
    await shell.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const frames = await page.evaluate(async () => {
      const titles: string[] = [];
      for (let index = 0; index < 12; index++) await new Promise<void>(resolve => requestAnimationFrame(() => { titles.push(document.title); resolve(); }));
      return titles;
    });
    expect(new Set(frames)).toEqual(new Set([overviewTitle]));
    await expect(shell).toHaveAttribute("data-server", "retained");
    await expect(page.locator("head title")).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
