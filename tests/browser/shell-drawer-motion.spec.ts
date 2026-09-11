import { expect, test } from "@playwright/test";

for (const direction of ["ltr", "rtl"]) {
  for (const motion of ["full", "os-reduced", "scope-reduced"]) {
    test(`drawer respects ${motion} motion and ${direction} inline placement`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion === "os-reduced" ? "reduce" : "no-preference" });
      await page.goto("/shell-scroll-wide");
      await page.getByRole("button", { name: "Refresh sidebar", exact: true }).click();
      await expect(page.getByText("Record 1, revision 1", { exact: true })).toBeVisible();
      if (direction === "rtl") await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
      if (motion === "scope-reduced") await page.getByRole("button", { name: "Toggle scoped motion", exact: true }).click();
      const pane = page.getByRole("region", { name: "Wide sidebar data", exact: true });
      await pane.evaluate(element => element.setAttribute("data-retained", "true"));
      await expect(page.locator(".sheen-app-shell")).toHaveCSS("animation-name", "none");
      await page.setViewportSize({ width: 375, height: 750 });
      const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
      await toggle.click();
      const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveCSS("direction", direction);
      await expect(drawer).toHaveCSS("animation-name", "sheen-dialog-enter");
      const duration = motion === "full" ? "0.15s" : "0s";
      await expect(drawer).toHaveCSS("animation-duration", duration);
      await expect(page.locator(".sheen-dialog-overlay")).toHaveCSS("animation-duration", duration);
      const bounds = await drawer.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds?.y).toBe(0);
      expect(bounds?.height).toBe(750);
      if (bounds) {
        expect(bounds.width).toBeLessThan(375);
        expect(direction === "rtl" ? bounds.x + bounds.width : bounds.x).toBe(direction === "rtl" ? 375 : 0);
      }
      await expect(pane).toHaveAttribute("data-retained", "true");
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(toggle).toBeFocused();
      await toggle.click();
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveCSS("animation-duration", duration);
      await expect(pane).toHaveAttribute("data-retained", "true");
      if (motion === "full") {
        await pane.focus();
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(drawer).toHaveCSS("animation-duration", "0s");
        await expect(page.locator(".sheen-dialog-overlay")).toHaveCSS("animation-duration", "0s");
        await expect(pane).toBeFocused();
        await expect(pane).toHaveAttribute("data-retained", "true");
      }
    });
  }
}
