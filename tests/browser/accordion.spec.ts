import { expect, test } from "@playwright/test";

test("accordion presentation has no initial motion and respects scoped RTL and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await page.goto("/accordion-visual");
  const dark = page.getByRole("group", { name: "Dark settings", exact: true });
  const light = page.getByRole("group", { name: "Light RTL settings", exact: true });
  expect(await dark.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(light).toHaveCSS("direction", "rtl");
  await expect(light.locator(".sheen-collapsible-content").first()).toHaveCSS("transition-duration", "0s, 0s");
  const trigger = dark.getByRole("button", { name: "General settings", exact: true });
  await trigger.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(trigger).toHaveCSS("outline-style", "solid");
  await expect(light).toBeInViewport({ ratio: 1 });
  await expect(page).toHaveScreenshot("accordion-dark-light-rtl.png");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dark.locator(".sheen-collapsible-content").first()).toHaveCSS("transition-duration", "0s, 0s");
});

test("empty accordion receives visible fallback focus after its focused item disappears", async ({ page }) => {
  await page.goto("/accordion");
  const dynamic = page.getByRole("group", { name: "Dynamic sections", exact: true });
  await page.getByRole("button", { name: "Clear sections after request", exact: true }).click();
  await dynamic.getByRole("button", { name: "Gamma", exact: true }).focus();
  await expect(dynamic.getByRole("button")).toHaveCount(0);
  await expect(dynamic).toBeFocused();
  await expect(dynamic).toHaveCSS("outline-style", "solid");
});

test("nested accordion keyboard ownership excludes descendants and respects cancellation", async ({ page }) => {
  await page.goto("/accordion");
  const outerFirst = page.getByRole("button", { name: "Outer first", exact: true });
  const outerSecond = page.getByRole("button", { name: "Outer second", exact: true });
  const innerFirst = page.getByRole("button", { name: "Inner first", exact: true });
  const innerSecond = page.getByRole("button", { name: "Inner second", exact: true });
  await outerFirst.focus();
  await page.keyboard.press("ArrowDown");
  await expect(outerSecond).toBeFocused();
  await innerFirst.focus();
  await page.keyboard.press("End");
  await expect(innerSecond).toBeFocused();
  await page.keyboard.press("Home");
  await expect(innerSecond).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(innerFirst).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(innerFirst).toHaveAttribute("aria-expanded", "true");
  await expect(outerFirst).toHaveAttribute("aria-expanded", "true");
  await expect(outerSecond).toHaveAttribute("aria-expanded", "false");
});

