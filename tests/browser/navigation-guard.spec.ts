import { expect, test } from "@playwright/test";

test("browser forward navigation is restored on cancel and retried on confirmation", async ({ page }) => {
  await page.goto("/unsaved");
  await page.getByRole("link", { name: "Open browser status" }).click();
  await expect(page).toHaveURL(/\/browser-status$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/unsaved$/);
  const draft = page.getByRole("textbox", { name: "Unsaved draft", exact: true });
  await draft.fill("History draft");
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("true");
  await page.evaluate(() => history.forward());
  const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(prompt).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/unsaved$/);
  await expect(draft).toHaveValue("History draft");
  await page.evaluate(() => history.forward());
  await prompt.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/browser-status$/);
  await expect(page.getByRole("heading", { name: "Browser status qualification" })).toBeVisible();
});

test("dirty link navigation can be cancelled or confirmed without losing the current draft", async ({ page }) => {
  await page.goto("/unsaved");
  const draft = page.getByRole("textbox", { name: "Unsaved draft", exact: true });
  await draft.fill("Preserve me");
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("true");
  const link = page.getByRole("link", { name: "Open browser status" });
  await link.click();
  const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(prompt).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(prompt).toBeHidden();
  await expect(draft).toHaveValue("Preserve me");
  await expect(link).toBeFocused();
  await link.click();
  await prompt.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/browser-status$/);
  await expect(page.getByRole("heading", { name: "Browser status qualification" })).toBeVisible();
});

test("discard confirmation does not bypass an unrelated application blocker", async ({ page }) => {
  await page.goto("/unsaved");
  await page.getByRole("button", { name: "Toggle app blocker" }).click();
  const draft = page.getByRole("textbox", { name: "Unsaved draft", exact: true });
  await draft.fill("App still blocks");
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("true");
  await page.getByRole("link", { name: "Open browser status" }).click();
  const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(prompt).toBeHidden();
  await expect(page).toHaveURL(/\/unsaved$/);
  await expect(draft).toHaveValue("App still blocks");
  await page.getByRole("button", { name: "Toggle app blocker" }).click();
  await page.getByRole("link", { name: "Open browser status" }).click();
  await prompt.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/browser-status$/);
});
