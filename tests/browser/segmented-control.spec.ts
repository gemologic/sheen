import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("SegmentedControl roves, submits one value, skips disabled options, and bounds overflow", async ({ page }) => {
  await page.goto("/segmented-control");
  const group = page.getByRole("radiogroup", { name: "Report period", exact: true });
  const week = group.getByRole("radio", { name: "Week", exact: true });
  await week.focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Month", exact: true })).toBeChecked();
  await page.keyboard.press("End");
  await expect(group.getByRole("radio", { name: "Year", exact: true })).toBeChecked();
  await expect(group.getByRole("radio", { name: "Year", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(group.getByRole("radio", { name: "Last hour", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Inspect values", exact: true }).click();
  await expect(page.getByLabel("Segmented form values")).toHaveText('[["period","hour"],["display","table"],["grouping","team"]]');
  const options = group.locator(".sheen-segmented-options");
  const geometry = await options.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(geometry.scroll).toBeGreaterThan(geometry.client);
  await expect(group.locator('input[tabindex="0"]')).toHaveCount(1);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("SegmentedControl follows RTL geometry and read-only state rejects changes", async ({ page }) => {
  await page.goto("/segmented-control");
  const rtl = page.getByRole("radiogroup", { name: "RTL interval", exact: true });
  await rtl.getByRole("radio", { name: "Week", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(rtl.getByRole("radio", { name: "Day", exact: true })).toBeChecked();
  const readOnly = page.getByRole("radiogroup", { name: "Read-only grouping", exact: true });
  await readOnly.getByRole("radio", { name: "Owner", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(readOnly.getByRole("radio", { name: "Team", exact: true })).toBeChecked();
  await expect(readOnly.getByRole("radio", { name: "Owner", exact: true })).not.toBeChecked();
});

test("SegmentedControl adopts a native pre-hydration selection without replacing the option", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/segmented-control", { waitUntil: "commit" });
    const group = page.getByRole("radiogroup", { name: "Report period", exact: true });
    const month = group.getByRole("radio", { name: "Month", exact: true });
    await group.locator(".sheen-segmented-item", { hasText: "Month" }).click();
    await month.focus();
    await month.evaluate(element => element.setAttribute("data-segmented-hydration", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(month).toHaveAttribute("data-segmented-hydration", "retained");
    await expect(month).toBeChecked();
    await expect(month).toBeFocused();
    expect(errors).toEqual([]);
  } finally { release(); }
});
