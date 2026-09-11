import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

test("localized numeric controls expose exact keyboard and tuple behavior", async ({ page }) => {
  await page.goto("/numeric-controls");
  await ready(page);
  const budget = page.getByRole("spinbutton", { name: "Budget", exact: true });
  await expect(budget).toHaveValue("1.234,50 €");
  await budget.press("ArrowUp");
  await expect(page.getByRole("status", { name: "Raw budget" })).toHaveText("1235");
  const threshold = page.getByRole("slider", { name: "Threshold", exact: true });
  await threshold.press("ArrowRight");
  await expect(threshold).toHaveAttribute("aria-valuenow", "30");
  await expect(page.getByRole("status", { name: "Raw threshold" })).toHaveText("30");
  const minimum = page.getByRole("slider", { name: "Minimum Window", exact: true });
  const maximum = page.getByRole("slider", { name: "Maximum Window", exact: true });
  await minimum.press("ArrowRight");
  await maximum.press("End");
  await expect(page.getByRole("status", { name: "Raw window" })).toHaveText("25,100");
});

test("background refresh retains numeric controls, values, and nonblank frames", async ({ page }) => {
  await page.goto("/numeric-controls");
  await ready(page);
  const surface = page.locator(".loupe-numeric-surface");
  const budget = page.getByRole("spinbutton", { name: "Budget", exact: true });
  const threshold = page.getByRole("slider", { name: "Threshold", exact: true });
  await surface.evaluate(element => element.setAttribute("data-retained-surface", "yes"));
  await budget.evaluate(element => element.setAttribute("data-retained-budget", "yes"));
  await threshold.evaluate(element => element.setAttribute("data-retained-threshold", "yes"));
  await threshold.press("ArrowRight");
  await page.getByRole("button", { name: "Refresh constraints", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Refreshing constraints" })).toBeVisible();
  const frames = await surface.evaluate(async element => {
    const samples: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push(element.textContent ?? "");
    }
    return samples;
  });
  expect(frames.every(frame => frame.includes("Budget") && frame.includes("Threshold") && frame.includes("Window"))).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Accepted revision 1" })).toBeVisible();
  await expect(surface).toHaveAttribute("data-retained-surface", "yes");
  await expect(budget).toHaveAttribute("data-retained-budget", "yes");
  await expect(threshold).toHaveAttribute("data-retained-threshold", "yes");
  await expect(threshold).toHaveAttribute("aria-valuenow", "30");
});

test("server numeric controls are complete without scripts", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/numeric-controls");
    await expect(page.locator("html")).not.toHaveAttribute("data-sheen-mode", /.+/u);
    await expect(page.locator(".loupe-numeric-surface")).toHaveAttribute("data-sheen-mode", "dark");
    const budget = page.getByRole("spinbutton", { name: "Budget", exact: true });
    const threshold = page.getByRole("slider", { name: "Threshold", exact: true });
    const minimum = page.getByRole("slider", { name: "Minimum Window", exact: true });
    await expect(budget).toHaveValue("1.234,50 €");
    await expect(threshold).toHaveAttribute("aria-valuenow", "25");
    await expect(minimum).toHaveAttribute("aria-valuenow", "20");
    await expect(threshold).not.toHaveAttribute("style", /NaN/u);
    await expect(threshold).not.toHaveCSS("display", "none");
  } finally { await context.close(); }
});

test("numeric controls hydrate without replacing server nodes", async ({ page }) => {
  await page.addInitScript(() => {
    const mark = (): void => {
      const budget = document.querySelector<HTMLInputElement>('[role="spinbutton"]');
      const threshold = document.querySelector<HTMLElement>('.sheen-slider-input[aria-label="Threshold"]');
      if (budget) budget.dataset.serverBudget = "yes";
      if (threshold) threshold.dataset.serverThreshold = "yes";
    };
    new MutationObserver(mark).observe(document, { childList: true, subtree: true });
    mark();
  });
  await page.goto("/numeric-controls");
  await ready(page);
  const budget = page.getByRole("spinbutton", { name: "Budget", exact: true });
  const threshold = page.getByRole("slider", { name: "Threshold", exact: true });
  await expect(budget).toHaveAttribute("data-server-budget", "yes");
  await expect(threshold).toHaveAttribute("data-server-threshold", "yes");
  await expect(threshold).toHaveAttribute("aria-valuenow", "25");
  await expect(threshold).not.toHaveAttribute("style", /NaN/u);
});

test("numeric controls have a bounded dark baseline", async ({ page }) => {
  await page.goto("/numeric-controls");
  await ready(page);
  await expect(page.locator(".loupe-numeric-surface")).toHaveScreenshot("numeric-controls-dark.png", { animations: "disabled" });
});
