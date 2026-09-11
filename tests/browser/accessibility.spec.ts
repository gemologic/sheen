import { readdirSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const routesRoot = join(process.cwd(), "apps", "loupe", "src", "routes");
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

function routeFiles(directory: string, prefix = ""): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...routeFiles(join(directory, entry.name), relative));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(relative);
  }
  return files;
}

function routeForFile(file: string): string {
  if (file === "admin/[view].tsx") return "/admin/accounts";
  if (file === "components/[name].tsx") return "/components/Button";
  if (file === "sidebar/[...path].tsx") return "/sidebar/home";
  if (file.includes("[")) throw new Error(`Accessibility inventory needs a representative URL for ${file}`);
  const path = file.slice(0, -4).replace(/(?:^|\/)index$/u, "");
  return path ? `/${path}` : "/";
}

const baseRoutes = Object.freeze(routeFiles(routesRoot).map(routeForFile).sort());

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]').last()).toHaveAttribute("data-sheen-ready", "true");
}

async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags([...axeTags]).analyze();
  const summary = result.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target.join(" ")) }));
  expect(summary, label).toEqual([]);
}

test("the route-derived accessibility inventory has no duplicates", () => {
  expect(new Set(baseRoutes).size).toBe(baseRoutes.length);
  expect(baseRoutes.length).toBeGreaterThan(100);
});

for (const route of baseRoutes) {
  test(`base route ${route} has no automated WCAG A/AA violations`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(route);
    await ready(page);
    await expectNoAxeViolations(page, route);
  });
}

const operationalStates: readonly { readonly label: string; readonly path: string }[] = [
  { label: "AdminApp empty", path: "/admin?state=empty" },
  { label: "AdminApp cold loading", path: "/admin?state=loading" },
  { label: "AdminApp server error", path: "/admin?state=error" },
  { label: "AdminApp permission denied", path: "/admin?state=permission" },
  { label: "dashboard empty", path: "/gallery/dashboard?state=empty" },
  { label: "dashboard cold loading", path: "/gallery/dashboard?state=loading" },
  { label: "dashboard server error", path: "/gallery/dashboard?state=error" },
  { label: "dashboard permission denied", path: "/gallery/dashboard?state=permission" },
  ...["form", "list-detail", "reading", "settings"].flatMap(shape => [
    { label: `${shape} empty`, path: `/gallery/${shape}?state=empty` },
    { label: `${shape} cold loading`, path: `/gallery/${shape}?state=loading` },
    { label: `${shape} server error`, path: `/gallery/${shape}?state=error` },
    { label: `${shape} permission denied`, path: `/gallery/${shape}?state=permission` },
  ]),
  { label: "DataTable empty", path: "/data-table-page?rows=empty" },
  { label: "DataTable cold loading", path: "/data-table-page?page=cold" },
  { label: "DataTable server error", path: "/data-table-page?page=server-error" },
  { label: "DataTable permission denied", path: "/data-table-page?page=permission-denied" },
];

for (const state of operationalStates) {
  test(`${state.label} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(state.path);
    await ready(page);
    await expectNoAxeViolations(page, state.label);
  });
}

interface OpenState {
  readonly label: string;
  readonly path: string;
  readonly prepare: (page: Page) => Promise<void>;
}

const openStates: readonly OpenState[] = [
  { label: "command palette", path: "/command-palette", prepare: async page => {
    await page.getByRole("button", { name: "Open palette", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Command palette", exact: true })).toBeVisible();
  } },
  { label: "dialog", path: "/dialogs", prepare: async page => {
    await page.getByRole("button", { name: "Open settings", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
  } },
  { label: "drawer", path: "/drawer", prepare: async page => {
    await page.getByRole("button", { name: "Open start drawer", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Start panel", exact: true })).toBeVisible();
  } },
  { label: "popover", path: "/floating", prepare: async page => {
    await page.getByRole("button", { name: "Open view options", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "View options", exact: true })).toBeVisible();
  } },
  { label: "menu", path: "/menus", prepare: async page => {
    await page.getByRole("button", { name: "Workspace actions", exact: true }).click();
    await expect(page.getByRole("menu")).toBeVisible();
  } },
  { label: "select", path: "/select", prepare: async page => {
    await page.getByRole("button", { name: "Cadence Live", exact: true }).click();
    await expect(page.getByRole("listbox", { name: "Cadence", exact: true })).toBeVisible();
  } },
  { label: "combobox results", path: "/combobox", prepare: async page => {
    await page.getByRole("combobox", { name: "Async owner", exact: true }).fill("lin");
    await expect(page.getByRole("option", { name: "Linus Torvalds", exact: true })).toBeVisible();
  } },
  { label: "calendar picker", path: "/date-time", prepare: async page => {
    await page.locator(".loupe-date-grid > .sheen-surface").first().getByRole("button", { name: "Open calendar", exact: true }).first().click();
    await expect(page.locator('.sheen-date-content[data-state="open"]')).toBeVisible();
  } },
  { label: "toast card", path: "/toast", prepare: async page => {
    await page.getByRole("button", { name: "Root show", exact: true }).click();
    await expect(page.getByRole("group", { name: "Root saved", exact: true })).toBeVisible();
  } },
  { label: "toaster stack", path: "/toaster", prepare: async page => {
    await page.getByRole("button", { name: "Show stack", exact: true }).click();
    await expect(page.getByRole("region", { name: "Notifications", exact: true })).toBeVisible();
  } },
  { label: "saved-view dialog", path: "/data-table-page", prepare: async page => {
    await page.locator(".sheen-data-table-page-views > [data-sheen-menu-trigger]").click();
    await page.getByRole("menuitem", { name: "Save current view", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Save current view", exact: true })).toBeVisible();
  } },
  { label: "edit failure", path: "/table-edit", prepare: async page => {
    const cell = page.getByRole("region", { name: "Editable DataTable", exact: true }).locator('td[data-column="title"]');
    await cell.locator("span[tabindex='0']").focus();
    const editor = page.getByRole("textbox", { name: "Edit Title for row row-1", exact: true });
    await editor.fill("transport failure");
    await editor.press("Enter");
    await expect(page.getByRole("group", { name: "Cell update failed", exact: true })).toBeVisible();
  } },
  { label: "AdminApp notifications", path: "/admin", prepare: async page => {
    await page.getByRole("button", { name: "Notifications 2", exact: true }).click();
    await expect(page.locator(".sheen-admin-notification-popover")).toBeVisible();
  } },
  { label: "AdminApp account menu", path: "/admin", prepare: async page => {
    await page.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true }).click();
    await expect(page.getByRole("menu")).toBeVisible();
  } },
  { label: "AdminApp command palette", path: "/admin", prepare: async page => {
    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: "Command palette", exact: true })).toBeVisible();
  } },
  { label: "AdminApp details", path: "/admin", prepare: async page => {
    const row = page.locator('tbody tr[data-row-id="account-0001"]');
    await row.focus();
    await row.press("Enter");
    await expect(page.locator(".sheen-admin-details-owner")).toBeVisible();
  } },
];

for (const state of openStates) {
  test(`open ${state.label} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(state.path);
    await ready(page);
    await state.prepare(page);
    await expectNoAxeViolations(page, state.label);
  });
}
