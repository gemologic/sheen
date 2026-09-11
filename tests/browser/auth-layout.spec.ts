import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]').last()).toHaveAttribute("data-sheen-ready", /^(?:true)?$/u);
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags([...axeTags]).analyze();
  const summary = result.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target.join(" ")) }));
  expect(summary).toEqual([]);
}

test("focused authentication layout exposes a concise keyboard-complete OIDC flow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/auth/focused");
  await ready(page);
  const main = page.getByRole("main", { name: "Welcome back", exact: true });
  await expect(main.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Northstar home", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(main.getByRole("button", { name: "Continue with SSO", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(main.getByRole("status")).toHaveText("Continuing with company SSO");
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("auth-focused-dark.png", { animations: "disabled" });
});

test("brand-split authentication keeps one form owner through responsive collapse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/auth/brand-split");
  await ready(page);
  const main = page.getByRole("main", { name: "Access your workspace", exact: true });
  const aside = page.getByRole("complementary", { name: "About Northstar", exact: true });
  const form = main.locator("form");
  const email = main.getByRole("textbox", { name: "Work email", exact: true });
  await expect(aside).toBeVisible();
  const [asideBox, contentBox] = await Promise.all([aside.boundingBox(), main.locator(".sheen-auth-layout-content-region").boundingBox()]);
  expect(asideBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(asideBox?.x).toBeLessThan(contentBox?.x ?? 0);
  await main.evaluate(element => element.setAttribute("data-auth-owner", "retained"));
  await form.evaluate(element => element.setAttribute("data-form-owner", "retained"));
  await email.fill("ada@example.com");
  await email.evaluate(element => element.setAttribute("data-email-owner", "retained"));
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("auth-brand-split-dark.png", { animations: "disabled" });

  await page.locator("html").evaluate(element => { element.setAttribute("dir", "rtl"); });
  const [rtlAsideBox, rtlContentBox] = await Promise.all([aside.boundingBox(), main.locator(".sheen-auth-layout-content-region").boundingBox()]);
  expect(rtlAsideBox).not.toBeNull();
  expect(rtlContentBox).not.toBeNull();
  expect(rtlAsideBox?.x).toBeGreaterThan(rtlContentBox?.x ?? Number.POSITIVE_INFINITY);
  await page.locator("html").evaluate(element => { element.setAttribute("dir", "ltr"); });

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(aside).toBeHidden();
  await expect(main).toHaveAttribute("data-auth-owner", "retained");
  await expect(form).toHaveAttribute("data-form-owner", "retained");
  await expect(email).toHaveAttribute("data-email-owner", "retained");
  await expect(email).toHaveValue("ada@example.com");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expectNoAxeViolations(page);
  await expect(page).toHaveScreenshot("auth-brand-split-phone-dark.png", { animations: "disabled" });
});

test("brand-split authentication adopts a pre-hydration native draft without replacing its owners", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/auth/brand-split", { waitUntil: "commit" });
    const main = page.getByRole("main", { name: "Access your workspace", exact: true });
    const form = main.locator("form");
    const email = main.getByRole("textbox", { name: "Work email", exact: true });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    await main.evaluate(element => element.setAttribute("data-server-auth", "retained"));
    await form.evaluate(element => element.setAttribute("data-server-form", "retained"));
    await email.fill("before-hydration@example.com");
    await email.evaluate(element => element.setAttribute("data-server-email", "retained"));
    release();
    await ready(page);
    await expect(main).toHaveAttribute("data-server-auth", "retained");
    await expect(form).toHaveAttribute("data-server-form", "retained");
    await expect(email).toHaveAttribute("data-server-email", "retained");
    await expect(email).toHaveValue("before-hydration@example.com");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test("component inventory renders live bounded authentication previews", async ({ page }) => {
  await page.goto("/components");
  await ready(page);
  await page.getByRole("searchbox", { name: "Find a component", exact: true }).fill("AuthLayout");
  for (const name of ["AuthLayout", "BrandSplitAuthLayout", "FocusedAuthLayout"] as const) {
    const preview = page.locator(`[data-component-preview="${name}"]`);
    await expect(preview.locator(".sheen-auth-layout")).toBeVisible();
    expect(await preview.locator(".sheen-auth-layout").evaluate(element => element.scrollHeight)).toBeLessThanOrEqual(320);
  }
});
