import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("enabled tabs meet text and focus contrast in the bounded visual matrix", async ({ page }) => {
  await page.goto("/tabs-visual");
  await page.keyboard.press("Tab");
  const samples = await page.getByRole("tab").evaluateAll(elements => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    const color = (...layers: string[]) => {
      context.clearRect(0, 0, 1, 1);
      for (const layer of layers) { context.fillStyle = layer; context.fillRect(0, 0, 1, 1); }
      return "#" + [...context.getImageData(0, 0, 1, 1).data].map(value => value.toString(16).padStart(2, "0")).join("");
    };
    return elements.flatMap(element => {
      if (!(element instanceof HTMLButtonElement) || element.disabled) return [];
      element.focus({ preventScroll: true });
      const style = getComputedStyle(element);
      const surface = element.closest("[data-surface]");
      const scope = element.closest("[data-sheen-theme]");
      if (!surface || !scope) throw new Error("Missing tab sample surface");
      const background = getComputedStyle(surface).backgroundColor;
      return [{
        name: `${element.closest('[role="tablist"]')?.getAttribute("aria-label")}/${element.textContent}`,
        enhanced: scope.getAttribute("data-sheen-theme") === "contrast",
        foreground: color(style.color), background: color(background, style.backgroundColor),
        ring: color(style.outlineColor), offset: color(style.getPropertyValue("--sheen-color-focus-ring-offset")), surface: color(background),
        outline: style.outlineStyle,
      }];
    });
  });
  expect(samples).toHaveLength(8);
  for (const sample of samples) {
    expect(contrastRatio(sample.foreground, sample.background), `${sample.name}: text`).toBeGreaterThanOrEqual(sample.enhanced ? 7 : 4.5);
    expect(sample.outline, `${sample.name}: focus`).toBe("solid");
    expect(contrastRatio(sample.ring, sample.offset), `${sample.name}: inner ring`).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(sample.ring, sample.surface), `${sample.name}: outer ring`).toBeGreaterThanOrEqual(3);
  }
});

