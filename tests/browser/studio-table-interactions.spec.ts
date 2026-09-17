import { expect, test } from "@playwright/test";

test("RTL account resizing retains rows and keyboard detail activation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/accounts?direction=rtl");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const row = page.locator('tr[data-row-id="account-0001"]');
  const retained = await row.elementHandle();
  const resize = page.locator('th[data-column="balance"]').getByRole("separator");
  const before = Number(await resize.getAttribute("aria-valuenow"));
  await resize.focus();
  await resize.press("ArrowLeft");
  await expect(resize).toHaveAttribute("aria-valuenow", String(before + 10));
  await expect(resize).toBeFocused();
  await expect(page.locator(".sheen-admin-details-owner")).toHaveCount(0);
  expect(await row.evaluate((element, previous) => element === previous, retained)).toBe(true);
  await expect(row.locator('[data-column="balance"]')).toHaveCSS("text-align", "end");
  await row.focus();
  await row.press("Enter");
  await expect(page.locator(".sheen-admin-details-owner")).toContainText("account-0001");
});

test("Studio RTL card selection and menu actions do not activate their parent row", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ theme: "studio", direction: "rtl" })));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table-mobile");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const section = page.getByRole("region", { name: "Mobile card table" });
  const card = section.locator('[data-mobile-row-id="mobile-0"]');
  const activation = section.getByRole("status", { name: "Mobile activation result" });
  await expect(card).toHaveCSS("direction", "rtl");
  await card.getByRole("checkbox", { name: "Select row mobile-0" }).press("Space");
  await expect(activation).toHaveText("None");
  await card.getByRole("button", { name: "Actions for row mobile-0" }).click();
  await page.getByRole("menuitem", { name: "Review", exact: true }).click();
  await expect(section.getByRole("status", { name: "Mobile action result" })).toHaveText("review|anchor:mobile-0|selection:mobile-0");
  await expect(activation).toHaveText("None");
  const link = card.getByRole("link", { name: "Account 0", exact: true });
  await expect(link).toHaveAttribute("href", "/table-mobile?account=mobile-0");
  await link.focus();
  await link.press("Enter");
  await expect(page).toHaveURL(/account=mobile-0/u);
  await expect(activation).toHaveText("None");
  await card.focus();
  await card.press("Enter");
  await expect(activation).toHaveText("mobile-0");
});
