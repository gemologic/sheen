import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("ActivityTimeline and Stepper expose native lists, progress, links, actions, and non-color states", async ({ page }) => {
  await page.goto("/workflow");
  const stepper = page.getByRole("navigation", { name: "Release workflow", exact: true });
  await expect(stepper.getByRole("progressbar", { name: "Release workflow progress", exact: true })).toHaveAttribute("value", "1");
  await expect(stepper.locator('[data-state="current"] .sheen-workflow-state')).toHaveText("Current");
  await expect(stepper.locator('[data-state="error"] .sheen-workflow-state')).toHaveText("Error");
  const action = stepper.getByRole("button", { name: "Configure approval", exact: true });
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Configure actions")).toHaveText("1");
  const link = stepper.getByRole("link", { name: "Review deployment", exact: true });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#deployment$/);
  const timeline = page.getByRole("list", { name: "Release activity", exact: true });
  await expect(timeline.getByRole("listitem")).toHaveCount(4);
  await expect(timeline.locator("time").first()).toHaveAttribute("datetime", "2026-09-09T13:42:00Z");
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("workflow refresh retains accepted activity, step, focus, and node identity until atomic acceptance", async ({ page }) => {
  await page.goto("/workflow");
  const stepper = page.getByRole("navigation", { name: "Release workflow", exact: true });
  const step = stepper.locator('[data-step-id="approval"]');
  const activity = page.getByRole("list", { name: "Release activity", exact: true }).locator('[data-activity-id="approval"]');
  const action = step.getByRole("button", { name: "Configure approval", exact: true });
  await step.evaluate(element => element.setAttribute("data-step-owner", "retained"));
  await activity.evaluate(element => element.setAttribute("data-activity-owner", "retained"));
  await action.focus();
  await page.getByRole("button", { name: "Refresh workflow", exact: true }).evaluate(element => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(stepper).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("list", { name: "Release activity", exact: true })).toHaveAttribute("aria-busy", "true");
  for (let frame = 0; frame < 12; frame += 1) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    await expect(activity).toContainText("Security approval pending");
    await expect(step).toHaveAttribute("data-step-owner", "retained");
  }
  await expect(activity).toContainText("Security approval completed");
  await expect(activity).toHaveAttribute("data-activity-owner", "retained");
  await expect(step).toHaveAttribute("data-step-owner", "retained");
  await expect(step).toHaveAttribute("data-state", "completed");
  await expect(action).toBeFocused();
  await expect(page.getByLabel("Workflow revision")).toHaveText("Revision 1");
});

test("horizontal Stepper stacks in a narrow component container and compact timeline stays bounded in RTL", async ({ page }) => {
  await page.goto("/workflow");
  const narrow = page.getByRole("navigation", { name: "Narrow workflow", exact: true });
  await expect(narrow).toHaveAttribute("data-density", "compact");
  const direction = await narrow.locator(".sheen-stepper-list").evaluate(element => getComputedStyle(element).flexDirection);
  expect(direction).toBe("column");
  const scope = page.locator(".loupe-workflow-scope");
  const bounds = await scope.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
  await expect(scope.getByText("Current", { exact: true })).toBeVisible();
  await expect(scope.getByText("Error", { exact: true })).toBeVisible();
});

test("workflow server content and focused control survive delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/workflow", { waitUntil: "commit" });
    const step = page.locator('[data-step-id="deploy"]').first();
    const link = step.getByRole("link", { name: "Review deployment", exact: true });
    await step.evaluate(element => element.setAttribute("data-workflow-hydration", "retained"));
    await link.focus();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(step).toHaveAttribute("data-workflow-hydration", "retained");
    await expect(link).toBeFocused();
    await expect(page.getByText("Security approval pending", { exact: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  } finally { release(); }
});
