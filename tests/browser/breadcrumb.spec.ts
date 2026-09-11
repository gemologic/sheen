import { expect, test } from "@playwright/test";

test("breadcrumb removal focuses the next ancestor or its named root without navigating", async ({ page }) => {
  await page.goto("/nav-list-refresh");
  const path = page.getByRole("navigation", { name: "Dynamic path", exact: true });
  await page.getByRole("button", { name: "Remove Two", exact: true }).click();
  await path.getByRole("link", { name: "Two", exact: true }).focus();
  await expect(path.getByRole("link", { name: "Two", exact: true })).toHaveCount(0);
  await expect(path.getByRole("link", { name: "Three", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Clear links", exact: true }).click();
  await path.getByRole("link", { name: "Three", exact: true }).focus();
  await expect(path.getByRole("link")).toHaveCount(0);
  await expect(path).toBeFocused();
  await expect(path).toHaveCSS("outline-style", "solid");
  await expect(page).toHaveURL(/\/nav-list-refresh$/);
});

test("breadcrumb focused dark and wrapping light RTL presentation", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/breadcrumb");
  const nav = page.getByRole("navigation", { name: "Breadcrumb", exact: true });
  const link = nav.getByRole("link", { name: "Workspace", exact: true });
  await link.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(link).toHaveCSS("outline-style", "solid");
  await expect(nav).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("navigation", { name: "Page hierarchy", exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("breadcrumb-dark-light-rtl.png");
});

test("breadcrumb preserves links on refresh and uses native keyboard navigation", async ({ page }) => {
  await page.goto("/breadcrumb");
  const nav = page.getByRole("navigation", { name: "Breadcrumb", exact: true });
  const link = nav.getByRole("link", { name: "Workspace", exact: true });
  await link.evaluate(element => element.setAttribute("data-retained", "yes"));
  await page.getByRole("textbox", { name: "Draft" }).fill("Keep this draft");
  await page.getByRole("button", { name: "Refresh ancestor label", exact: true }).click();
  const refreshed = nav.getByRole("link", { name: "Updated workspace", exact: true });
  await expect(refreshed).toHaveAttribute("data-retained", "yes");
  await refreshed.focus();
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Projects", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/breadcrumb#projects$/);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Current project");
  await expect(nav.getByRole("link")).toHaveCount(2);
  await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
  await expect(nav).toHaveCSS("direction", "rtl");
  await expect(refreshed).toHaveAttribute("data-retained", "yes");
  await expect(page.getByRole("textbox", { name: "Draft" })).toHaveValue("Keep this draft");
  await page.setViewportSize({ width: 375, height: 800 });
  const scoped = page.getByRole("navigation", { name: "Page hierarchy", exact: true });
  await expect(scoped).toBeInViewport({ ratio: 1 });
  expect(await scoped.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("breadcrumb hydrates server links and current page without replacement", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/breadcrumb", { waitUntil: "commit" });
    const nav = page.getByRole("navigation", { name: "Breadcrumb", exact: true });
    const link = nav.getByRole("link", { name: "Workspace", exact: true });
    await link.evaluate(element => element.setAttribute("data-server-link", "retained"));
    await nav.locator('[aria-current="page"]').evaluate(element => element.setAttribute("data-server-current", "retained"));
    await link.focus();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(link).toBeFocused();
    await expect(link).toHaveAttribute("data-server-link", "retained");
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute("data-server-current", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
