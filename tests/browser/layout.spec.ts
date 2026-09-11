import { test, expect } from "@playwright/test";

test("layout primitives use token spacing, wrap, respect native props, and retain logical keyboard order", async ({ page }) => {
  await page.goto("/layout");
  const sample = page.locator('.layout-sample[data-sheen-theme="obsidian"]');
  await expect(sample.locator("[data-stack]")).toHaveCSS("row-gap", "12px");
  await expect(sample.locator("[data-row]")).toHaveCSS("column-gap", "8px");
  await expect(sample.locator("[data-container]")).toHaveCSS("padding-inline-start", "8px");
  await expect(sample.locator("[data-container]")).toHaveCSS("padding-block-start", "12px");
  await expect(sample.locator("[data-container]")).toHaveClass(/layout-container/);
  await expect(sample.locator("[data-grid]")).toHaveAttribute("data-columns", "2");
  await expect(sample.locator("[data-cluster]")).toHaveCSS("flex-wrap", "wrap");
  const review = await sample.getByRole("button", { name: "Review" }).boundingBox();
  const download = await sample.getByRole("button", { name: "Download" }).boundingBox();
  if (!review || !download) throw new Error("Missing cluster children");
  expect(download.y).toBeGreaterThan(review.y);
  const center = await sample.locator("[data-center]").boundingBox();
  const content = await sample.getByText("Centered content").boundingBox();
  if (!center || !content) throw new Error("Missing centered content");
  expect(Math.abs((content.y + content.height / 2) - (center.y + center.height / 2))).toBeLessThan(1);
  expect(Math.abs((content.x + content.width / 2) - (center.x + center.width / 2))).toBeLessThan(1);
  await expect(sample.locator("[data-spacer]")).toHaveAttribute("aria-hidden", "true");
  await sample.getByRole("button", { name: "First", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(sample.getByRole("button", { name: "Last", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(sample.getByRole("status")).toHaveText("Activations 1");
  const input = sample.getByLabel("obsidian first name");
  await input.fill("Preserved draft");
  await input.evaluate(element => element.setAttribute("data-identity", "original"));
  await page.getByRole("button", { name: "Toggle density" }).click();
  await expect(sample.locator("[data-stack]")).toHaveCSS("row-gap", "8px");
  await expect(sample.locator("[data-row]")).toHaveCSS("column-gap", "6px");
  await expect(sample.locator("[data-container]")).toHaveCSS("padding-inline-start", "6px");
  await page.getByRole("button", { name: "Toggle columns" }).click();
  await expect(sample.locator("[data-grid]")).toHaveAttribute("data-columns", "3");
  const tracks = await sample.locator("[data-grid]").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" "));
  expect(tracks).toHaveLength(3);
  await page.getByRole("button", { name: "Toggle direction" }).click();
  const first = await sample.getByRole("button", { name: "First", exact: true }).boundingBox();
  const last = await sample.getByRole("button", { name: "Last", exact: true }).boundingBox();
  if (!first || !last) throw new Error("Missing row children");
  expect(first.x).toBeGreaterThan(last.x);
  await sample.getByRole("button", { name: "First", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(sample.getByRole("button", { name: "Last", exact: true })).toBeFocused();
  await expect(input).toHaveValue("Preserved draft");
  await expect(input).toHaveAttribute("data-identity", "original");
  await page.getByRole("button", { name: "Toggle hidden" }).click();
  await expect(sample.locator("[data-hidden]")).toBeHidden();
});

test("layout hydration reuses server markup and visual layout remains stable", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto("/layout", { waitUntil: "commit" });
    const input = page.getByLabel("obsidian first name");
    await expect(input).toBeVisible();
    await input.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    const before = await page.locator(".layout-gallery").boundingBox();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    expect(await page.locator(".layout-gallery").boundingBox()).toEqual(before);
    expect(errors).toEqual([]);
    await expect(page.locator(".layout-gallery")).toHaveScreenshot("layout-comfortable.png");
    await page.getByRole("button", { name: "Toggle density" }).click();
    await page.getByRole("button", { name: "Toggle direction" }).click();
    await expect(page.locator(".layout-gallery")).toHaveScreenshot("layout-compact-rtl.png");
  } finally { release(); }
});
