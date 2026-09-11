import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

for (const palette of ["dark-ltr", "light-rtl"]) {
  test(`drawer ${palette} presentation retains a visible keyboard focus ring`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shell-scroll-wide");
    await page.getByRole("button", { name: "Refresh sidebar", exact: true }).click();
    await expect(page.getByText("Record 1, revision 1", { exact: true })).toBeVisible();
    if (palette === "light-rtl") {
      await page.getByRole("button", { name: "Toggle fixture palette", exact: true }).click();
      await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
    }
    await page.setViewportSize({ width: 375, height: 750 });
    await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    await expect(drawer).toBeVisible();
    const pane = drawer.getByRole("region", { name: "Wide sidebar data", exact: true });
    await pane.focus();
    await page.keyboard.press("Tab");
    const close = drawer.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeFocused();
    await expect.poll(() => close.evaluate(element => element.matches(":focus-visible"))).toBe(true);
    await expect(drawer).toHaveCSS("animation-duration", "0s");
    const colors = await close.evaluate(element => {
      const surface = element.closest(".sheen-dialog");
      if (!surface) throw new Error("Missing drawer surface");
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      const color = (value: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
      };
      const style = getComputedStyle(element);
      return { fill: color(getComputedStyle(surface).backgroundColor), text: color(style.color), focus: color(style.outlineColor) };
    });
    expect(contrastRatio(colors.text, colors.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.focus, colors.fill)).toBeGreaterThanOrEqual(3);
    await expect(page).toHaveScreenshot(`drawer-${palette}.png`);
  });
}
