import { expect, test } from "@playwright/test";

test("exiting notifications are inert and retained until their real animation finishes", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Queue two", exact: true }).click();
  const region = page.getByRole("region", { name: "Notifications", exact: true });
  const entry = region.locator(".sheen-toast-entry").first();
  await entry.evaluate(element => {
    element.addEventListener("animationstart", event => {
      if (event instanceof AnimationEvent && event.animationName === "sheen-dialog-exit") {
        for (const animation of element.getAnimations()) animation.pause();
      }
    });
  });
  await entry.getByRole("button", { name: "Close", exact: true }).click();
  await expect(entry).toHaveAttribute("data-open", "false");
  await expect(entry).toHaveAttribute("aria-hidden", "true");
  await expect(entry).toHaveAttribute("inert", "");
  await expect.poll(() => entry.evaluate(element => element.getAnimations().some(animation => animation.playState === "paused"))).toBe(true);
  await expect(region.getByRole("group")).toHaveCount(0);
  await entry.evaluate(element => { for (const animation of element.getAnimations()) animation.play(); });
  await expect(region.getByRole("group", { name: "Queued notification", exact: true })).toBeVisible();
  await expect(region.locator('.sheen-toast-entry[data-open="false"]')).toHaveCount(0);
});

test("notification stacks remain bounded, preserve siblings, and follow logical placement", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Show stack", exact: true }).click();
  const region = page.getByRole("region", { name: "Notifications", exact: true });
  await expect(region.getByRole("group")).toHaveCount(3);
  await expect(region).toBeInViewport({ ratio: 1 });
  const bounds = await region.boundingBox();
  if (!bounds) throw new Error("Notification stack missing");
  expect(bounds.x).toBeGreaterThan(550);
  expect(bounds.y).toBeGreaterThan(450);
  const saved = region.getByRole("group", { name: "Saved changes", exact: true });
  await saved.evaluate(element => element.setAttribute("data-retained", "yes"));
  await saved.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(saved.getByRole("button", { name: "Close", exact: true })).toHaveCSS("outline-style", "solid");
  await expect(region).toHaveScreenshot("toaster-dark-stack.png");
  await region.getByRole("group", { name: "Background sync", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await expect(region.locator(".sheen-toast-entry")).toHaveCount(2);
  await expect(saved).toHaveAttribute("data-retained", "yes");
  await expect(page.getByRole("button", { name: "Show stack", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Clear root notifications", exact: true }).click();
  await expect(region.locator(".sheen-toast-entry")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Open scoped dialog", exact: true }).click();
  await page.getByRole("button", { name: "Show scoped notification", exact: true }).click();
  await page.keyboard.press("Escape");
  const scoped = page.getByRole("region", { name: "Scoped notices", exact: true });
  await expect(scoped).toBeInViewport({ ratio: 1 });
  await expect(scoped).toHaveCSS("direction", "rtl");
  await expect(scoped.locator(".sheen-toast-entry")).toHaveCSS("animation-duration", "0s");
  const rtlBounds = await scoped.boundingBox();
  if (!rtlBounds) throw new Error("Scoped notification missing");
  expect(rtlBounds.x).toBeLessThan(100);
  await expect(scoped).toHaveScreenshot("toaster-light-rtl.png");
  await scoped.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(scoped.locator(".sheen-toast-entry")).toHaveCount(0);
  await expect(scoped).toBeFocused();
});