test("tab panels provide consistent native keyboard entry and skip retained inactive content", async ({ page }) => {
  await page.goto("/tabs-visual");
  const list = page.getByRole("tablist", { name: "Dark settings", exact: true });
  const root = list.locator("..");
  await list.getByRole("tab", { name: "General", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(root.getByRole("tabpanel", { name: "General", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(root.getByRole("textbox", { name: "Display name", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(list.getByRole("tab", { name: "General", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Tab");
  await expect(root.getByRole("tabpanel", { name: "Advanced", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tablist", { name: "Light RTL settings", exact: true }).getByRole("tab", { name: "General", exact: true })).toBeFocused();
});

test("tabs visual matrix preserves focus and initial layout across themes and orientations", async ({ page }) => {
  await page.setViewportSize({ width: 1050, height: 650 });
  await page.goto("/tabs-visual");
  for (const panel of await page.getByRole("tabpanel").all()) {
    expect(await panel.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(panel).toBeInViewport({ ratio: 1 });
  }
  const list = page.getByRole("tablist", { name: "Dark settings", exact: true });
  const general = list.getByRole("tab", { name: "General", exact: true });
  await general.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(general).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("tablist", { name: "Light RTL settings", exact: true })).toHaveCSS("direction", "rtl");
  await expect(page).toHaveScreenshot("tabs-theme-orientation-matrix.png");
});

test("external tab selection restores hidden-panel focus but preserves outside focus", async ({ page }) => {
  await page.goto("/tabs");
  await page.getByRole("button", { name: "Select remote tab", exact: true }).click();
  const draft = page.getByRole("textbox", { name: "Remote general draft", exact: true });
  await draft.fill("Keep this draft");
  const remote = page.getByRole("tablist", { name: "Remote settings", exact: true });
  await expect(remote.getByRole("tab", { name: "Advanced", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(remote.getByRole("tab", { name: "Advanced", exact: true })).toBeFocused();
  await remote.getByRole("tab", { name: "General", exact: true }).click();
  await expect(draft).toHaveValue("Keep this draft");
  await page.getByRole("button", { name: "Select remote tab", exact: true }).click();
  const outside = page.getByRole("textbox", { name: "Outside draft", exact: true });
  await outside.fill("Keep focus here");
  await expect(remote.getByRole("tab", { name: "Advanced", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(outside).toBeFocused();
});

test("removing a selected tab selects and focuses its next surviving neighbor", async ({ page }) => {
  await page.goto("/tabs");
  await page.getByRole("button", { name: "Remove middle tab", exact: true }).click();
  await page.getByRole("textbox", { name: "Dynamic middle draft", exact: true }).focus();
  const dynamic = page.getByRole("tablist", { name: "Dynamic settings", exact: true });
  await expect(dynamic.getByRole("tab", { name: "Middle", exact: true })).toHaveCount(0);
  await expect(dynamic.getByRole("tab", { name: "Last", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dynamic.getByRole("tab", { name: "Last", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Restore dynamic tabs", exact: true }).click();
  await expect(dynamic.getByRole("tab", { name: "Middle", exact: true })).toBeVisible();
  await expect(dynamic.getByRole("tab", { name: "Last", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("removing every tab provides visible root focus without restoring obsolete selection", async ({ page }) => {
  await page.goto("/tabs");
  await page.getByRole("button", { name: "Clear dynamic tabs", exact: true }).click();
  await page.getByRole("textbox", { name: "Dynamic middle draft", exact: true }).focus();
  const dynamic = page.getByRole("tablist", { name: "Dynamic settings", exact: true });
  await expect(dynamic.getByRole("tab")).toHaveCount(0);
  await expect(dynamic.locator("..")).toBeFocused();
  await expect(dynamic.locator("..")).toHaveCSS("outline-style", "solid");
  await page.getByRole("button", { name: "Restore dynamic tabs", exact: true }).click();
  await expect(dynamic.getByRole("tab", { name: "First", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("tabs support automatic and manual selection while retaining drafts and identities", async ({ page }) => {
  await page.goto("/tabs");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const automatic = page.getByRole("tablist", { name: "Automatic settings", exact: true });
  const general = automatic.getByRole("tab", { name: "General", exact: true });
  const advanced = automatic.getByRole("tab", { name: "Advanced", exact: true });
  await page.getByRole("textbox", { name: "Automatic general draft", exact: true }).fill("Retained draft");
  await general.evaluate(element => element.setAttribute("data-retained", "yes"));
  await general.focus();
  await page.keyboard.press("ArrowRight");
  await expect(advanced).toBeFocused();
  await expect(advanced).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: "Automatic general draft", exact: true })).toHaveCount(0);
  await page.keyboard.press("Home");
  await expect(page.getByRole("textbox", { name: "Automatic general draft", exact: true })).toHaveValue("Retained draft");
  await page.getByRole("button", { name: "Refresh tabs", exact: true }).click();
  await expect(automatic.getByRole("tab", { name: "Updated general", exact: true })).toHaveAttribute("data-retained", "yes");
  const manual = page.getByRole("tablist", { name: "Manual settings", exact: true });
  await manual.getByRole("tab", { name: "General", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(manual.getByRole("tab", { name: "Advanced", exact: true })).toBeFocused();
  await expect(manual.getByRole("tab", { name: "General", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(manual.getByRole("tab", { name: "Advanced", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("tabs honor controlled rejection and scoped RTL and vertical navigation", async ({ page }) => {
  await page.goto("/tabs");
  const controlled = page.getByRole("tablist", { name: "Controlled settings", exact: true });
  await controlled.getByRole("tab", { name: "Advanced", exact: true }).click();
  await expect(page.getByLabel("Tab request")).toHaveText("advanced");
  await expect(controlled.getByRole("tab", { name: "General", exact: true })).toHaveAttribute("aria-selected", "true");
  const rtl = page.getByRole("tablist", { name: "RTL settings", exact: true });
  await rtl.getByRole("tab", { name: "General", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(rtl.getByRole("tab", { name: "Advanced", exact: true })).toBeFocused();
  const vertical = page.getByRole("tablist", { name: "Vertical settings", exact: true });
  await expect(vertical).toHaveAttribute("aria-orientation", "vertical");
  await vertical.getByRole("tab", { name: "General", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(vertical.getByRole("tab", { name: "Advanced", exact: true })).toBeFocused();
});

test("tabs hydrate with retained server drafts and queued selection", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/tabs", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Automatic general draft", exact: true });
    await draft.fill("Before hydration");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    const list = page.getByRole("tablist", { name: "Automatic settings", exact: true });
    const advanced = list.getByRole("tab", { name: "Advanced", exact: true });
    await advanced.evaluate(element => element.setAttribute("data-server", "retained"));
    await advanced.click();
    release();
    await expect(advanced).toHaveAttribute("aria-selected", "true");
    await expect(advanced).toHaveAttribute("data-server", "retained");
    await list.getByRole("tab", { name: "General", exact: true }).click();
    await expect(draft).toHaveValue("Before hydration");
    await expect(draft).toHaveAttribute("data-server", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
