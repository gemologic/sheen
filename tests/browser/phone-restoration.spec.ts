import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 375, height: 750 }, hasTouch: true });

for (const outcome of ["growth", "short", "wheel", "touch"]) {
  test(`pending phone restoration with ${outcome} result or interruption`, async ({ page }) => {
    await page.goto("/pane-restoration?page=a");
    const main = page.getByRole("region", { name: "Restored content", exact: true });
    await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
    await expect(main).toContainText("revision 1");
    await page.getByRole("button", { name: "Toggle restored sidebar", exact: true }).click();
    await page.getByRole("link", { name: "Page B", exact: true }).click();
    await page.goBack();
    await page.mouse.move(300, 600);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
    await page.goForward();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.getByRole("button", { name: outcome === "short" ? "Load short Page A" : "Load Page A slowly", exact: true }).click();
    await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("true");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    if (outcome === "wheel") {
      await page.mouse.move(300, 600);
      await page.mouse.wheel(0, 100);
    }
    if (outcome === "touch") await page.touchscreen.tap(300, 600);
    await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("false");
    if (outcome === "short") {
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await page.getByRole("button", { name: "Expand rows", exact: true }).click();
    }
    await expect(main).toContainText("Content 100");
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(outcome === "growth" ? 700 : 0);
  });
}

test("shell disposal restores the prior native history restoration setting", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(page.getByRole("region", { name: "Restored content", exact: true })).toContainText("revision 1");
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("manual");
  await page.getByRole("button", { name: "Remove shell", exact: true }).click();
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("auto");
  // Remount under a different real browser setting, then verify exact restoration on disposal.
  await page.evaluate(() => { history.scrollRestoration = "manual"; });
  await page.getByRole("button", { name: "Restore shell", exact: true }).click();
  await page.getByRole("button", { name: "Remove shell", exact: true }).click();
  expect(await page.evaluate(() => history.scrollRestoration)).toBe("manual");
});

test("phone history restores document offsets without scrolling the desktop pane", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(main).toContainText("revision 1");
  await page.getByRole("button", { name: "Toggle restored sidebar", exact: true }).click();
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await page.goBack();
  await page.mouse.move(300, 600);
  await page.mouse.wheel(0, 700);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
  await page.goForward();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(200);
  await page.goBack();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
  await page.goForward();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(200);
  expect(await main.evaluate(element => element.scrollTop)).toBe(0);
});

test("phone hydration preserves early document scroll and server content", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/pane-restoration?page=a", { waitUntil: "commit" });
    const main = page.getByRole("region", { name: "Restored content", exact: true });
    await expect(main).toContainText("Content 100");
    await main.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
    release();
    await expect(main).toContainText("revision 1");
    await expect(main).toHaveAttribute("data-server", "retained");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
  } finally { release(); }
});

test("responsive changes keep phone and desktop restoration coordinates separate", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 750 });
  await page.goto("/pane-restoration?page=a");
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  await main.evaluate(element => element.setAttribute("data-accepted-main", "retained"));
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(main).toContainText("revision 1");
  await page.getByRole("button", { name: "Toggle restored sidebar", exact: true }).click();
  await main.evaluate(element => { element.scrollTop = 700; });
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.setViewportSize({ width: 375, height: 750 });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.mouse.move(300, 600);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(200);
  await page.setViewportSize({ width: 1100, height: 750 });
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.setViewportSize({ width: 375, height: 750 });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(200);
  await expect(main).toHaveAttribute("data-accepted-main", "retained");
});
