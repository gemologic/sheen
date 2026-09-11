import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-admin-app")).toBeVisible();
}

async function expectScopedOverlay(overlay: Locator): Promise<void> {
  await expect(overlay).toBeVisible();
  expect(await overlay.evaluate(element => element.closest('[data-sheen-portal="scope"]') !== null)).toBe(true);
}

async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const animations = document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)));
  });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations, label).toEqual([]);
}

interface PresetCase {
  readonly name: string;
  readonly path: string;
  readonly sidebar: boolean;
  readonly account: string;
}

const presets: readonly PresetCase[] = [
  { name: "standard", path: "/admin", sidebar: true, account: "sidebar-footer" },
  { name: "workspace", path: "/admin?preset=workspace", sidebar: true, account: "sidebar-footer" },
  { name: "horizontal", path: "/admin?preset=horizontal", sidebar: false, account: "topbar-end" },
  { name: "inspector", path: "/admin?preset=inspector", sidebar: true, account: "sidebar-footer" },
];

interface PlacementCase {
  readonly zone: string;
  readonly target: string;
}

const placements: readonly PlacementCase[] = [
  { zone: "product", target: "topbar-start" }, { zone: "product", target: "sidebar-header" },
  { zone: "workspace", target: "topbar-start" }, { zone: "workspace", target: "topbar-end" }, { zone: "workspace", target: "sidebar-header" }, { zone: "workspace", target: "sidebar-footer" },
  { zone: "primary-navigation", target: "topbar-center" }, { zone: "primary-navigation", target: "sidebar-navigation" },
  { zone: "secondary-navigation", target: "topbar-center" }, { zone: "secondary-navigation", target: "sidebar-navigation" },
  { zone: "current-view", target: "topbar-start" }, { zone: "current-view", target: "topbar-center" }, { zone: "current-view", target: "sidebar-header" },
  { zone: "command-trigger", target: "topbar-center" }, { zone: "command-trigger", target: "topbar-end" }, { zone: "command-trigger", target: "sidebar-footer" },
  { zone: "global-search", target: "topbar-center" }, { zone: "global-search", target: "topbar-end" }, { zone: "global-search", target: "sidebar-header" },
  { zone: "primary-actions", target: "topbar-end" }, { zone: "primary-actions", target: "sidebar-footer" },
  { zone: "utility-actions", target: "topbar-end" }, { zone: "utility-actions", target: "sidebar-footer" },
  { zone: "notifications", target: "topbar-end" }, { zone: "notifications", target: "sidebar-footer" },
  { zone: "help", target: "topbar-end" }, { zone: "help", target: "sidebar-footer" },
  { zone: "account", target: "topbar-end" }, { zone: "account", target: "sidebar-header" }, { zone: "account", target: "sidebar-footer" },
];

const targetSelectors: Readonly<Record<string, string>> = {
  "topbar-start": ".sheen-admin-topbar-start",
  "topbar-center": ".sheen-admin-topbar-center",
  "topbar-end": ".sheen-admin-topbar-end",
  "sidebar-header": ".sheen-sidebar-header",
  "sidebar-navigation": ".sheen-sidebar-navigation",
  "sidebar-footer": ".sheen-sidebar-footer",
};

