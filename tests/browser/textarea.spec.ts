import { expect, test } from "@playwright/test";

test("textarea hydrates native content then grows, caps, shrinks, and retains its draft", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/textarea", { waitUntil: "commit" });
    const textarea = page.getByRole("textbox", { name: "Growing notes" });
    await expect(textarea).toHaveValue("\nInitial notes");
    await textarea.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(textarea).toHaveAttribute("data-server-identity", "retained");
    await expect(textarea).toHaveValue("\nInitial notes");
    const height = () => textarea.evaluate(element => element.getBoundingClientRect().height);
    const initial = await height();
    await textarea.fill(Array.from({ length: 30 }, (_, index) => `Line ${index}`).join("\n"));
    await expect.poll(height).toBe(200);
    expect(await textarea.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    await expect(textarea).toBeFocused();
    await textarea.fill("Short");
    await expect.poll(height).toBe(initial);
    await page.getByRole("button", { name: "Replace notes" }).click();
    await expect(textarea).toHaveValue("Updated by app\nSecond line\nThird line\nFourth line");
    await expect.poll(height).toBeGreaterThan(initial);
    await page.getByRole("button", { name: "Toggle autosize" }).click();
    await expect(textarea).toHaveCSS("resize", "vertical");
    await expect.poll(height).toBe(initial);
    await expect(textarea).toHaveAttribute("data-server-identity", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("textarea remeasures wrapping and restores native reset geometry", async ({ page }) => {
  await page.goto("/textarea");
  const textarea = page.getByRole("textbox", { name: "Growing notes" });
  await textarea.fill("A long sentence that wraps across the available width. ".repeat(5));
  const height = () => textarea.evaluate(element => element.getBoundingClientRect().height);
  await expect.poll(height).toBeGreaterThan(50);
  const wide = await height();
  await page.getByRole("button", { name: "Toggle width" }).click();
  await expect.poll(height).toBeGreaterThan(wide);
  await page.getByRole("button", { name: "Toggle density" }).click();
  const compactScope = page.locator('[data-sheen-density="compact"]');
  await expect(compactScope.getByRole("textbox", { name: "Reset notes" })).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(textarea).toHaveValue("A long sentence that wraps across the available width. ".repeat(5));
  const resettable = page.getByRole("textbox", { name: "Reset notes" });
  const resetHeight = () => resettable.evaluate(element => element.getBoundingClientRect().height);
  const initial = await resetHeight();
  await resettable.fill("One\nTwo\nThree\nFour\nFive\nSix");
  await expect.poll(resetHeight).toBeGreaterThan(initial);
  await page.getByRole("button", { name: "Reset notes", exact: true }).click();
  await expect(resettable).toHaveValue("");
  await expect.poll(resetHeight).toBe(initial);
});
