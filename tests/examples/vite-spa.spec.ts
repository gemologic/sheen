import { expect, test } from "@playwright/test";

test("client-only SPA paints the dark theme, admin shell, and table rows", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // The document turns interactive after parsing (so after the inline bootstrap) and before the deferred app module runs.
  await page.addInitScript(() => {
    document.addEventListener("readystatechange", () => {
      if (document.readyState !== "interactive") return;
      const root = document.documentElement;
      Reflect.set(window, "__prepaint", { theme: root.getAttribute("data-sheen-theme"), mode: root.getAttribute("data-sheen-mode"), app: document.getElementById("app")?.childElementCount ?? -1 });
    });
  });
  await page.goto("/");
  expect(await page.evaluate(() => Reflect.get(window, "__prepaint"))).toEqual({ theme: "obsidian", mode: "dark", app: 0 });
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.getByRole("banner")).toContainText("Sheen SPA");
  await expect(page.getByRole("complementary").getByRole("link", { name: "Accounts" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("main").getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect(page.locator('tbody tr[data-row-id="AC-0001"]')).toBeVisible();
  await expect(page.locator("tbody tr[data-row-id]")).not.toHaveCount(0);
  expect(errors).toEqual([]);
});
