import { expect, test } from "@playwright/test";

test("Studio metrics and chart disclosure are complete without client scripts", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("Browser tests require a base URL");
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    await expect(page.locator(".loupe-admin-stat-group")).toContainText("240");
    await expect(page.locator('tbody tr[data-row-id="account-0001"]')).toBeAttached();
    const disclosure = page.locator(".sheen-chart-data").first();
    await disclosure.locator("summary").click();
    await expect(disclosure.locator("tbody tr").first()).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const motion of ["full", "os-reduced", "scope-reduced"]) {
  test(`Studio content stays complete with ${motion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion === "os-reduced" ? "reduce" : "no-preference" });
    if (motion === "scope-reduced") await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ motion: "reduced" })));
    await page.goto("/admin");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const content = page.locator("[data-admin-starter-content]");
    const animations = await content.evaluate(element => [element, ...element.querySelectorAll("*")].filter(node => getComputedStyle(node).animationName !== "none").map(node => node.className));
    expect(animations).toEqual([]);
    await expect(page.locator(".loupe-admin-stat-group")).toContainText("240");
    const scope = page.locator(".sheen-admin-scope");
    const durations = await scope.evaluate(element => {
      const style = getComputedStyle(element);
      return ["fast", "normal", "slow"].map(speed => style.getPropertyValue(`--sheen-duration-${speed}`).trim());
    });
    expect(durations).toEqual(motion === "full" ? ["120ms", "180ms", "260ms"] : ["0ms", "0ms", "0ms"]);
    const retained = await content.elementHandle();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(content).toBeVisible();
    await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
    expect(await content.evaluate((element, before) => element === before, retained)).toBe(true);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS("animation-duration", motion === "full" ? "0.18s" : "0s");
    if (motion === "full") {
      const retainedDrawer = await drawer.elementHandle();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(drawer).toHaveCSS("animation-duration", "0s");
      expect(await drawer.evaluate((element, before) => element === before, retainedDrawer)).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
  });
}
