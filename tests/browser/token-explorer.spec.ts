import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.getByRole("status", { name: "--sheen-color-bg computed value", exact: true })).not.toHaveText("pending");
}

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.locator(".sheen-select-listbox").getByRole("option", { name: option, exact: true }).click();
}

test("token explorer filters the complete catalog by token and manifest consumer", async ({ page }) => {
  await page.goto("/tokens");
  await ready(page);
  const count = page.getByRole("status", { name: "Visible token count", exact: true });
  const total = Number((await count.textContent())?.match(/(\d+) total/u)?.[1]);
  expect(total).toBeGreaterThan(200);
  await expect(page.locator(".loupe-token-item")).toHaveCount(48);
  await page.getByRole("button", { name: "Show 48 more tokens", exact: true }).click();
  await expect(page.locator(".loupe-token-item")).toHaveCount(96);
  const filter = page.getByRole("searchbox", { name: "Filter tokens or consuming component", exact: true });
  await filter.fill("ListDetailLayout");
  await expect(page.locator(".loupe-token-item")).not.toHaveCount(0);
  expect((await page.locator(".loupe-token-item").allTextContents()).every(item => item.includes("ListDetailLayout"))).toBe(true);
  await filter.fill("gray.980");
  await expect(page.locator(".loupe-token-item")).toHaveCount(1);
  await expect(page.locator('[data-token="--sheen-gray-980"]')).toContainText("No direct component consumers");
});

test("theme changes retain token rows while computed values, WCAG matrix, and simulated palettes refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/tokens");
  await ready(page);
  const item = page.locator('[data-token="--sheen-color-bg"]');
  const value = page.getByRole("status", { name: "--sheen-color-bg computed value", exact: true });
  const before = await value.textContent();
  await item.evaluate(element => element.setAttribute("data-token-identity", "retained"));
  await choose(page, "Theme", "Slate");
  await choose(page, "Accent", "rose");
  await choose(page, "Mode", "Light");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-theme", "slate");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "rose");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
  await expect.poll(() => value.textContent()).not.toBe(before);
  await expect(item).toHaveAttribute("data-token-identity", "retained");
  await page.locator(".loupe-token-overview .sheen-segmented-item").filter({ hasText: "Contrast" }).click();
  await expect(page.getByRole("status", { name: "color-fg on color-bg WCAG ratio", exact: true })).toHaveText(/\d+\.\d{2}:1/u);
  await expect(page.getByRole("status", { name: "color-fg on color-bg APCA lightness contrast", exact: true })).toHaveText(/^Lc [−+]\d+\.\d$/u);
  await expect(page.locator('.loupe-token-matrix-scroll td[data-wcag-pass="false"]')).not.toHaveCount(0);
  await page.locator(".loupe-token-overview .sheen-segmented-item").filter({ hasText: "Chart palettes" }).click();
  await expect(page.locator(".loupe-token-palettes > section")).toHaveCount(5);
  await expect(page.getByRole("region", { name: "normal chart palette", exact: true }).locator("span")).toHaveCount(8);
  await expect(page.getByRole("region", { name: "protanopia chart palette", exact: true }).locator("span")).toHaveCount(8);
  const palettes = await page.locator(".loupe-token-palettes > section > div").evaluateAll(elements => elements.map(element => getComputedStyle(element.firstElementChild ?? element).backgroundColor));
  expect(new Set(palettes).size).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test("token rows rendered on the server survive delayed hydration before computed values arrive", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/tokens", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const item = page.locator('[data-token="--sheen-color-bg"]');
    const header = page.locator(".loupe-workbench-header");
    await expect(item).toBeVisible();
    await expect(header).toBeVisible();
    await expect(page.getByRole("status", { name: "--sheen-color-bg computed value", exact: true })).toHaveText("pending");
    await expect(page.getByRole("heading", { name: "Foreground by background contrast", exact: true })).toHaveCount(0);
    await item.evaluate(element => element.setAttribute("data-server-token", "retained"));
    await header.evaluate(element => element.setAttribute("data-server-header", "retained"));
    release();
    await ready(page);
    await expect(item).toHaveAttribute("data-server-token", "retained");
    await expect(header).toHaveAttribute("data-server-header", "retained");
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    expect(errors).toEqual([]);
  } finally { release(); }
});
