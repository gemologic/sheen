import { expect, test } from "@playwright/test";

test("Combobox dark multi-select baseline", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto("/combobox");
  await page.addStyleTag({ content: ".loupe-combobox-page output,.loupe-combobox-scope{display:none!important}" });
  const input = page.getByRole("combobox", { name: "Reviewers", exact: true });
  await input.fill("a");
  await expect(page.getByRole("listbox", { name: "Reviewers Suggestions", exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("combobox-dark.png", { animations: "disabled" });
});
