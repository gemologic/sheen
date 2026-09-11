import { expect, test } from "@playwright/test";

test("EditableTextField validates, commits, and reverts without leaking draft form state", async ({ page }) => {
  await page.goto("/editable-text");
  const field = page.locator("#project-name");
  await field.getByRole("button", { name: "Project name" }).focus();
  const input = field.getByRole("textbox", { name: "Project name" });
  await input.fill("x");
  await input.press("Enter");
  await expect(field).toHaveAttribute("data-invalid", "");
  await expect(input).toHaveValue("x");
  await input.fill("Polaris");
  await input.press("Enter");
  await expect(field.getByRole("button", { name: "Project name" })).toHaveText("Polaris");
  await expect(page.getByRole("status", { name: "Committed text" })).toHaveText("Polaris");
  await expect(page.getByRole("status", { name: "Commit count" })).toHaveText("1");

  await field.getByRole("button", { name: "Project name" }).focus();
  await input.fill("Dirty draft");
  await page.getByRole("button", { name: "Refresh committed value" }).evaluate(element => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(field).toHaveAttribute("data-stale", "");
  await expect(input).toHaveValue("Dirty draft");
  await input.press("Escape");
  await expect(field.getByRole("button", { name: "Project name" })).toHaveText("Server revision");
});
