import { expect, test } from "@playwright/test";

test("immutable model replacements retain actions, counts, and metric positions with current values", async ({ page }) => {
  await page.goto("/admin-model-refresh");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const commit = page.getByRole("button", { name: "Commit model", exact: true });
  const resource = page.getByRole("link", { name: "Open resource", exact: true });
  await commit.evaluate(element => element.setAttribute("data-model-retained", "commit"));
  await resource.evaluate(element => element.setAttribute("data-model-retained", "resource"));
  await page.locator(".sheen-stat-group-item").evaluateAll(elements => elements.forEach((element, index) => element.setAttribute("data-model-retained", `stat-${index}`)));
  await page.locator(".sheen-status-counts > div").evaluateAll(elements => elements.forEach(element => element.setAttribute("data-model-retained", element.querySelector("dt")?.textContent ?? "missing")));
  await commit.focus();
  await page.getByRole("button", { name: "Replace models", exact: true }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected model replacement control");
    element.click();
  });
  await expect(commit).toHaveAttribute("data-model-retained", "commit");
  await expect(commit).toBeFocused();
  await expect(resource).toHaveAttribute("data-model-retained", "resource");
  await expect(resource).toHaveAttribute("href", "/admin/accounts?revision=2");
  await expect(page.getByRole("group", { name: "Model operations 2", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-admin-actions > a")).toBeVisible();
  await expect(page.locator('.sheen-stat-group-item[data-model-retained="stat-0"] .sheen-stat-value')).toHaveText("2000");
  await expect(page.locator('.sheen-stat-group-item[data-model-retained="stat-1"] .sheen-stat-value')).toHaveText("2");
  await expect(page.locator('.sheen-status-counts > div[data-model-retained="Rows"] dd')).toHaveText("2,000");
  await expect(page.locator('.sheen-status-counts > div[data-model-retained="Chart points"] dd')).toHaveText("4,000");
  await expect(page.locator(".sheen-status-counts > div").first()).toHaveAttribute("data-model-retained", "Chart points");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Committed revision", exact: true })).toHaveText("2");
  await page.getByRole("button", { name: "Toggle disabled", exact: true }).click();
  await expect(commit).toBeDisabled();
  await expect(commit).toHaveAttribute("data-model-retained", "commit");
  await page.getByRole("button", { name: "Toggle disabled", exact: true }).click();
  await expect(commit).toBeEnabled();
});

test("an action changing between navigation and invocation keeps correct native semantics", async ({ page }) => {
  await page.goto("/admin-model-refresh");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.getByRole("link", { name: "Open resource", exact: true })).toHaveAttribute("href", "/admin/accounts?revision=1");
  await page.getByRole("button", { name: "Toggle action kind", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open resource", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open resource", exact: true }).click();
  await expect(page.getByRole("status", { name: "Committed revision", exact: true })).toHaveText("1");
  await page.getByRole("button", { name: "Toggle action kind", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open resource", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open resource", exact: true })).toHaveAttribute("href", "/admin/accounts?revision=1");
});
