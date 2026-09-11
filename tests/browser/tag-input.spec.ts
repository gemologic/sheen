import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("TagInput adds, removes, reorders, bounds long values, and submits ordered native values", async ({ page }) => {
  await page.goto("/tag-input");
  const input = page.getByRole("textbox", { name: "Project labels", exact: true });
  const urgent = page.getByRole("button", { name: "Remove urgent", exact: true });
  await urgent.focus();
  await page.keyboard.press("Alt+Home");
  const values = page.locator('.sheen-tag-input-value[data-tag-value]');
  await expect(values.first()).toHaveAttribute("data-tag-value", "urgent");
  await expect(urgent).toBeFocused();
  await page.keyboard.press("Delete");
  await expect(page.getByRole("button", { name: "Remove urgent", exact: true })).toHaveCount(0);
  await input.fill("release");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-busy", "true");
  await expect(input).toHaveValue("release");
  await expect(page.getByRole("button", { name: "Remove release", exact: true })).toBeVisible();
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: "Inspect tags", exact: true }).click();
  await expect(page.getByLabel("Tag form values")).toContainText('["labels","frontend"]');
  await expect(page.getByLabel("Tag form values")).toContainText('["labels","release"]');
  const bounds = await page.locator(".loupe-tag-input-bounds").evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("TagInput retains accepted tags and drafts through validation rejection and abort", async ({ page }) => {
  await page.goto("/tag-input");
  const input = page.getByRole("textbox", { name: "Project labels", exact: true });
  const first = page.locator('.sheen-tag-input-value[data-tag-value="frontend"]');
  await first.evaluate(element => element.setAttribute("data-retained-tag", "yes"));
  await input.fill("taken");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-busy", "true");
  await expect(input).toHaveValue("taken");
  await expect(page.getByText("That label is reserved.", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("taken");
  await expect(first).toHaveAttribute("data-retained-tag", "yes");
  await input.fill("slow");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-busy", "true");
  await input.fill("latest");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Remove latest", exact: true })).toBeVisible();
  await page.waitForTimeout(750);
  await expect(page.getByRole("button", { name: "Remove slow", exact: true })).toHaveCount(0);
  await expect(first).toHaveAttribute("data-retained-tag", "yes");
});

test("TagInput preserves a pre-hydration native draft and input identity", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/tag-input", { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Project labels", exact: true });
    await input.fill("native draft");
    await input.focus();
    await input.evaluate(element => element.setAttribute("data-tag-hydration", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(input).toHaveAttribute("data-tag-hydration", "retained");
    await expect(input).toHaveValue("native draft");
    await expect(input).toBeFocused();
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("TagInput read-only tags stay inspectable and reject pointer and keyboard changes", async ({ page }) => {
  await page.goto("/tag-input");
  const remove = page.getByRole("button", { name: "Remove alpha", exact: true });
  await expect(remove).toHaveAttribute("aria-disabled", "true");
  await remove.click({ force: true });
  await expect(remove).toBeVisible();
  await remove.focus();
  await page.keyboard.press("Alt+End");
  await expect(page.locator('.loupe-tag-input-scope .sheen-tag-input-value').first()).toHaveAttribute("data-tag-value", "alpha");
});
