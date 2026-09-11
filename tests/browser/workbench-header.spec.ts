import { expect, test } from "@playwright/test";

test("workbench navigation retains one shared header across tool routes", async ({ page }) => {
  await page.goto("/gallery");
  const header = page.locator(".loupe-workbench-header");
  await expect(header).toBeVisible();
  await expect(header.getByRole("link", { name: "sheen, gemologic ui", exact: true })).toHaveAttribute("href", "/");
  await expect(header.getByRole("link", { name: "Gallery", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(header.getByRole("link", { name: "Tokens", exact: true })).toHaveAttribute("href", "/tokens");
  await header.evaluate(element => element.setAttribute("data-workbench-header", "retained"));

  await header.getByRole("link", { name: "Laboratory", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cross-system laboratory", exact: true })).toBeVisible();
  await expect(header).toHaveAttribute("data-workbench-header", "retained");
});
