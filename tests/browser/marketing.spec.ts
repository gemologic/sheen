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

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

/** Loupe scrolls inside #app, so grow the viewport to the full page before capturing it. */
async function expandToPage(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  const height = await page.locator("#app").evaluate(element => element.scrollHeight);
  if (viewport) await page.setViewportSize({ width: viewport.width, height });
}

async function useLightMode(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ mode: "light" })));
}

for (const mode of ["dark", "light"] as const) {
  test(`marketing page renders every section at desktop width in ${mode} mode`, async ({ page }) => {
    if (mode === "light") await useLightMode(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/marketing");
    await ready(page);
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", mode);
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("button", { name: "Menu", exact: true })).toBeHidden();
    await expect(banner.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Pricing", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1, name: "Calm tools for teams that move fast" })).toBeVisible();
    for (const name of ["Everything a busy team needs, nothing it doesn't", "Simple, predictable pricing", "What teams say", "Frequently asked questions", "Bring your team to Northstar"]) {
      await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("contentinfo").getByRole("navigation", { name: "Legal", exact: true })).toBeVisible();
    const plans = page.getByRole("region", { name: "Simple, predictable pricing", exact: true }).getByRole("group");
    await expect(plans).toHaveCount(3);
    const [first, last] = await Promise.all([plans.first().boundingBox(), plans.last().boundingBox()]);
    expect(first?.y).toBe(last?.y);
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await expandToPage(page);
    await expect(page.getByRole("contentinfo")).toBeInViewport();
    await expect(page).toHaveScreenshot(`marketing-desktop-${mode}.png`, { animations: "disabled" });
  });

  test(`marketing phone menu is a keyboard-complete disclosure in ${mode} mode`, async ({ page }) => {
    if (mode === "light") await useLightMode(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/marketing");
    await ready(page);
    const banner = page.getByRole("banner");
    const toggle = banner.getByRole("button", { name: "Menu", exact: true });
    const pricing = banner.getByRole("link", { name: "Pricing", exact: true });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(pricing).toBeHidden();
    await page.keyboard.press("Tab");
    await expect(banner.getByRole("link", { name: "Northstar home", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(pricing).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(banner.getByRole("link", { name: "Features", exact: true })).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoAxeViolations(page);
    await expect(page).toHaveScreenshot(`marketing-phone-menu-${mode}.png`, { animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(pricing).toBeHidden();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await banner.getByRole("link", { name: "FAQ", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#faq$/u);
    await expectNoHorizontalOverflow(page);
    await expandToPage(page);
    await expect(page.getByRole("contentinfo")).toBeInViewport();
    await expect(page).toHaveScreenshot(`marketing-phone-${mode}.png`, { animations: "disabled" });
  });
}

test("billing toggle changes prices by keyboard without replacing plan cards", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/marketing");
  await ready(page);
  const pricing = page.getByRole("region", { name: "Simple, predictable pricing", exact: true });
  const team = pricing.getByRole("group", { name: "Team", exact: true });
  const monthly = pricing.getByRole("radio", { name: "Monthly", exact: true });
  const yearly = pricing.getByRole("radio", { name: "Yearly", exact: true });
  await expect(team).toContainText("$29");
  await expect(team).toContainText("/ month");
  await team.evaluate(element => element.setAttribute("data-card-owner", "retained"));
  await monthly.focus();
  await expect(monthly).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(yearly).toBeChecked();
  await expect(yearly).toBeFocused();
  await expect(team).toContainText("$290");
  await expect(team).toContainText("/ year");
  await expect(team).toHaveAttribute("data-card-owner", "retained");
  await expect(pricing.getByRole("group", { name: "Enterprise", exact: true })).toContainText("Custom");
  await page.keyboard.press("ArrowLeft");
  await expect(monthly).toBeChecked();
  await expect(team).toContainText("/ month");
  await expect(team).toHaveAttribute("data-card-owner", "retained");
});

test("FAQ answers expand by keyboard and arrow keys move between questions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/marketing");
  await ready(page);
  const faq = page.getByRole("region", { name: "Frequently asked questions", exact: true });
  const trial = faq.getByRole("button", { name: "How long is the free trial?", exact: true });
  const cancel = faq.getByRole("button", { name: "Can I cancel at any time?", exact: true });
  const data = faq.getByRole("button", { name: "Where is my data stored?", exact: true });
  await expect(faq.getByText("Fourteen days on the Team plan, with no card required.")).toBeHidden();
  await trial.focus();
  await page.keyboard.press("Enter");
  await expect(trial).toHaveAttribute("aria-expanded", "true");
  await expect(faq.getByText("Fourteen days on the Team plan, with no card required.")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Space");
  await expect(cancel).toHaveAttribute("aria-expanded", "true");
  await expect(trial).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("End");
  await expect(data).toBeFocused();
  await page.keyboard.press("Home");
  await expect(trial).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trial).toHaveAttribute("aria-expanded", "false");
});

test("marketing server markup is complete before hydration and keeps its owners", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/marketing", { waitUntil: "commit" });
    const banner = page.getByRole("banner");
    const team = page.getByRole("group", { name: "Team", exact: true });
    await expect(banner.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(team).toContainText("$29");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy", exact: true })).toBeVisible();
    await banner.evaluate(element => element.setAttribute("data-server-banner", "retained"));
    await team.evaluate(element => element.setAttribute("data-server-plan", "retained"));
    release();
    await ready(page);
    await expect(banner).toHaveAttribute("data-server-banner", "retained");
    await expect(team).toHaveAttribute("data-server-plan", "retained");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
