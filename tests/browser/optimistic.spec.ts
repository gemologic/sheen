import { expect, test } from "@playwright/test";

test("optimistic commit and explicit undo use real transport without replacing drafts", async ({ page }) => {
  await page.goto("/optimistic");
  const input = page.getByRole("textbox", { name: "Unrelated draft" });
  await input.fill("Keep this draft");
  const node = await input.elementHandle();
  const response = page.waitForResponse(result => result.url().endsWith("/api/optimistic") && result.status() === 200);
  await page.getByRole("button", { name: "Apply ten" }).click();
  await expect(page.getByLabel("Balance", { exact: true })).toHaveText("110");
  await expect(page.getByLabel("Operation status")).toHaveText("Saving");
  await expect(page.locator("[data-pending]")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Apply ten" })).toBeDisabled();
  await input.focus();
  await response;
  await expect(page.getByLabel("Operation status")).toHaveText("Saved");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Keep this draft");
  expect(await node?.evaluate(element => element.isConnected && element === element.ownerDocument.activeElement)).toBe(true);
  await expect(page.getByLabel("Rollback count")).toHaveText("0");
  await page.getByRole("button", { name: "Undo ten" }).click();
  await expect(page.getByLabel("Balance", { exact: true })).toHaveText("100");
  await expect(page.getByLabel("Operation status")).toHaveText("Undone");
  await expect(page.getByLabel("Commit count")).toHaveText("2");
  await expect(page.getByLabel("Rollback count")).toHaveText("0");
});

test("rejected transport rolls back once, preserves newer app edits, and permits explicit retry", async ({ page }) => {
  await page.goto("/optimistic");
  await page.getByRole("checkbox", { name: "Reject commit" }).press("Space");
  await expect(page.getByRole("checkbox", { name: "Reject commit" })).toBeChecked();
  const rejected = page.waitForResponse(result => result.url().endsWith("/api/optimistic") && result.status() === 409);
  await page.getByRole("button", { name: "Apply ten" }).click();
  await expect(page.getByLabel("Balance", { exact: true })).toHaveText("110");
  await page.getByRole("button", { name: "Apply independent edit" }).click();
  await expect(page.getByLabel("Balance", { exact: true })).toHaveText("135");
  await rejected;
  await expect(page.getByLabel("Operation status")).toContainText("Failed");
  await expect(page.getByLabel("Balance", { exact: true })).toHaveText("125");
  await expect(page.getByLabel("Rollback count")).toHaveText("1");
  await expect(page.getByLabel("Commit count")).toHaveText("1");
  await page.getByRole("checkbox", { name: "Reject commit" }).press("Space");
  await expect(page.getByRole("checkbox", { name: "Reject commit" })).not.toBeChecked();
  await page.getByRole("button", { name: "Apply ten" }).click();
  await expect(page.getByLabel("Operation status")).toHaveText("Saved");
  await expect(page.getByLabel("Balance", { exact: true })).toHaveText("135");
  await expect(page.getByLabel("Commit count")).toHaveText("2");
  await expect(page.getByLabel("Rollback count")).toHaveText("1");
});
