import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("serves and hydrates the prerendered public landing page", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Build the application, then inspect every seam." })).toBeVisible();
  await expect(page.getByRole("link", { name: "sheen, gemologic ui", exact: true })).toHaveAttribute("href", "/");
  const root = page.locator(".loupe-home");
  const rootIdentity = await root.evaluate(element => {
    element.setAttribute("data-pages-root", "retained");
    return element.getAttribute("data-pages-root");
  });
  expect(rootIdentity).toBe("retained");

  await page.getByRole("combobox", { name: "Accent" }).selectOption("violet");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "violet");
  await expect(root).toHaveAttribute("data-pages-root", "retained");
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/gemologic/sheen");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("serves a static component route with the workbench header", async ({ page }) => {
  await page.goto("/components/Button");
  await expect(page.getByRole("heading", { level: 1, name: "Button" })).toBeVisible();
  await expect(page.locator(".loupe-workbench-header")).toBeVisible();
});

test("serves the static composer route with the workbench header", async ({ page }) => {
  await page.goto("/composer");
  await expect(page.getByRole("heading", { level: 1, name: "Application Composer" })).toBeVisible();
  await expect(page.getByTitle("Editable AdminApp preview")).toBeVisible();
  await expect(page.locator(".loupe-workbench-header")).toBeVisible();
});

test("serves the static laboratory route with the workbench header", async ({ page }) => {
  await page.goto("/lab");
  await expect(page.getByRole("heading", { level: 1, name: "Cross-system laboratory" })).toBeVisible();
  await expect(page.getByTitle("Full layout preview")).toBeVisible();
  await expect(page.locator(".loupe-workbench-header")).toBeVisible();
});

test("serves the static AdminApp without workbench chrome", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator(".loupe-workbench-header")).toHaveCount(0);
  await page.getByRole("link", { name: /^Accounts/u }).click();
  await expect(page).toHaveURL(/\/admin\/accounts$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
});
