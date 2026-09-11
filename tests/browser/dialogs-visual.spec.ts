import { expect, test } from "@playwright/test";

test("Dialog, alert, and confirmation visuals cover focused dark and RTL light states", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dialogs");
  for (const sample of [
    { trigger: "Open settings", title: "Settings", role: "dialog", file: "dialog-dark.png" },
    { trigger: "Review removal", title: "Remove workspace?", role: "alertdialog", file: "alert-light-rtl.png" },
    { trigger: "Ask confirmation", title: "Remove saved view?", role: "alertdialog", file: "confirm-light-rtl.png" },
  ]) {
    await page.getByRole("button", { name: sample.trigger, exact: true }).click();
    const dialog = page.locator(`[role="${sample.role}"]`).filter({ has: page.getByRole("heading", { name: sample.title, exact: true }) });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    await expect(dialog.locator("button").last()).toBeInViewport({ ratio: 1 });
    await expect(page).toHaveScreenshot(sample.file);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: sample.trigger, exact: true })).toBeFocused();
  }
});
