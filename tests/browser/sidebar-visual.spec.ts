import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("sidebar expanded and rail matrix preserves bounded controls and visible focus", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sidebar-visual");
  for (const name of ["Dark expanded", "Light rail", "Dark RTL rail", "Light RTL expanded"]) {
    const root = page.getByRole("group", { name, exact: true });
    await expect(root).toBeInViewport({ ratio: 1 });
    const bounds = await root.boundingBox();
    if (!bounds) throw new Error("Missing sidebar bounds");
    for (const link of await root.getByRole("link").all()) {
      const box = await link.boundingBox();
      if (!box) throw new Error("Missing visible destination");
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    }
    const colors = await root.getByRole("link", { name: "Settings", exact: true }).evaluate(element => {
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      const style = getComputedStyle(element);
      const base = style.getPropertyValue("--sheen-color-bg");
      const resolve = (...layers: string[]) => {
        context.clearRect(0, 0, 1, 1);
        for (const color of layers) { context.fillStyle = color; context.fillRect(0, 0, 1, 1); }
        return "#" + [...context.getImageData(0, 0, 1, 1).data].map(channel => channel.toString(16).padStart(2, "0")).join("");
      };
      return { background: resolve(base), selected: resolve(base, style.backgroundColor), text: resolve(style.color), focus: resolve(style.getPropertyValue("--sheen-color-focus-ring")) };
    });
    expect(contrastRatio(colors.text, colors.selected)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.focus, colors.background)).toBeGreaterThanOrEqual(3);
  }
  const root = page.getByRole("group", { name: "Dark RTL rail", exact: true });
  await root.getByRole("link", { name: "People 3 members", exact: true }).focus();
  await page.keyboard.press("Tab");
  const settings = root.getByRole("link", { name: "Settings", exact: true });
  await expect(settings).toBeFocused();
  await expect(settings).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("tooltip")).toHaveText("Settings");
  await expect(page.getByRole("tooltip")).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("sidebar-matrix.png");
});
