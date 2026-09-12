import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function observeNativeFormatters(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.documentElement;
    root.setAttribute("data-number-format-constructions", "0");
    root.setAttribute("data-date-format-constructions", "0");
    // Count constructions while preserving the real native Intl implementations.
    Intl.NumberFormat = new Proxy(Intl.NumberFormat, { construct(target, args, newTarget) {
      root.setAttribute("data-number-format-constructions", String(Number(root.getAttribute("data-number-format-constructions")) + 1));
      return Reflect.construct(target, args, newTarget);
    } });
    Intl.DateTimeFormat = new Proxy(Intl.DateTimeFormat, { construct(target, args, newTarget) {
      root.setAttribute("data-date-format-constructions", String(Number(root.getAttribute("data-date-format-constructions")) + 1));
      return Reflect.construct(target, args, newTarget);
    } });
  });
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}

async function observeNativeTokenReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme-token-reads", "0");
    root.setAttribute("data-theme-token-names", "0");
    const names = new Set<string>();
    const read = CSSStyleDeclaration.prototype.getPropertyValue;
    CSSStyleDeclaration.prototype.getPropertyValue = function (this: CSSStyleDeclaration, name: string): string {
      if (name.startsWith("--sheen-")) {
        names.add(name);
        root.setAttribute("data-theme-token-reads", String(Number(root.getAttribute("data-theme-token-reads")) + 1));
        root.setAttribute("data-theme-token-names", String(names.size));
      }
      return read.call(this, name);
    };
  });
}

test("twenty-chart theme redraw reuses real Intl formatters and all canvas owners", async ({ page }) => {
  await page.goto("/chart-benchmark");
  await expect(page.locator("main")).toHaveAttribute("data-chart-benchmark-ready", "true");
  await page.locator("[data-chart-benchmark-theme-fixture]").click();
  const scope = page.locator(".loupe-chart-benchmark-theme-scope");
  await expect(scope.locator('.sheen-time-series[data-enhanced="true"]')).toHaveCount(20);
  await settle(page);
  const canvas = scope.locator("canvas").first();
  const before = await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected a canvas");
    return element.toDataURL();
  });
  await scope.locator("canvas").evaluateAll(elements => elements.forEach(element => element.setAttribute("data-formatting-retained", "true")));
  await observeNativeFormatters(page);
  await observeNativeTokenReads(page);
  await scope.locator("[data-chart-benchmark-theme]").click();
  await expect(scope).toHaveAttribute("data-sheen-mode", "light");
  await expect(scope).toHaveAttribute("data-sheen-accent", "violet");
  await settle(page);
  await expect(scope.locator('canvas[data-formatting-retained="true"]')).toHaveCount(20);
  await expect.poll(() => canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error("Expected a canvas");
    return element.toDataURL();
  })).not.toBe(before);
  await expect(page.locator("html")).toHaveAttribute("data-number-format-constructions", "0");
  await expect(page.locator("html")).toHaveAttribute("data-date-format-constructions", "0");
  const reads = Number(await page.locator("html").getAttribute("data-theme-token-reads"));
  const names = Number(await page.locator("html").getAttribute("data-theme-token-names"));
  expect(names).toBeGreaterThan(0);
  expect(reads).toBe(names);
});

test("canvas, SVG, accessible tables, and formatter hooks localize only when locale changes", async ({ page }) => {
  await page.goto("/chart-formatting");
  const scope = page.locator(".loupe-chart-formatting-scope");
  await expect(scope.locator(".sheen-time-series")).toHaveAttribute("data-enhanced", "true");
  await settle(page);
  const amount = scope.getByLabel("Formatted amount", { exact: true });
  const timestamp = scope.getByLabel("Formatted timestamp", { exact: true });
  await expect(amount).toHaveText("12,345.5");
  const before = await timestamp.textContent();
  await observeNativeFormatters(page);
  await page.getByRole("button", { name: "Toggle formatting accent", exact: true }).click();
  await expect(scope).toHaveAttribute("data-sheen-accent", "violet");
  await settle(page);
  await expect(amount).toHaveText("12,345.5");
  await expect(timestamp).toHaveText(before ?? "");
  await expect(page.locator("html")).toHaveAttribute("data-number-format-constructions", "0");
  await expect(page.locator("html")).toHaveAttribute("data-date-format-constructions", "0");
  await page.getByRole("button", { name: "Toggle formatting locale", exact: true }).click();
  await expect(scope).toHaveAttribute("data-sheen-locale", "de-DE");
  await expect(amount).toHaveText("12.345,5");
  await expect(timestamp).not.toHaveText(before ?? "");
  const tables = scope.locator(".sheen-chart-data");
  await expect(tables).toHaveCount(4);
  const localizedTimestamp = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(Date.UTC(2026, 8, 1, 12));
  for (const [index, table] of (await tables.all()).entries()) {
    await table.locator("summary").click();
    await expect(table.locator('tr[data-chart-row="0"] td').first()).toHaveText("12.345,5");
    if (index < 3) await expect(table.locator('tr[data-chart-row="0"] th')).toHaveText(localizedTimestamp);
  }
  expect(Number(await page.locator("html").getAttribute("data-number-format-constructions"))).toBeGreaterThan(0);
  expect(Number(await page.locator("html").getAttribute("data-date-format-constructions"))).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Toggle formatting locale", exact: true }).click();
  await expect(amount).toHaveText("12,345.5");
  await expect(timestamp).toHaveText(before ?? "");
  for (const table of await tables.all()) await expect(table.locator('tr[data-chart-row="0"] td').first()).toHaveText("12,345.5");
});
