import { expect, test } from "@playwright/test";

test("server markup contains the complete accounts page without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect(page.locator('tbody tr[data-row-id="AC-0000001"]')).toBeVisible();
  await expect(page.locator("tbody tr[data-row-id]")).not.toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Service health" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Request rate" })).toBeVisible();
  await context.close();
});

test("live revalidation retains row identity and focus", async ({ page }) => {
  await page.goto("/accounts");
  const row = page.locator('tbody tr[data-row-id="AC-0000001"]');
  await expect(row).toBeVisible();
  await expect(page.getByTestId("accounts-status")).toContainText("Live fields updated");
  await row.evaluate(element => { Reflect.set(window, "__retainedRow", element); });
  await row.locator("td").first().click();
  const focused = await page.evaluate(() => document.activeElement?.closest("tr")?.getAttribute("data-row-id") ?? null);
  expect(focused).toBe("AC-0000001");
  // Wait for the next interval-driven background revalidation rather than clicking, so focus stays in the table.
  const before = await page.getByTestId("accounts-status").textContent();
  await expect(page.getByTestId("accounts-status")).not.toHaveText(before ?? "", { timeout: 10_000 });
  expect(await row.evaluate(element => Reflect.get(window, "__retainedRow") === element && element.isConnected)).toBe(true);
  expect(await page.evaluate(() => document.activeElement?.closest("tr")?.getAttribute("data-row-id") ?? null)).toBe(focused);
});

test("switching to the viewer role removes account rows in the same task", async ({ page, context }) => {
  await page.goto("/accounts");
  await expect(page.locator('tbody tr[data-row-id="AC-0000001"]')).toBeVisible();
  // Start a background revalidation so the role change lands mid-request.
  await page.getByRole("button", { name: "Refresh live fields" }).click();
  const remaining = await page.evaluate(() => {
    const control = [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Switch to viewer role"));
    if (!control) throw new Error("Missing role control");
    control.click();
    return document.querySelectorAll("tbody tr[data-row-id]").length;
  });
  expect(remaining).toBe(0);
  await expect(page.getByRole("heading", { name: /permission|access/i }).first()).toBeVisible();
  await page.getByRole("button", { name: "Switch to operator role" }).click();
  await expect(page.locator('tbody tr[data-row-id="AC-0000001"]')).toBeVisible();
  await context.clearCookies();
});

test("activating an account row opens its details pane", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/accounts");
  const row = page.locator('tbody tr[data-row-id="AC-0000001"]');
  await row.locator("td").first().click();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("complementary").getByText("Owner")).toBeVisible();
  expect(errors).toEqual([]);
});
