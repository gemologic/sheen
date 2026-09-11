import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

interface QualificationCase {
  readonly name: string;
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly direction: "ltr" | "rtl";
  readonly theme: "obsidian" | "paper" | "slate" | "contrast";
  readonly mode: "dark" | "light";
  readonly accent: "jade" | "rose" | "amber" | "blue";
}

const cases: readonly QualificationCase[] = [
  { name: "standard-desktop-ltr", path: "/admin", width: 1280, height: 800, direction: "ltr", theme: "obsidian", mode: "dark", accent: "jade" },
  { name: "workspace-tablet-rtl", path: "/admin?preset=workspace&place-account=sidebar-footer", width: 768, height: 1024, direction: "rtl", theme: "paper", mode: "light", accent: "rose" },
  { name: "horizontal-phone-ltr", path: "/admin?preset=horizontal&table=continuous", width: 390, height: 844, direction: "ltr", theme: "slate", mode: "dark", accent: "amber" },
  { name: "inspector-phone-rtl", path: "/admin?preset=inspector&content=long", width: 320, height: 700, direction: "rtl", theme: "contrast", mode: "light", accent: "blue" },
];

function qualifiedPath(entry: QualificationCase): string {
  const url = new URL(entry.path, "http://loupe.test");
  url.searchParams.set("direction", entry.direction);
  url.searchParams.set("theme", entry.theme);
  url.searchParams.set("mode", entry.mode);
  url.searchParams.set("accent", entry.accent);
  return `${url.pathname}${url.search}`;
}

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-admin-app")).toBeVisible();
}

test("the bounded application matrix covers every preset, viewport class, direction, and mode", () => {
  expect(new Set(cases.map(entry => new URL(entry.path, "http://loupe.test").searchParams.get("preset") ?? "standard"))).toEqual(new Set(["standard", "workspace", "horizontal", "inspector"]));
  expect(new Set(cases.map(entry => entry.direction))).toEqual(new Set(["ltr", "rtl"]));
  expect(new Set(cases.map(entry => entry.mode))).toEqual(new Set(["dark", "light"]));
  expect(cases.some(entry => entry.width >= 1024)).toBe(true);
  expect(cases.some(entry => entry.width >= 768 && entry.width < 1024)).toBe(true);
  expect(cases.some(entry => entry.width < 768)).toBe(true);
});

for (const entry of cases) {
  test(`${entry.name} is operable, accessible, bounded, and visually stable`, async ({ page }) => {
    await page.setViewportSize({ width: entry.width, height: entry.height });
    await page.goto(qualifiedPath(entry));
    await ready(page);

    const scope = page.locator(".sheen-admin-scope");
    await expect(scope).toHaveAttribute("dir", entry.direction);
    await expect(scope).toHaveAttribute("data-sheen-theme", entry.theme);
    await expect(scope).toHaveAttribute("data-sheen-mode", entry.mode);
    await expect(scope).toHaveAttribute("data-sheen-accent", entry.accent);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
    expect(await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return false;
      const bounds = active.getBoundingClientRect();
      return bounds.top >= 0 && bounds.left >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight;
    })).toBe(true);

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations).toEqual([]);
    await expect(page).toHaveScreenshot(`qualification-${entry.name}.png`, { animations: "disabled" });
  });
}
