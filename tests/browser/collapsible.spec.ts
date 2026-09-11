import { expect, test } from "@playwright/test";

test("disclosure visuals retain focus and respect initial and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 850, height: 850 });
  await page.goto("/collapsible");
  const initial = page.getByRole("button", { name: "Controlled settings", exact: true }).locator("..");
  expect(await initial.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  const trigger = page.getByRole("button", { name: "Advanced settings", exact: true });
  await trigger.click();
  await trigger.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(trigger).toHaveCSS("outline-style", "solid");
  const scoped = page.getByRole("button", { name: "Scoped settings", exact: true }).locator("..");
  await expect(scoped).toHaveCSS("direction", "rtl");
  await expect(scoped.locator(".sheen-collapsible-content")).toHaveCSS("transition-duration", "0s, 0s");
  await expect(scoped).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("collapsible-dark-light-rtl.png");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(initial.locator(".sheen-collapsible-content")).toHaveCSS("transition-duration", "0s, 0s");
});

test("disclosures preserve drafts, native keyboard behavior, and controlled ownership", async ({ page }) => {
  await page.goto("/collapsible");
  const trigger = page.getByRole("button", { name: "Advanced settings", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("textbox", { name: "Advanced draft" })).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const input = page.getByRole("textbox", { name: "Advanced draft" });
  await input.fill("Persistent draft");
  await input.evaluate(element => element.setAttribute("data-retained", "yes"));
  await trigger.focus();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(input).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Controlled settings", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Requested state")).toHaveText("false");
  await expect(page.getByRole("textbox", { name: "Controlled draft" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle acceptance", exact: true }).click();
  await page.getByRole("button", { name: "Controlled settings", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Controlled draft" })).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh label", exact: true }).click();
  await page.getByRole("button", { name: "Updated settings", exact: true }).click();
  await expect(input).toHaveValue("Persistent draft");
  await expect(input).toHaveAttribute("data-retained", "yes");
  await expect(page.getByRole("button", { name: "Unavailable settings", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Form submits")).toHaveText("0");
});

test("external collapse restores contained focus but preserves deliberate outside focus", async ({ page }) => {
  await page.goto("/collapsible");
  await page.getByRole("button", { name: "Close controlled after request", exact: true }).click();
  await page.getByRole("textbox", { name: "Controlled draft" }).focus();
  await expect(page.getByRole("textbox", { name: "Controlled draft" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Controlled settings", exact: true })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Close controlled after request", exact: true }).click();
  await page.getByRole("textbox", { name: "Outside draft" }).fill("Keep focus here");
  await expect(page.getByRole("textbox", { name: "Controlled draft" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Outside draft" })).toBeFocused();
});

test("disclosure activation replays through delayed hydration with retained server drafts", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/collapsible", { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Controlled draft" });
    await input.fill("Before hydration");
    await input.evaluate(element => element.setAttribute("data-server", "retained"));
    const trigger = page.getByRole("button", { name: "Advanced settings", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-server", "retained"));
    await trigger.click();
    release();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("data-server", "retained");
    await expect(input).toHaveAttribute("data-server", "retained");
    await expect(input).toHaveValue("Before hydration");
    expect(errors).toEqual([]);
  } finally { release(); }
});
