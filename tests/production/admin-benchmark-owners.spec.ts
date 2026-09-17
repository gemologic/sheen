import { expect, test } from "@playwright/test";
import { captureAdminAppOwners, retainedAdminAppOwners } from "../../bench/admin-app-owners.ts";

test.beforeEach(async ({ page }) => {
  await page.goto("/admin?workload=heavy&table=continuous&configure=1");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator("[data-admin-starter-content]")).toHaveAttribute("data-admin-row-count", "12000");
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
});

test("dashboard workload changes and refresh reuse compact formatters and metric owners", async ({ page }) => {
  const stats = page.getByRole("group", { name: "Operational summary" });
  const balance = stats.locator("dl").filter({ has: page.getByText("Managed balance (USD)", { exact: true }) }).locator(".sheen-number-text");
  const initial = await balance.textContent();
  const owner = await balance.evaluateHandle(element => element);
  await page.evaluate(() => {
    document.documentElement.dataset.compactFormatters = "0";
    Intl.NumberFormat = new Proxy(Intl.NumberFormat, { construct(target, args, newTarget) {
      const options: unknown = args[1];
      if (typeof options === "object" && options !== null && Reflect.get(options, "notation") === "compact") {
        document.documentElement.dataset.compactFormatters = String(Number(document.documentElement.dataset.compactFormatters) + 1);
      }
      return Reflect.construct(target, args, newTarget);
    } });
  });
  try {
    await page.getByText("Customize starter", { exact: true }).click();
    await page.locator(".loupe-admin-customize").getByRole("button", { name: /^Workload /u }).click();
    await page.locator(".sheen-select-content").getByRole("option", { name: "Representative · 240 rows", exact: true }).click();
    await expect(stats.locator("dl").first()).toContainText("240");
    await expect(balance).not.toHaveText(initial ?? "");
    await page.getByRole("button", { name: "Refresh", exact: true }).first().click();
    await expect(page.locator(".sheen-status-bar").getByText(/^Revision \d+ ·/u)).toHaveText(/^Revision 2 · \d+ chart samples$/u);
    expect(await owner.evaluate(element => element.isConnected)).toBe(true);
    expect(initial).not.toBeNull();
    await expect(page.locator("html")).toHaveAttribute("data-compact-formatters", "0");
  } finally {
    await owner.dispose();
  }
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

test("sidebar URL settings retain navigation SVGs, badges, and the product mark", async ({ page }) => {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  await page.evaluate(() => {
    const read = window.getComputedStyle;
    document.documentElement.dataset.adminTokenReads = "0";
    window.getComputedStyle = function (element, pseudo) {
      if (element.hasAttribute("data-sheen-theme-token-probe")) document.documentElement.dataset.adminTokenReads = String(Number(document.documentElement.dataset.adminTokenReads) + 1);
      return read.call(this, element, pseudo);
    };
  });
  const nodes = await page.evaluateHandle(() => {
    const navigation = document.querySelector(".sheen-sidebar-navigation");
    if (!navigation) throw new Error("Expected the sidebar navigation");
    const icons = [...navigation.querySelectorAll(".sheen-nav-item-icon svg")];
    const badges = [...navigation.querySelectorAll(".sheen-badge")];
    const mark = document.querySelector(".sheen-admin-product-mark > span");
    if (icons.length === 0 || badges.length !== 2 || !mark) throw new Error("Expected navigation visuals and the product mark");
    return { icons, badges, mark };
  });
  try {
    for (const collapsed of [true, false]) {
      await page.locator(".sheen-sidebar-toggle-desktop").click();
      await expect(page.locator(".sheen-sidebar-toggle-desktop")).toHaveAttribute("aria-expanded", String(!collapsed));
      if (collapsed) await expect(page.locator(".sheen-admin-app")).toHaveAttribute("data-sidebar-collapsed", "true");
      else await expect(page.locator(".sheen-admin-app")).not.toHaveAttribute("data-sidebar-collapsed", "true");
      expect(await nodes.evaluate(visuals => visuals.icons.every(icon => icon.isConnected)
        && visuals.badges.every(badge => badge.isConnected) && visuals.mark.isConnected)).toBe(true);
      const destination = await page.locator('.sheen-sidebar-navigation a[href^="/admin/accounts?"]').getAttribute("href");
      if (!destination) throw new Error("Expected the accounts destination");
      expect(new URL(destination, page.url()).searchParams.get("sidebar")).toBe(collapsed ? "collapsed" : null);
      await expect(page.locator(".sheen-sidebar-navigation .sheen-badge").first()).toHaveText("12,000");
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
      await expect(page.locator("html")).toHaveAttribute("data-admin-token-reads", "0");
    }
    await page.getByText("Customize starter", { exact: true }).click();
    await page.locator(".loupe-admin-customize").getByRole("button", { name: /^Workload /u }).click();
    await page.locator(".sheen-select-content").getByRole("option", { name: "Representative · 240 rows", exact: true }).click();
    await expect(page.locator("[data-admin-starter-content]")).toHaveAttribute("data-admin-row-count", "240");
    await expect(page.locator(".sheen-sidebar-navigation .sheen-badge").first()).toHaveText("240");
    expect(await nodes.evaluate(visuals => visuals.icons.every(icon => icon.isConnected)
      && visuals.badges.every(badge => badge.isConnected) && visuals.mark.isConnected)).toBe(true);
    await page.locator(".loupe-admin-customize").getByRole("button", { name: "Theme Studio", exact: true }).click();
    await page.locator(".sheen-select-content").getByRole("option", { name: "Graphite", exact: true }).click();
    await expect(page.locator(".sheen-admin-scope")).toHaveAttribute("data-sheen-theme", "graphite");
    await expect.poll(() => page.locator("html").getAttribute("data-admin-token-reads")).not.toBe("0");
  } finally {
    await nodes.dispose();
  }
});
