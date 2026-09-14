import { expect, test } from "@playwright/test";
import { captureAdminAppOwners, retainedAdminAppOwners } from "../../bench/admin-app-owners.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin?workload=heavy&table=continuous");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator("[data-admin-starter-content]")).toHaveAttribute("data-admin-row-count", "12000");
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
});

test("atomic benchmark checks retain real heavy app owners through native chrome actions", async ({ page }) => {
  const owners = await captureAdminAppOwners(page);
  const retained = (mode: Parameters<typeof retainedAdminAppOwners>[1]) => owners.evaluate(retainedAdminAppOwners, mode);
  try {
    await page.locator(".sheen-sidebar-toggle-desktop").click();
    await expect(page.locator(".sheen-admin-app")).toHaveAttribute("data-sidebar-collapsed", "true");
    expect(await retained("chart")).toBe(true);

    await page.getByText("Customize starter", { exact: true }).click();
    await page.locator(".loupe-admin-customize").getByRole("button", { name: "Layout Standard", exact: true }).click();
    await page.locator(".sheen-select-content").getByRole("option", { name: "Workspace", exact: true }).click();
    await expect(page.locator(".sheen-admin-app")).toHaveAttribute("data-admin-preset", "workspace");
    expect(await retained("chart")).toBe(true);

    await page.keyboard.press("Control+K");
    const palette = page.locator('.sheen-command-dialog[role="dialog"]');
    await expect(palette).toBeVisible();
    await expect(palette).toHaveAccessibleName("Command palette");
    await expect(palette.getByRole("combobox", { name: "Command palette", exact: true })).toBeFocused();
    expect(await retained("chart")).toBe(true);
  } finally {
    await owners.dispose();
  }
});

test("copied retention markers cannot hide a replaced native content owner", async ({ page }) => {
  const owners = await captureAdminAppOwners(page);
  const retained = (mode: Parameters<typeof retainedAdminAppOwners>[1]) => owners.evaluate(retainedAdminAppOwners, mode);
  try {
    await owners.evaluate(nodes => {
      nodes.content.setAttribute("data-benchmark-content", "retained");
      nodes.content.replaceWith(nodes.content.cloneNode(true));
    });
    await expect(page.locator("[data-admin-starter-content]")).toHaveAttribute("data-benchmark-content", "retained");
    expect(await retained("shell")).toBe(false);
  } finally {
    await owners.dispose();
  }
});
