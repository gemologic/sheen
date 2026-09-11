import { test, expect } from "@playwright/test";

test("modifier values render, reset within nested themes, and update locale without remount", async ({ page }) => {
  await page.goto("/modifiers");
  const scope = page.locator(".modifier-scope");
  const button = scope.getByRole("button", { name: "Change modifiers", exact: true });
  await expect(button).toHaveCSS("min-block-size", "26px");
  await expect(button).toHaveCSS("border-radius", "0px");
  await expect(button).toHaveCSS("transition-duration", "0s");
  await expect(scope).toHaveCSS("direction", "rtl");
  await expect(scope.locator("[data-number]")).toHaveText("12.345,67");
  await expect(scope.locator("[data-date]")).toHaveText("06.09.2026");
  const reset = page.getByRole("button", { name: "Reset control" });
  await expect(reset).toHaveCSS("min-block-size", "30px");
  await expect(reset).toHaveCSS("padding-inline-start", "10px");
  await expect(reset).toHaveCSS("border-radius", "5px");
  await expect(reset).toHaveCSS("transition-duration", "0.1s");
  await scope.getByRole("button", { name: "Open localized dialog" }).click();
  await page.getByRole("button", { name: "Schließen" }).click();
  await button.evaluate(element => element.setAttribute("data-identity", "original"));
  await button.click();
  await expect(button).toHaveCSS("min-block-size", "34px");
  await expect(button).toHaveCSS("border-radius", "999px");
  await expect(scope).toHaveCSS("direction", "ltr");
  await expect(scope.locator("[data-number]")).toHaveText("12,345.67");
  await expect(button).toHaveAttribute("data-identity", "original");
});

test("OS reduced-motion preference overrides full motion even in nested scopes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/modifiers");
  await expect(page.getByRole("button", { name: "Reset control" })).toHaveCSS("transition-duration", "0s");
});
