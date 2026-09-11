import { expect, test } from "@playwright/test";

test("navigation refresh preserves reordered link focus and recovers removed-link focus", async ({ page }) => {
  await page.goto("/nav-list-refresh");
  const nav = page.getByRole("navigation", { name: "Dynamic navigation", exact: true });
  const two = nav.getByRole("link", { name: "Two", exact: true });
  await page.getByRole("button", { name: "Reverse links", exact: true }).click();
  await two.focus();
  await two.evaluate(element => element.setAttribute("data-retained", "yes"));
  await expect(nav.getByRole("link").first()).toHaveText("Three");
  await expect(two).toBeFocused();
  await expect(two).toHaveAttribute("data-retained", "yes");
  await page.getByRole("button", { name: "Remove Two", exact: true }).click();
  await two.focus();
  await expect(two).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "One", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Clear links", exact: true }).click();
  await nav.getByRole("link", { name: "One", exact: true }).focus();
  await expect(nav.getByRole("link")).toHaveCount(0);
  await expect(nav).toBeFocused();
  await expect(nav).toHaveCSS("outline-style", "solid");
});

test("navigation removal leaves deliberate outside focus alone", async ({ page }) => {
  await page.goto("/nav-list-refresh");
  await page.getByRole("button", { name: "Remove Two", exact: true }).click();
  const outside = page.getByRole("textbox", { name: "Outside draft", exact: true });
  await outside.fill("Keep focus here");
  await expect(page.getByRole("link", { name: "Two", exact: true })).toHaveCount(0);
  await expect(outside).toBeFocused();
});

test("navigation presentation keeps focus visible and mirrors current-page markers in RTL", async ({ page }) => {
  await page.setViewportSize({ width: 850, height: 650 });
  await page.goto("/nav-list");
  const nav = page.getByRole("navigation", { name: "Workspace", exact: true });
  const overview = nav.getByRole("link", { name: "Overview", exact: true });
  await overview.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(overview).toHaveCSS("outline-style", "solid");
  await expect(overview).toHaveCSS("border-left-width", "2px");
  const scoped = page.getByRole("navigation", { name: "Scoped workspace", exact: true });
  await expect(scoped).toHaveCSS("direction", "rtl");
  const current = scoped.getByRole("link", { name: "Scoped overview", exact: true });
  await expect(current).toHaveCSS("border-right-width", "2px");
  await expect(scoped).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("navigation-dark-light-rtl.png");
  await page.setViewportSize({ width: 375, height: 750 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("navigation lists retain native keyboard links, current state, and refreshed identities", async ({ page }) => {
  await page.goto("/nav-list");
  const nav = page.getByRole("navigation", { name: "Workspace", exact: true });
  const activity = nav.getByRole("link", { name: "Activity", exact: true });
  await page.getByRole("textbox", { name: "Retained draft", exact: true }).fill("Keep this draft");
  await activity.evaluate(element => element.setAttribute("data-retained", "yes"));
  await nav.getByRole("link", { name: "Overview", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(activity).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#activity$/);
  await expect(activity).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Overview", exact: true })).not.toHaveAttribute("aria-current");
  await expect(page.getByRole("textbox", { name: "Retained draft", exact: true })).toHaveValue("Keep this draft");
  await page.getByRole("button", { name: "Refresh navigation", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Updated activity", exact: true })).toHaveAttribute("data-retained", "yes");
  const popupPromise = page.waitForEvent("popup");
  await nav.getByRole("link", { name: "Open reference", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/\/nav-list#reference$/);
  await popup.close();
});

test("navigation links hydrate without replacing server links or drafts", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/nav-list", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Retained draft", exact: true });
    await draft.fill("Before hydration");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    const activity = page.getByRole("navigation", { name: "Workspace", exact: true }).getByRole("link", { name: "Activity", exact: true });
    await activity.evaluate(element => element.setAttribute("data-server", "retained"));
    await activity.click();
    await expect(page).toHaveURL(/#activity$/);
    release();
    await expect(activity).toHaveAttribute("aria-current", "page");
    await expect(activity).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveValue("Before hydration");
    await expect(draft).toHaveAttribute("data-server", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