test("accordion refresh preserves reordered drafts and restores removed-section focus", async ({ page }) => {
  await page.goto("/accordion");
  const dynamic = page.getByRole("group", { name: "Dynamic sections", exact: true });
  await page.getByRole("button", { name: "Reverse sections after request", exact: true }).click();
  const beta = dynamic.getByRole("textbox", { name: "Beta draft", exact: true });
  await beta.fill("Retained through reorder");
  await beta.evaluate(element => element.setAttribute("data-retained", "yes"));
  await expect(dynamic.getByRole("button").first()).toHaveText("Gamma");
  await expect(beta).toBeFocused();
  await expect(beta).toHaveValue("Retained through reorder");
  await expect(beta).toHaveAttribute("data-retained", "yes");
  await page.getByRole("button", { name: "Remove Beta after request", exact: true }).click();
  await beta.focus();
  await expect(beta).toHaveCount(0);
  await expect(dynamic.getByRole("button", { name: "Alpha", exact: true })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Remove Beta after request", exact: true }).click();
  const outside = page.getByRole("textbox", { name: "Outside draft", exact: true });
  await outside.fill("Deliberate outside focus");
  await expect(dynamic.getByRole("button", { name: "Beta", exact: true })).toHaveCount(0);
  await expect(outside).toBeFocused();
});

test("async accordion collapse restores contained focus without stealing outside focus", async ({ page }) => {
  await page.goto("/accordion");
  await page.getByRole("button", { name: "Close remote section", exact: true }).click();
  await page.getByRole("textbox", { name: "Remote draft", exact: true }).fill("Retained remote draft");
  await expect(page.getByRole("textbox", { name: "Remote draft", exact: true })).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Remote section", exact: true });
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Remote draft", exact: true })).toHaveValue("Retained remote draft");
  await page.getByRole("button", { name: "Close remote section", exact: true }).click();
  const outside = page.getByRole("textbox", { name: "Outside draft", exact: true });
  await outside.fill("Keep focus here");
  await expect(page.getByRole("textbox", { name: "Remote draft", exact: true })).toHaveCount(0);
  await expect(outside).toBeFocused();
});

test("accordion hydration retains server controls and replays expansion once", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/accordion", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "General draft", exact: true });
    await draft.fill("Before hydration");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    const advanced = page.getByRole("button", { name: "Advanced", exact: true });
    await advanced.evaluate(element => element.setAttribute("data-server", "retained"));
    await advanced.click();
    release();
    await expect(advanced).toHaveAttribute("aria-expanded", "true");
    await expect(advanced).toHaveAttribute("data-server", "retained");
    await page.getByRole("button", { name: "General", exact: true }).click();
    await expect(draft).toHaveValue("Before hydration");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await expect(advanced).toHaveAttribute("aria-expanded", "false");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("accordion panel inputs retain native editing keys and tab order", async ({ page }) => {
  await page.goto("/accordion");
  const draft = page.getByRole("textbox", { name: "General draft", exact: true });
  await draft.fill("Native editing");
  await page.keyboard.press("Home");
  await expect(draft).toBeFocused();
  expect(await draft.evaluate(element => element instanceof HTMLInputElement ? element.selectionStart : null)).toBe(0);
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowDown");
  await expect(draft).toBeFocused();
  await page.keyboard.press("Space");
  await expect(draft).toHaveValue("Native editing ");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Advanced", exact: true })).toBeFocused();
});

test("accordion keyboard navigation skips disabled sections and preserves collapsed drafts", async ({ page }) => {
  await page.goto("/accordion");
  const group = page.getByRole("group", { name: "Single sections", exact: true });
  const general = group.getByRole("button", { name: "General", exact: true });
  const advanced = group.getByRole("button", { name: "Advanced", exact: true });
  await group.getByRole("textbox", { name: "General draft" }).fill("Persistent draft");
  await general.evaluate(element => element.setAttribute("data-retained", "yes"));
  await general.focus();
  await page.keyboard.press("ArrowDown");
  await expect(advanced).toBeFocused();
  await expect(general).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(advanced).toHaveAttribute("aria-expanded", "true");
  await expect(group.getByRole("textbox", { name: "General draft" })).toHaveCount(0);
  await page.keyboard.press("Home");
  await expect(general).toBeFocused();
  await page.keyboard.press("Space");
  await expect(group.getByRole("textbox", { name: "General draft" })).toHaveValue("Persistent draft");
  await expect(advanced).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Refresh heading", exact: true }).click();
  await expect(group.getByRole("button", { name: "Updated general", exact: true })).toHaveAttribute("data-retained", "yes");
});

test("accordion controlled rejection, noncollapsible semantics, and independent multiple sections", async ({ page }) => {
  await page.goto("/accordion");
  const controlled = page.getByRole("group", { name: "Controlled sections", exact: true });
  const required = controlled.getByRole("button", { name: "Required section", exact: true });
  await expect(required).toHaveAttribute("aria-disabled", "true");
  await required.focus();
  await expect(required).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(required).toHaveAttribute("aria-expanded", "true");
  await controlled.getByRole("button", { name: "Other section", exact: true }).click();
  await expect(page.getByLabel("Accordion request")).toHaveText("other");
  await expect(required).toHaveAttribute("aria-expanded", "true");
  await expect(controlled.getByRole("button", { name: "Other section", exact: true })).toHaveAttribute("aria-expanded", "false");
  const multi = page.getByRole("group", { name: "Multiple sections", exact: true });
  await multi.getByRole("button", { name: "Second section", exact: true }).click();
  await expect(multi.getByRole("textbox")).toHaveCount(2);
  await multi.getByRole("button", { name: "First section", exact: true }).click();
  await expect(multi.getByRole("textbox", { name: "First draft" })).toHaveCount(0);
  await expect(multi.getByRole("textbox", { name: "Second draft" })).toBeVisible();
});