for (const preset of presets) {
  test(`${preset.name} AdminApp preset hydrates one complete semantic shell`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(preset.path);
    await ready(page);
    const app = page.locator(".sheen-admin-app");
    await expect(app).toHaveAttribute("data-admin-preset", preset.name);
    await expect(app).toHaveAttribute("data-admin-chrome", "layered");
    await expect(app).toHaveAttribute("data-admin-navigation", "subtle");
    await expect(app).toHaveAttribute("data-admin-actions", "accent");
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Northstar operations", exact: true })).toBeVisible();
    await expect(page.locator('[data-admin-zone="account"]')).toHaveCount(1);
    await expect(page.locator('[data-admin-zone="current-view"]')).toHaveCount(0);
    await expect(page.locator(".sheen-admin-account")).toHaveAttribute("data-admin-account-target", preset.account);
    await expect(page.locator(".sheen-shell-sidebar")).toHaveCount(preset.sidebar ? 1 : 0);
    await expect(page.getByRole("navigation", { name: "Primary navigation", exact: true })).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test("navigation renders route-specific main content and active state", async ({ page }) => {
  await page.goto("/admin");
  await ready(page);
  await expect(page.getByRole("heading", { level: 1, name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Operational summary", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Inbox 8", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/inbox$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Inbox", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Recent messages", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-data-table")).toHaveCount(0);

  await page.getByRole("link", { name: "Accounts 240", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/accounts$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-data-table")).toBeVisible();
  await expect(page.getByRole("link", { name: "Accounts 240", exact: true })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Configuration", exact: true }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Organization name", exact: true })).toHaveValue("Northstar");
});

test("standard phone chrome compacts into a two-row app bar without hiding primary controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await ready(page);
  const header = page.locator(".sheen-shell-header");
  const box = await header.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? Infinity).toBeLessThanOrEqual(88);
  await expect(page.locator(".sheen-sidebar-toggle-mobile")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search application", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "New account", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeVisible();
  await page.locator(".sheen-sidebar-toggle-mobile").click();
  await expect(page.getByRole("dialog", { name: "Sidebar", exact: true }).getByRole("button", { name: "Open Ada Lovelace account menu", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("search, help, workspace, and sidebar row actions behave as application controls", async ({ page }) => {
  await page.goto("/admin");
  await ready(page);

  const search = page.getByRole("searchbox", { name: "Search application", exact: true });
  const searchField = page.locator(".sheen-field").filter({ has: search });
  const clear = searchField.getByRole("button", { name: "Clear search", exact: true });
  await expect(searchField.locator(".sheen-search-input-indicator")).toBeVisible();
  await expect(clear).not.toBeVisible();
  await search.fill("account");
  await expect(clear).toBeVisible();
  await expect(searchField.locator(".sheen-search-input-indicator")).not.toBeVisible();
  await clear.click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(search).toHaveCSS("outline-width", "2px");
  await expect(search).toHaveCSS("outline-offset", "-2px");

  const help = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  await expect(help).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
  await expect(help).toHaveCSS("display", "flex");
  await expect(help).toHaveCSS("align-items", "center");
  await expect(help).toHaveCSS("justify-content", "center");
  const sidebarToggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  await expect(sidebarToggle).toHaveCSS("display", "flex");
  await expect(sidebarToggle).toHaveCSS("align-items", "center");
  await expect(sidebarToggle).toHaveCSS("justify-content", "center");
  const newAccount = page.getByRole("button", { name: "New account", exact: true });
  await expect(newAccount.locator(".sheen-admin-action-icon .sheen-icon")).toHaveCSS("color", await newAccount.evaluate(element => getComputedStyle(element).color));
  expect(await newAccount.locator(".sheen-icon").evaluate(element => [...element.querySelectorAll(":scope > svg")]
    .filter(svg => getComputedStyle(svg).display !== "none")
    .map(svg => svg.getAttribute("data-sheen-icon-set-value")))).toEqual(["radix"]);
  await help.click();
  const shortcutDialog = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await expect(shortcutDialog).toBeVisible();
  const shortcutKey = shortcutDialog.locator(".sheen-kbd").first();
  const shortcutKeyBox = await shortcutKey.boundingBox();
  if (!shortcutKeyBox) throw new Error("Expected shortcut key geometry");
  expect(shortcutKeyBox.height).toBeLessThanOrEqual(24);
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();

  await search.fill("draft tied to production");
  const workspaceTrigger = page.getByRole("button", { name: "Workspace: Production", exact: true });
  await workspaceTrigger.click();
  const workspaceMenu = page.getByRole("menu");
  const workspaceTriggerBox = await workspaceTrigger.boundingBox();
  const workspaceMenuBox = await workspaceMenu.boundingBox();
  if (!workspaceTriggerBox || !workspaceMenuBox) throw new Error("Expected workspace trigger and menu geometry");
  expect(Math.abs(workspaceMenuBox.width - workspaceTriggerBox.width)).toBeLessThanOrEqual(1);
  await page.getByRole("menuitemradio", { name: /Staging\s+Internal/u }).click();
  await expect(page.getByRole("button", { name: "Workspace: Staging", exact: true })).toBeVisible();
  await expect(page.locator("[data-admin-starter-content]")).toHaveAttribute("data-admin-workspace-id", "staging");
  await expect(page.getByText("Staging workspace", { exact: true }).first()).toBeVisible();
  await expect(search).toHaveValue("");
  await expect(search).toHaveAttribute("placeholder", "Search staging");

  const accountRow = page.locator(".sheen-nav-item-row").filter({ has: page.getByRole("link", { name: "Accounts 240", exact: true }) });
  await accountRow.hover();
  const rowActions = accountRow.getByRole("button", { name: "Accounts actions", exact: true });
  await expect(rowActions).toBeVisible();
  await rowActions.click();
  await page.getByRole("menuitem", { name: "Preview first account", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Aperture 001", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Inbox 8", exact: true }).click();
  await expect(page.getByRole("region", { name: "Recent messages", exact: true })).toBeVisible();
  const inboxRow = page.locator(".sheen-nav-item-row").filter({ has: page.getByRole("link", { name: "Inbox 8", exact: true }) });
  await inboxRow.getByRole("button", { name: "Inbox actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Mark inbox read", exact: true }).click();
  await expect(page.getByRole("link", { name: "Inbox", exact: true })).toBeVisible();
  await expect(page.getByText("Inbox reviewed", { exact: true })).toBeVisible();
  await expect(page.locator(".loupe-admin-inbox [data-unread]")).toHaveCount(0);
});

test("admin chart inspection controls keep compact but usable targets", async ({ page }) => {
  await page.goto("/admin");
  await ready(page);
  const sizes = await page.locator(".sheen-chart-zoom-controls button, .sheen-chart-legend-toggle, .sheen-chart-data > summary").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
  expect(sizes.length).toBeGreaterThan(0);
  expect(sizes.every(size => size >= 28)).toBe(true);
});

test("heavy AdminApp workload composes charts, operations, and a bounded 12,000-row continuous table", async ({ page }) => {
  await page.goto("/admin?workload=heavy&table=continuous");
  await ready(page);
  const content = page.locator("[data-admin-starter-content]");
  await expect(content).toHaveAttribute("data-admin-workload", "heavy");
  await expect(content).toHaveAttribute("data-admin-row-count", "12000");
  await expect(content).toHaveAttribute("data-admin-chart-points", "20000");
  await expect(page.getByText("Heavy workload", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Operational summary", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Workspace traffic", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Regional capacity", exact: true })).toBeVisible();
  await expect(page.locator(".loupe-admin-service-panel [data-service-id]")).toHaveCount(10);
  await expect(page.locator('.loupe-admin-activity-panel [data-activity-id]')).toHaveCount(12);
  await expect(page.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  await expect(page.locator(".sheen-data-table-result-count")).toContainText("12,000 results");
  const mountedRows = await page.locator("tbody tr[data-row-id]").count();
  expect(mountedRows).toBeGreaterThan(0);
  expect(mountedRows).toBeLessThan(100);
  await expectNoAxeViolations(page, "heavy AdminApp workload");
});

for (const placement of placements) {
  test(`${placement.zone} renders once in supported ${placement.target} placement`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/admin?place-${placement.zone}=${placement.target}`);
    await ready(page);
    const zone = placement.target === "sidebar-navigation"
      ? page.getByRole("navigation", { name: placement.zone === "primary-navigation" ? "Primary navigation" : "Secondary navigation", exact: true })
      : page.locator(`[data-admin-zone="${placement.zone}"]`);
    await expect(zone).toHaveCount(1);
    await expect(zone).not.toBeEmpty();
    const targetSelector = targetSelectors[placement.target];
    if (targetSelector === undefined) throw new Error(`Missing test selector for ${placement.target}`);
    expect(await zone.evaluate((element, selector) => element.closest(selector) !== null, targetSelector)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("complete server shell, native draft, and component identities survive delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/admin", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const app = page.locator(".sheen-admin-app");
    const sidebarOwner = page.locator(".sheen-sidebar-nav");
    const navigationSection = page.locator(".sheen-sidebar-navigation > section").first();
    const navigation = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    const row = page.locator('tbody tr[data-row-id="account-0001"]');
    const search = page.getByRole("searchbox", { name: "Search application", exact: true });
    await app.evaluate(element => element.setAttribute("data-server-identity", "app"));
    await sidebarOwner.evaluate(element => element.setAttribute("data-server-identity", "sidebar"));
    await navigationSection.evaluate(element => element.setAttribute("data-server-identity", "section"));
    await navigation.evaluate(element => element.setAttribute("data-server-identity", "navigation"));
    await row.evaluate(element => element.setAttribute("data-server-identity", "row"));
    await search.evaluate(element => element.setAttribute("data-server-identity", "search"));
    await search.fill("typed before hydration");
    release();
    await ready(page);
    await expect(app).toHaveAttribute("data-server-identity", "app");
    await expect(sidebarOwner).toHaveAttribute("data-server-identity", "sidebar");
    await expect(navigationSection).toHaveAttribute("data-server-identity", "section");
    await expect(navigation).toHaveAttribute("data-server-identity", "navigation");
    await expect(row).toHaveAttribute("data-server-identity", "row");
    await expect(search).toHaveAttribute("data-server-identity", "search");
    await expect(search).toHaveValue("typed before hydration");
    await expect(search).toBeFocused();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test("server-resolved collapsed sidebar hydrates without identity or geometry shift", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/admin?sidebar=collapsed", { waitUntil: "commit" });
    const app = page.locator(".sheen-admin-app");
    const sidebar = page.locator(".sheen-shell-sidebar");
    const navigation = page.locator(".sheen-sidebar-nav");
    await expect(app).toHaveAttribute("data-sidebar-collapsed", "true");
    await expect(navigation).toHaveAttribute("data-collapsed", "true");
    await sidebar.evaluate(element => element.setAttribute("data-collapse-identity", "retained"));
    const before = await sidebar.evaluate(element => element.getBoundingClientRect().width);
    release();
    await ready(page);
    await expect(sidebar).toHaveAttribute("data-collapse-identity", "retained");
    await expect(app).toHaveAttribute("data-sidebar-collapsed", "true");
    expect(await sidebar.evaluate(element => element.getBoundingClientRect().width)).toBe(before);
  } finally {
    release();
  }
});

test("collapsed Admin rail keeps every destination centered and clickable", async ({ page }) => {
  await page.goto("/admin?sidebar=collapsed");
  await ready(page);
  const app = page.locator(".sheen-admin-app");
  const sidebar = page.locator(".sheen-shell-sidebar");
  const navigation = sidebar.locator(".sheen-sidebar-navigation");
  await expect(sidebar).toHaveCSS("width", "48px");
  await expect(navigation.getByRole("button", { name: "Accounts actions", exact: true })).toBeHidden();
  const geometry = await sidebar.evaluate(element => {
    const rail = element.getBoundingClientRect();
    const center = rail.left + rail.width / 2;
    return [...element.querySelectorAll<HTMLElement>(".sheen-sidebar-navigation .sheen-nav-item")].map(link => {
      const icon = link.querySelector<HTMLElement>(".sheen-nav-item-icon");
      const linkBox = link.getBoundingClientRect();
      const iconBox = icon?.getBoundingClientRect();
      const hit = document.elementFromPoint(linkBox.left + linkBox.width / 2, linkBox.top + linkBox.height / 2);
      return { iconOffset: iconBox ? iconBox.left + iconBox.width / 2 - center : Number.POSITIVE_INFINITY, centerSelectsLink: hit?.closest("a") === link };
    });
  });
  expect(geometry.length).toBeGreaterThan(4);
  expect(geometry.every(item => Math.abs(item.iconOffset) <= 0.5 && item.centerSelectsLink)).toBe(true);

  await navigation.getByRole("link", { name: "Accounts 240", exact: true }).click();
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe("/admin/accounts");
  await expect.poll(() => page.evaluate(() => new URLSearchParams(location.search).get("sidebar"))).toBe("collapsed");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts", exact: true })).toBeVisible();
  await expect(app).toHaveAttribute("data-sidebar-collapsed", "true");
  await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => new URLSearchParams(location.search).has("sidebar"))).toBe(false);
  const accountRow = page.locator(".sheen-nav-item-row").filter({ has: page.getByRole("link", { name: "Accounts 240", exact: true }) });
  await accountRow.hover();
  await expect(accountRow.getByRole("button", { name: "Accounts actions", exact: true })).toBeVisible();
});

test("accepted refresh keeps page, row, details, focus, and an uncontrolled draft visible", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/admin");
  await ready(page);
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  await row.focus();
  await page.keyboard.press("Enter");
  const details = page.locator(".sheen-admin-details-owner");
  const note = page.getByRole("textbox", { name: "Account note", exact: true });
  const tableViewport = page.locator(".sheen-data-table-viewport");
  await expect(details).toHaveAttribute("data-presentation", "docked");
  await details.evaluate(element => element.setAttribute("data-refresh-identity", "details"));
  await row.evaluate(element => element.setAttribute("data-refresh-identity", "row"));
  await page.locator("[data-admin-starter-content]").evaluate(element => element.setAttribute("data-refresh-identity", "page"));
  await note.fill("Keep this detail draft");
  await note.evaluate(element => element.setAttribute("data-refresh-identity", "note"));
  await note.focus();
  await tableViewport.evaluate(element => { element.scrollTop = 180; });
  const retainedScroll = await tableViewport.evaluate(element => element.scrollTop);
  expect(retainedScroll).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Refresh", exact: true }).first().evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Refresh trigger must be a button");
    element.click();
  });
  await expect(page.locator(".sheen-admin-page")).toHaveAttribute("data-pending", "true");
  const frames = await page.locator("[data-admin-starter-content]").evaluate(async element => {
    const samples: boolean[] = [];
    for (let index = 0; index < 36; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const style = getComputedStyle(element);
      const draft = document.querySelector('[data-refresh-identity="note"]');
      samples.push(element.isConnected
        && style.display !== "none"
        && style.visibility !== "hidden"
        && style.opacity === "1"
        && document.querySelector('[data-refresh-identity="details"]') !== null
        && document.querySelector('[data-refresh-identity="row"]') !== null
        && draft instanceof HTMLInputElement
        && draft.value === "Keep this detail draft"
        && !element.querySelector(".sheen-skeleton"));
    }
    return samples;
  });
  expect(frames.every(Boolean)).toBe(true);
  await expect(page.getByText("Revision 2", { exact: false }).last()).toBeVisible();
  await expect(details).toHaveAttribute("data-refresh-identity", "details");
  await expect(row).toHaveAttribute("data-refresh-identity", "row");
  await expect(row).toContainText("just now");
  await expect(note).toHaveAttribute("data-refresh-identity", "note");
  await expect(note).toHaveValue("Keep this detail draft");
  await expect(note).toBeFocused();
  expect(await tableViewport.evaluate(element => element.scrollTop)).toBe(retainedScroll);

  const separator = page.getByRole("separator", { name: "Resize details panel", exact: true });
  const before = Number(await separator.getAttribute("aria-valuenow"));
  await separator.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(separator).toHaveAttribute("aria-valuenow", String(before - 16));
  await note.focus();
  await page.setViewportSize({ width: 800, height: 800 });
  await expect(details).toHaveAttribute("data-presentation", "sheet");
  await expect(details).toHaveAttribute("data-refresh-identity", "details");
  await expect(page.getByRole("dialog", { name: "Aperture 001", exact: true })).toBeVisible();
  await expect(note).toHaveAttribute("data-refresh-identity", "note");
  await expect(note).toHaveValue("Keep this detail draft");
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();
});

test("scoped account, notification, command, confirm, and toast layers restore focus", async ({ page }) => {
  const hiddenFocusWarnings: string[] = [];
  page.on("console", message => {
    if (message.type() === "warning" && message.text().includes("Blocked aria-hidden on an element because its descendant retained focus")) hiddenFocusWarnings.push(message.text());
  });
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/admin");
  await ready(page);

  const account = page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true });
  await account.click();
  const accountMenu = page.getByRole("menu");
  await expectScopedOverlay(accountMenu);
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();

  const notifications = page.getByRole("button", { name: "Notifications 2", exact: true });
  await notifications.click();
  const notificationPanel = page.locator(".sheen-admin-notification-popover");
  await expectScopedOverlay(notificationPanel);
  await page.keyboard.press("Escape");
  await expect(notifications).toBeFocused();

  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog", { name: "Command palette", exact: true });
  await expectScopedOverlay(palette);
  await page.keyboard.press("Escape");

  const confirmTrigger = page.getByRole("button", { name: "Reset view", exact: true });
  await confirmTrigger.click();
  const confirmation = page.getByRole("alertdialog", { name: "Reset demo view?", exact: true });
  await expectScopedOverlay(confirmation);
  await confirmation.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".sheen-toast-title", { hasText: "Demo view reset" })).toBeVisible();
  await expect(confirmTrigger).toBeFocused();
  expect(hiddenFocusWarnings).toEqual([]);
});

test("authorization loss synchronously clears protected chrome, table, and details", async ({ page }) => {
  await page.goto("/admin");
  await ready(page);
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sheen-admin-details-owner")).toBeVisible();
  await page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Revoke demo access", exact: true }).click();
  await expect(page.getByRole("region", { name: "Access revoked", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-admin-details-owner")).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Notifications/u })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Command/u })).toHaveCount(0);
  await page.getByRole("button", { name: "Restore demo access", exact: true }).click();
  await expect(page.locator('tbody tr[data-row-id="account-0001"]')).toBeVisible();
  await expect(page.locator(".sheen-admin-details-owner")).toHaveCount(0);
});

test("live brand controls update inherited axes without remounting the shell", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin");
  await ready(page);
  const app = page.locator(".sheen-admin-app");
  const scope = page.locator(".sheen-admin-scope");
  await app.evaluate(element => element.setAttribute("data-brand-identity", "retained"));
  await scope.evaluate(element => element.setAttribute("data-brand-scope", "retained"));
  await page.getByText("Customize starter", { exact: true }).click();

  await page.getByRole("button", { name: /^Theme /u }).click();
  await page.getByRole("option", { name: "Graphite", exact: true }).click();
  await expect(scope).toHaveAttribute("data-sheen-theme", "graphite");
  await page.getByRole("button", { name: /^Accent /u }).click();
  await page.getByRole("option", { name: "Rose", exact: true }).click();
  await expect(scope).toHaveAttribute("data-sheen-accent", "rose");
  await page.getByRole("button", { name: "Chrome Layered", exact: true }).click();
  await page.getByRole("option", { name: "Tonal", exact: true }).click();
  await page.getByRole("button", { name: /^Navigation /u }).click();
  await page.getByRole("option", { name: "Indicator", exact: true }).click();
  await page.getByRole("button", { name: /^Chrome controls /u }).click();
  await page.getByRole("option", { name: "Accent", exact: true }).click();
  await page.getByRole("button", { name: /^Primary navigation placement /u }).click();
  await page.getByRole("option", { name: "Topbar center", exact: true }).click();
  await page.getByRole("button", { name: /^Account placement /u }).click();
  await page.getByRole("option", { name: "Sidebar footer", exact: true }).click();

  await expect(app).toHaveAttribute("data-brand-identity", "retained");
  await expect(scope).toHaveAttribute("data-brand-scope", "retained");
  await expect(app).toHaveAttribute("data-admin-chrome", "tonal");
  await expect(app).toHaveAttribute("data-admin-navigation", "indicator");
  await expect(app).toHaveAttribute("data-admin-actions", "accent");
  await expect(page.locator('.sheen-admin-topbar-center [data-admin-zone="primary-navigation"]')).toHaveCount(1);
  await expect(page.locator('.sheen-sidebar-footer [data-admin-zone="account"]')).toHaveCount(1);
  const portal = scope.locator(':scope > [data-sheen-portal="scope"]');
  await expect(portal).toHaveAttribute("data-sheen-theme", "graphite");
  await expect(portal).toHaveAttribute("data-sheen-accent", "rose");
  expect(errors).toEqual([]);
});

test("phone RTL layout hands the retained sidebar to a full drawer and keeps continuous cards functional", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin?preset=workspace&place-account=sidebar-footer&table=continuous&direction=rtl");
  await ready(page);
  const scope = page.locator(".sheen-admin-scope");
  await expect(scope).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".sheen-data-table-mobile-card").first()).toBeVisible();
  const toggle = page.locator(".sheen-sidebar-toggle-mobile");
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("navigation", { name: "Primary navigation", exact: true })).toBeVisible();
  const account = drawer.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true });
  await account.click();
  const menu = page.getByRole("menu");
  await expectScopedOverlay(menu);
  const triggerBox = await account.boundingBox();
  const menuBox = await menu.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  if (triggerBox && menuBox) expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(triggerBox.y + 2);
  await page.keyboard.press("Escape");
  await expect(page.locator(".sheen-admin-account-menu")).toHaveCount(0);
  await expect(account).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("AdminApp presets and meaningful open states have no automated WCAG A or AA violations", async ({ page }) => {
  test.slow();
  for (const preset of presets) {
    await page.goto(preset.path);
    await ready(page);
    await expectNoAxeViolations(page, preset.name);
  }
  await page.goto("/admin?table=continuous&chrome=tonal&navigation=accent&actions=accent");
  await ready(page);
  await page.getByRole("button", { name: "Notifications 2", exact: true }).click();
  await expectNoAxeViolations(page, "continuous table and notification popover");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true }).click();
  await expectNoAxeViolations(page, "account menu");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+K");
  await expectNoAxeViolations(page, "command palette");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  const confirm = page.getByRole("alertdialog", { name: "Reset demo view?", exact: true });
  await expectNoAxeViolations(page, "confirmation dialog");
  await confirm.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".sheen-toast-title", { hasText: "Demo view reset" })).toBeVisible();
  await expectNoAxeViolations(page, "toast");
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  await row.focus();
  await page.keyboard.press("Enter");
  await expectNoAxeViolations(page, "docked details");
  await page.setViewportSize({ width: 800, height: 800 });
  await expect(page.locator(".sheen-admin-details-owner")).toHaveAttribute("data-presentation", "sheet");
  await expectNoAxeViolations(page, "details Sheet");
});

for (const state of ["empty", "loading", "error", "permission"] as const) {
  test(`${state} AdminApp state has no automated WCAG A or AA violations`, async ({ page }) => {
    await page.goto(`/admin?state=${state}`);
    await ready(page);
    await expectNoAxeViolations(page, `${state} application state`);
  });
}

test("keyboard traversal reaches shell, navigation, table, pagination, and details operations", async ({ page }) => {
  await page.goto("/admin");
  await ready(page);
  const reached = new Set<string>();
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press("Tab");
    const marker = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return "none";
      if (active.matches(".sheen-sidebar-toggle-desktop")) return "sidebar-toggle";
      if (active.matches('.sheen-nav-item[href="/admin"]')) return "navigation";
      if (active.matches("input") && active.closest(".sheen-admin-topbar")) return "application-search";
      if (active.matches("input") && active.closest(".sheen-data-table")) return "table-search";
      if (active.matches(".sheen-data-table-sort")) return "table-sort";
      if (active.matches('tbody tr[data-row-id="account-0001"]')) return "table-row";
      if (active.textContent?.trim() === "Next page") return "pagination";
      if (active.textContent?.trim() === "Reset view") return "page-action";
      return "other";
    });
    reached.add(marker);
  }
  expect([...reached]).toEqual(expect.arrayContaining(["sidebar-toggle", "navigation", "application-search", "table-search", "table-sort", "table-row", "pagination", "page-action"]));

  const tableSearch = page.getByRole("searchbox", { name: "Search Northstar accounts", exact: true });
  await tableSearch.focus();
  await tableSearch.fill("Aperture");
  await expect(page.locator(".sheen-data-table-result-count")).toContainText("40 results");
  await tableSearch.fill("");
  const accountSort = page.getByRole("columnheader", { name: /Account/u });
  await accountSort.locator(".sheen-data-table-sort").focus();
  await page.keyboard.press("Enter");
  await expect(accountSort).toHaveAttribute("aria-sort", "ascending");
  const pagination = page.getByRole("navigation", { name: "Pagination", exact: true });
  const next = pagination.getByRole("button", { name: "Next page", exact: true });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(pagination.getByRole("status")).toHaveText("Page 2 of 10");
  const firstRow = page.locator("tbody tr[data-row-id]").first();
  await firstRow.focus();
  await page.keyboard.press("Enter");
  const resize = page.getByRole("separator", { name: "Resize details panel", exact: true });
  await resize.focus();
  const before = Number(await resize.getAttribute("aria-valuenow"));
  await page.keyboard.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", String(before + 16));
});

test("leading apostrophe matches a literal phrase within an account cell", async ({ page }) => {
  await page.goto("/admin/accounts");
  await ready(page);
  const search = page.getByRole("searchbox", { name: "Search Northstar accounts", exact: true });
  await search.fill("'Aperture");
  await expect(page.getByRole("button", { name: "Search match mode: Exact", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-data-table-result-count")).toContainText("40 results");
  await expect(page.locator('tbody tr[data-row-id="account-0001"]')).toContainText("Aperture 001");
});

test("horizontal AdminApp navigation follows arrow and boundary keys", async ({ page }) => {
  await page.goto("/admin?preset=horizontal");
  await ready(page);
  const overview = page.getByRole("navigation", { name: "Primary navigation", exact: true }).getByRole("link", { name: "Overview", exact: true });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("link", { name: "Accounts 240", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeFocused();
});

for (const preset of ["workspace", "inspector"] as const) {
  test(`${preset} AdminApp account menu is keyboard operable`, async ({ page }) => {
    await page.goto(`/admin?preset=${preset}`);
    await ready(page);
    const navigation = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    await navigation.getByRole("link", { name: "Overview", exact: true }).focus();
    await expect(navigation.getByRole("link", { name: "Overview", exact: true })).toBeFocused();
    const account = page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true });
    await account.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(account).toBeFocused();
  });
}

test("forced colors and reduced motion preserve non-color state and suppress transient animation", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 800, height: 800 });
  await page.goto("/admin?navigation=indicator");
  await ready(page);
  const current = page.locator('.sheen-nav-item[aria-current="page"]');
  await current.focus();
  const currentStyle = await current.evaluate(element => {
    const style = getComputedStyle(element);
    return { border: style.borderInlineStartWidth, borderColor: style.borderInlineStartColor, outline: style.outlineStyle };
  });
  expect(currentStyle.border).toBe("2px");
  expect(currentStyle.borderColor).not.toBe("transparent");
  expect(currentStyle.outline).toBe("solid");
  const row = page.locator('tbody tr[data-row-id="account-0001"]');
  await row.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Aperture 001", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+K");
  await expect(page.locator(".sheen-command-dialog")).toHaveCSS("animation-name", "none");
});

test("200 and 400 percent reflow equivalents retain long RTL content without document overflow or obscured focus", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.goto("/admin?preset=workspace&place-account=sidebar-footer&table=continuous&direction=rtl&content=long");
  await ready(page);
  const pageOwner = page.locator("[data-admin-starter-content]");
  await pageOwner.evaluate(element => element.setAttribute("data-reflow-identity", "retained"));
  await expect(page.locator(".sheen-data-table-mobile-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 320, height: 700 });
  await expect(pageOwner).toHaveAttribute("data-reflow-identity", "retained");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const toggle = page.locator(".sheen-sidebar-toggle-mobile");
  await toggle.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(drawer).toBeVisible();
  const longWorkspace = drawer.getByRole("button", { name: /Production for the International/u });
  await longWorkspace.focus();
  const focusGeometry = await longWorkspace.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const visible = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, bounds.left + bounds.width / 2)), Math.max(0, Math.min(innerHeight - 1, bounds.top + bounds.height / 2)));
    return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left, visible: visible === element || element.contains(visible) };
  });
  expect(focusGeometry.top).toBeGreaterThanOrEqual(0);
  expect(focusGeometry.left).toBeGreaterThanOrEqual(0);
  expect(focusGeometry.right).toBeLessThanOrEqual(320);
  expect(focusGeometry.bottom).toBeLessThanOrEqual(700);
  expect(focusGeometry.visible).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
