import { expect, test } from "@playwright/test";

test.use({ hasTouch: true });

test("phone header controls keep usable touch bounds", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/admin");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const controls = await page.locator(".sheen-shell-header").getByRole("button").evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { name: element.getAttribute("aria-label") ?? element.textContent?.trim(), width: rect.width, height: rect.height, reachable: hit !== null && element.contains(hit) };
  }).filter(item => item.width > 0 && item.height > 0));
  expect(controls.length).toBeGreaterThan(3);
  for (const control of controls) {
    expect(control.width, `${control.name} width`).toBeGreaterThanOrEqual(24);
    expect(control.height, `${control.name} height`).toBeGreaterThanOrEqual(24);
    expect(control.reachable, `${control.name} hit target`).toBe(true);
  }
  await page.getByRole("button", { name: "More", exact: true }).tap();
  await expect(page.getByRole("button", { name: "More", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Workspace settings", exact: true }).tap();
  await expect(page).toHaveURL(/\/admin\/settings$/u);
  await expect(page.getByRole("textbox", { name: "Organization name" })).toBeVisible();
});

test("phone policy and settings forms support touch editing and submission", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/admin/policies");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const form = page.getByRole("form", { name: "Create policy" });
  await form.getByRole("textbox", { name: "Policy name" }).tap();
  await page.keyboard.type("touch-reviewer");
  await form.getByText("Read accounts", { exact: true }).tap();
  await expect(form.getByRole("checkbox", { name: "Read accounts", exact: true })).toBeChecked();
  await form.getByRole("button", { name: "Create policy", exact: true }).tap();
  await expect(page.locator(".loupe-admin-policy-list")).toContainText("touch-reviewer");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/admin/settings");
  const name = page.getByRole("textbox", { name: "Organization name" });
  await name.tap();
  await name.fill("Touch workspace");
  await page.getByRole("button", { name: "Save changes", exact: true }).tap();
  await expect(page.getByRole("group", { name: "Workspace settings", exact: true })).toHaveAttribute("data-dirty", "false");
  await expect(name).toHaveValue("Touch workspace");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
