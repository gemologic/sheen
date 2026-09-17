import { expect, test, type Locator } from "@playwright/test";

async function contrast(target: Locator, property: "color" | "borderTopColor" | "outlineColor", outside = false): Promise<number> {
  return target.evaluate((element, options) => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("Missing color resolver");
    const ancestors: Element[] = [];
    for (let node: Element | null = options.outside ? element.parentElement : element; node; node = node.parentElement) ancestors.unshift(node);
    context.fillStyle = "white";
    context.fillRect(0, 0, 1, 1);
    for (const node of ancestors) {
      context.fillStyle = getComputedStyle(node).backgroundColor;
      context.fillRect(0, 0, 1, 1);
    }
    const luminance = (): number => {
      const pixels = context.getImageData(0, 0, 1, 1).data;
      return [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
        const value = (pixels[index] ?? 0) / 255;
        return sum + weight * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      }, 0);
    };
    const background = luminance();
    context.fillStyle = getComputedStyle(element)[options.property];
    context.fillRect(0, 0, 1, 1);
    const foreground = luminance();
    return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
  }, { property, outside });
}

for (const mode of ["dark", "light"]) {
  test(`Studio ${mode} controls and table states retain composited contrast`, async ({ page }) => {
    await page.addInitScript(mode => localStorage.setItem("sheen", JSON.stringify({ theme: "studio", mode })), mode);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/admin/settings?mode=${mode}`);
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const input = page.getByRole("textbox", { name: "Organization name" });
    expect(await contrast(input, "color")).toBeGreaterThanOrEqual(4.5);
    expect(await contrast(input, "borderTopColor", true)).toBeGreaterThanOrEqual(3);
    await input.focus();
    await expect(input).toHaveCSS("outline-style", "solid");
    expect(await contrast(input, "outlineColor", true)).toBeGreaterThanOrEqual(3);
    await page.goto(`/admin/accounts?mode=${mode}`);
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const row = page.locator('tbody tr[data-row-id="account-0001"]');
    const number = row.locator('[data-column="balance"] .sheen-number-text');
    expect(await contrast(number, "color")).toBeGreaterThanOrEqual(4.5);
    await row.hover();
    expect(await contrast(number, "color")).toBeGreaterThanOrEqual(4.5);
    expect(await contrast(number.locator('[data-number-part="fraction"]'), "color")).toBeGreaterThanOrEqual(4.5);
    await page.goto("/data-table");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const selectable = page.getByRole("region", { name: "Paginated client example", exact: true }).locator("tbody tr[data-row-id]").first();
    await selectable.getByRole("checkbox").press("Space");
    await expect(selectable).toHaveAttribute("data-selected", "");
    await selectable.hover();
    expect(await contrast(selectable.locator('[data-column="amount"] strong'), "color")).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(0, 0);
    expect(await contrast(selectable.locator('[data-column="amount"] strong'), "color")).toBeGreaterThanOrEqual(4.5);
    await page.goto(`/admin?mode=${mode}&configure=1`);
    await page.getByRole("button", { name: "Reset appearance", exact: true }).click();
    const scrim = page.locator(".sheen-dialog-overlay:visible").last();
    const alpha = await scrim.evaluate(element => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Missing scrim color resolver");
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return context.getImageData(0, 0, 1, 1).data[3] ?? 0;
    });
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(255);
  });
}
