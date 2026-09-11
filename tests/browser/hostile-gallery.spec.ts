import { expect, test } from "@playwright/test";

test("hostile content remains bounded with a virtualized 100k-row table", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/gallery/hostile");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.locator("[data-hostile-long]")).toHaveText(/^\d{500}$/u);
  await expect(page.locator("[data-hostile-zero-width]")).toHaveText(/^alpha.*beta/u);
  await expect(page.locator("[data-hostile-rtl]")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("table", { name: "Hostile accounts", exact: true })).toHaveAttribute("aria-rowcount", "100001");
  await expect(page.getByText("Account 100000", { exact: true })).toHaveCount(0);
  const streaming = page.locator('[data-hostile-streaming="ready"]');
  await expect(streaming.getByRole("img", { name: "Hostile streaming signals", exact: true })).toBeVisible();
  await expect(streaming.locator(".sheen-chart-legend-toggle")).toHaveCount(12);
  const legend = streaming.locator(".sheen-chart-legend");
  await expect(legend.locator('.sheen-chart-legend-marker[data-encoding="dashed"]')).toHaveCount(4);
  await expect(legend.locator('.sheen-chart-legend-marker[data-encoding="dotted"]')).toHaveCount(3);
  await expect(legend.locator('.sheen-chart-legend-marker[data-encoding="dash-dot"]')).toHaveCount(3);
  const initialRows = Number((await streaming.getByRole("status").getByText(/^Buffered:/u).textContent())?.replace(/\D/gu, ""));
  await expect.poll(async () => Number((await streaming.getByRole("status").getByText(/^Buffered:/u).textContent())?.replace(/\D/gu, ""))).toBeGreaterThan(initialRows);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("the 200-item menu reaches its deepest actions by keyboard and stays viewport-bounded", async ({ page }) => {
  await page.goto("/gallery/hostile");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const trigger = page.getByRole("button", { name: "Open 200-item menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  for (let depth = 1; depth <= 7; depth += 1) {
    await expect(page.getByRole("menuitem", { name: new RegExp(`^Level ${depth} `, "u") })).toBeFocused();
    await page.keyboard.press("ArrowRight");
  }
  const first = page.getByRole("menuitem", { name: /^First action /u });
  await expect(first).toBeFocused();
  const bounds = await first.locator("xpath=ancestor::*[@role='menu'][1]").boundingBox();
  expect(bounds).not.toBeNull();
  expect((bounds?.height ?? Number.POSITIVE_INFINITY) <= 0.7 * 720 + 2).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Selected hostile action", exact: true })).toHaveText("hostile-action-1");
});

test("phone presentation bounds pathological text and pages cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gallery/hostile");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const cards = page.getByRole("list", { name: "Hostile accounts, card view", exact: true });
  await expect(cards).toBeVisible();
  await expect(cards.getByRole("listitem")).toHaveCount(20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
