import { expect, test } from "@playwright/test";

test("toast cards retain safe failed actions and retry through real transport", async ({ page }) => {
  await page.goto("/toast");
  await page.getByRole("textbox", { name: "Unrelated draft" }).fill("Keep my draft");
  await page.getByRole("button", { name: "Root show", exact: true }).click();
  const card = page.getByRole("group", { name: "Root saved", exact: true });
  await expect(card).toHaveAccessibleDescription("Your workspace remains available.");
  const action = card.getByRole("button", { name: "Undo", exact: true });
  const node = await action.elementHandle();
  await action.click();
  await expect(card).toHaveAttribute("data-pending", "true");
  await expect(action).toBeDisabled();
  await expect(card.getByRole("button", { name: "Close", exact: true })).toBeEnabled();
  await expect(card).toHaveAttribute("data-invalid", "true");
  await expect(card).toHaveAccessibleDescription("Your workspace remains available. Undo failed. Your change is still saved.");
  await expect(card).not.toContainText("Private transport");
  expect(await node?.evaluate(element => element.isConnected && element.textContent === "Retry")).toBe(true);
  await expect(page.getByLabel("Root attempts")).toHaveText("1");
  await page.getByRole("checkbox", { name: "Root reject undo", exact: true }).press("Space");
  await card.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByLabel("Root attempts")).toHaveText("2");
  await expect(page.getByRole("textbox", { name: "Unrelated draft" })).toHaveValue("Keep my draft");
});

test("scoped cards use local messages and refresh without replacing focused controls", async ({ page }) => {
  await page.goto("/toast");
  await page.getByRole("button", { name: "Root show", exact: true }).click();
  await page.getByRole("button", { name: "Scoped show", exact: true }).click();
  const scoped = page.getByRole("group", { name: "Scoped saved", exact: true });
  await expect(scoped).toHaveCSS("direction", "rtl");
  const close = scoped.getByRole("button", { name: "Dismiss", exact: true });
  const node = await close.elementHandle();
  await page.getByRole("button", { name: "Scoped schedule refresh", exact: true }).click();
  await close.focus();
  const refreshed = page.getByRole("group", { name: "Scoped refreshed", exact: true });
  await expect(refreshed).toBeVisible();
  await expect(refreshed.getByRole("button", { name: "Dismiss", exact: true })).toBeFocused();
  expect(await node?.evaluate(element => element.isConnected && element === element.ownerDocument.activeElement)).toBe(true);
  await refreshed.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(refreshed.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
  await refreshed.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(refreshed).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Root saved", exact: true })).toBeVisible();
});
