import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function ready(page: Page, timeout = 5_000): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true", { timeout });
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

function fieldsCard(page: Page): Locator {
  return page.locator(".loupe-date-grid > .sheen-surface").first();
}

function instantCard(page: Page): Locator {
  return page.locator(".loupe-date-grid > .sheen-surface").nth(2);
}

test("date controls preserve complete server markup, identity, and a native draft through delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/date-time", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const main = page.getByRole("main");
    const picker = page.getByRole("textbox", { name: "Settlement date", exact: true });
    const calendar = page.getByRole("grid");
    await expect(calendar.getByRole("button", { name: "Selected date. Thursday, November 5, 2026", exact: true })).toBeVisible();
    await main.evaluate(element => element.setAttribute("data-date-hydration-identity", "main"));
    await picker.evaluate(element => element.setAttribute("data-date-hydration-identity", "picker"));
    await calendar.evaluate(element => element.setAttribute("data-date-hydration-identity", "calendar"));
    await picker.fill("12/02/2026");
    await picker.focus();
    release();
    await ready(page, 15_000);
    await expect(main).toHaveAttribute("data-date-hydration-identity", "main");
    await expect(picker).toHaveAttribute("data-date-hydration-identity", "picker");
    await expect(calendar).toHaveAttribute("data-date-hydration-identity", "calendar");
    await expect(picker).toHaveValue("12/02/2026");
    await expect(picker).toBeFocused();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test("inline and popup calendars support keyboard selection, bounds, presets, and contextual portals", async ({ page }) => {
  await page.goto("/date-time");
  await ready(page);
  await page.getByRole("button", { name: "Switch to month view", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("grid").getByRole("button", { name: "Choose Tuesday, November 3, 2026", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator('input[name="deploymentDate"]')).toHaveValue("2026-11-04");
  await expect(page.getByRole("grid").getByRole("button", { name: "Not available. Sunday, November 1, 2026", exact: true })).toBeDisabled();
  await expect(page.getByRole("grid").getByRole("button", { name: "Not available. Saturday, November 14, 2026", exact: true })).toBeDisabled();
  await expect(page.getByRole("grid").getByRole("button", { name: "Not available. Saturday, November 21, 2026", exact: true })).toBeDisabled();

  const trigger = fieldsCard(page).getByRole("button", { name: "Open calendar", exact: true }).first();
  await trigger.click();
  const popup = page.locator('.sheen-date-content[data-state="open"]');
  await expect(popup).toBeVisible();
  expect(await popup.evaluate(element => element.closest('[data-sheen-portal="root"]') !== null)).toBe(true);
  await expect(popup.getByRole("button", { name: "Launch day", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();

  const scopedTrigger = page.locator(".loupe-date-scope").getByRole("button", { name: "Open calendar", exact: true });
  await scopedTrigger.click();
  const scopedPopup = page.locator('.loupe-date-scope [data-sheen-portal="scope"] .sheen-date-content[data-state="open"]');
  await expect(scopedPopup).toBeVisible();
  expect(await scopedPopup.evaluate(element => getComputedStyle(element).direction)).toBe("rtl");
});

test("range selection retains the accepted form value until both draft endpoints exist", async ({ page }) => {
  await page.goto("/date-time");
  await ready(page);
  const card = fieldsCard(page);
  await card.getByRole("button", { name: "Open calendar", exact: true }).nth(1).click();
  const popup = page.locator('.sheen-date-content[data-state="open"]');
  const projection = page.locator('input[name="reportWindow"]');
  await expect(projection).toHaveValue("2026-11-01/2026-11-07");
  await popup.getByRole("button", { name: "Choose Tuesday, November 10, 2026", exact: true }).click();
  await expect(projection).toHaveValue("2026-11-01/2026-11-07");
  await expect(card.getByRole("textbox", { name: "Report window", exact: true })).toHaveValue("11/10/2026");
  await popup.getByRole("button", { name: "Choose Thursday, November 12, 2026", exact: true }).click();
  await expect(projection).toHaveValue("2026-11-10/2026-11-12");
});

test("segmented fields and the time picker publish keyboard changes through ISO form values", async ({ page }) => {
  await page.goto("/date-time");
  await ready(page);
  const card = fieldsCard(page);
  const dateField = card.getByRole("group", { name: "Invoice date", exact: true });
  await dateField.getByRole("spinbutton", { name: "Day", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator('input[name="invoiceDate"]')).toHaveValue("2026-11-02");

  const timeTrigger = card.getByRole("button", { name: "Review slot 1:30 AM", exact: true });
  await timeTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox", { name: "Review slot", exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator('select[name="reviewSlot"]')).toHaveValue("02:00:00.000");

  const timeField = card.getByRole("group", { name: "Cutoff time", exact: true });
  await timeField.getByRole("spinbutton", { name: "Minute", exact: true }).focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator('input[name="cutoff"]')).toHaveValue("01:31:00.000");
});

test("DateTimePicker rejects ambiguous wall time until an explicit instant is chosen", async ({ page }) => {
  await page.goto("/date-time");
  await ready(page);
  const card = instantCard(page);
  const zone = card.getByRole("combobox", { name: "Time zone", exact: true });
  await zone.fill("New York");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const alert = card.getByRole("alert");
  await expect(alert).toContainText("occurs twice");
  await expect(page.getByLabel("Date-time resolution")).toHaveText("ambiguous");
  await expect(page.locator('input[name="startsAt"]')).toHaveValue("2026-11-01T01:30:00.000Z[UTC]");
  await alert.getByRole("button", { name: /^Later:/u }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByLabel("Date-time resolution")).toHaveText("exact");
  await expect(page.locator('input[name="startsAt"]')).toHaveValue("2026-11-01T06:30:00.000Z[America/New_York]");
});

test("time-zone refresh retains the open accepted list, input identity, query, and focus", async ({ page }) => {
  await page.goto("/date-time");
  await ready(page);
  const card = instantCard(page);
  const comboboxRoot = card.locator(".sheen-combobox");
  const input = card.getByRole("combobox", { name: "Time zone", exact: true });
  await input.fill("New");
  const option = page.getByRole("option", { name: /New York/u });
  await expect(option).toBeVisible();
  await input.evaluate(element => element.setAttribute("data-date-refresh-identity", "input"));
  await option.evaluate(element => element.setAttribute("data-date-refresh-identity", "option"));
  await card.getByRole("button", { name: "Refresh time zones", exact: true }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Refresh time zones must be a button");
    element.click();
  });
  await expect(comboboxRoot).toHaveAttribute("data-previous-results", "");
  await expect(input).toHaveAttribute("aria-busy", "true");
  const frames = await input.evaluate(async element => {
    const samples: boolean[] = [];
    for (let index = 0; index < 12; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const retainedOption = document.querySelector('[data-date-refresh-identity="option"]');
      samples.push(element.isConnected && document.activeElement === element && element.getAttribute("data-date-refresh-identity") === "input"
        && retainedOption?.isConnected === true && element.getAttribute("aria-busy") === "true");
    }
    return samples;
  });
  expect(frames.every(Boolean)).toBe(true);
  await expect(comboboxRoot).not.toHaveAttribute("data-previous-results", "", { timeout: 3_000 });
  await expect(input).toHaveAttribute("data-date-refresh-identity", "input");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("New");
  await expect(page.getByRole("option", { name: "New York · r2", exact: true })).toBeVisible();
});

test("date filter adapter supplies the table editor without changing the table contract", async ({ page }) => {
  await page.goto("/filter-bar");
  await ready(page);
  const section = page.getByRole("region", { name: "Typed client filters" });
  await section.getByRole("button", { name: "+ Filter", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Filter columns" });
  await picker.getByRole("searchbox", { name: "Search filter columns" }).fill("Crea");
  await picker.getByRole("button", { name: "Created", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "+ Filter: Created" });
  await editor.getByRole("button", { name: /Operator/u }).click();
  await page.getByRole("option", { name: "is between", exact: true }).click();
  await expect(editor.locator(".sheen-date-range-picker")).toBeVisible();
  expect(await editor.locator('input[type="date"]').count()).toBe(0);
});

test("open date layers pass axe, reflow as a phone sheet, expose target sizes, and honor user media settings", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/date-time");
  await ready(page);
  await fieldsCard(page).getByRole("button", { name: "Open calendar", exact: true }).first().click();
  const popup = page.locator('.sheen-date-content[data-state="open"]');
  await expect(popup).toBeVisible();
  await expectNoAxeViolations(page, "open phone date picker");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await fieldsCard(page).getByRole("button", { name: "Open calendar", exact: true }).first().click();
  await expect(popup).toBeVisible();
  const geometry = await popup.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const targets = [...element.querySelectorAll("button")].filter(target => {
      const style = getComputedStyle(target);
      const bounds = target.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
    }).map(target => {
      const targetBounds = target.getBoundingClientRect();
      return { width: targetBounds.width, height: targetBounds.height };
    });
    return { left: bounds.left, right: bounds.right, bottom: bounds.bottom, animation: getComputedStyle(element).animationName, targets };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(320);
  expect(Math.abs(geometry.bottom - 700)).toBeLessThanOrEqual(1);
  expect(geometry.animation).toBe("none");
  expect(geometry.targets.every(target => target.width >= 24 && target.height >= 24)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
