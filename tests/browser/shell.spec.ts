import { expect, test } from "@playwright/test";

test("shell paints constrained panes before JavaScript and hydrates without resetting them", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 });
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shell", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
    const content = page.getByRole("region", { name: "Workspace content", exact: true });
    await expect(content).toHaveCSS("overflow-anchor", "none");
    expect(await content.evaluate(element => element.clientHeight)).toBeLessThan(720);
    await content.getByRole("textbox").fill("Before hydration");
    await content.evaluate(element => element.setAttribute("data-server", "retained"));
    await content.evaluate(element => { element.scrollTop = 400; });
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(400);
    const before = await content.evaluate(element => element.scrollTop);
    await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
    release();
    await expect(content).toContainText("Row 1: refreshed");
    await expect(content).toHaveAttribute("data-server", "retained");
    expect(await content.getByRole("textbox").inputValue()).toBe("Before hydration");
    expect(await content.evaluate(element => element.scrollTop)).toBe(before);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("desktop shell constrains independent panes while chrome and refreshed content stay put", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.goto("/shell");
  const content = page.getByRole("region", { name: "Workspace content", exact: true });
  const sidebar = page.getByRole("region", { name: "Sidebar navigation", exact: true });
  await expect(page.getByRole("main")).toHaveCSS("padding", "0px");
  await expect(page.getByRole("main")).toHaveCSS("overflow", "hidden");
  await content.getByRole("textbox").fill("Retained workspace draft");
  await content.evaluate(element => element.setAttribute("data-retained", "yes"));
  const header = await page.getByRole("banner").boundingBox();
  const status = await page.getByRole("contentinfo").boundingBox();
  await content.hover();
  await page.mouse.wheel(0, 450);
  await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(300);
  await expect(content).not.toHaveAttribute("data-scrolling");
  const before = await content.evaluate(element => element.scrollTop);
  expect(await sidebar.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await expect(content).toContainText("Row 1: refreshed");
  expect(await content.evaluate(element => element.scrollTop)).toBe(before);
  await expect(content).toHaveAttribute("data-retained", "yes");
  expect(await content.getByRole("textbox").inputValue()).toBe("Retained workspace draft");
  expect(await page.getByRole("banner").boundingBox()).toEqual(header);
  expect(await page.getByRole("contentinfo").boundingBox()).toEqual(status);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  await sidebar.hover();
  await page.mouse.wheel(0, 350);
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBeGreaterThan(200);
  expect(await content.evaluate(element => element.scrollTop)).toBe(before);
});

test("phone shell permits document flow instead of trapping content in desktop panes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 750 });
  await page.goto("/shell");
  const content = page.getByRole("region", { name: "Workspace content", exact: true });
  await expect(content).toHaveCSS("overflow", "visible");
  await expect(content).toHaveCSS("overflow-anchor", "auto");
  expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  await page.mouse.move(300, 600);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
