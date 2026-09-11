import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

test("SplitLayout exposes labeled panes and persists keyboard resizing through a real endpoint", async ({ page }) => {
  await page.goto("/split-layout");
  await ready(page);
  await expect(page.getByRole("region", { name: "Source editor" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rendered preview" })).toBeVisible();
  const separator = page.getByRole("separator", { name: "Resize source and preview" });
  await expect(separator).toHaveAttribute("aria-valuenow", "36");
  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "41");
  await expect(page.getByRole("status", { name: "Split save status" })).toHaveText("saved");
  await expect(page.getByRole("status", { name: "Persisted split sizes" })).toHaveText("41 / 59");
  await expect(separator).toBeFocused();
});

test("SplitLayout stacks one retained content tree in a narrow container and restores the split", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/split-layout");
  await ready(page);
  const layout = page.getByRole("group", { name: "Document workspace" });
  const source = page.locator('[data-pane-content="source"]');
  const preview = page.locator('[data-pane-content="preview"]');
  const input = page.getByRole("textbox", { name: "Draft note" });
  const separator = page.getByRole("separator", { name: "Resize source and preview" });
  await source.evaluate(element => element.setAttribute("data-owner", "source"));
  await preview.evaluate(element => element.setAttribute("data-owner", "preview"));
  await input.fill("Retained narrow draft");
  await expect(separator).toBeVisible();
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(separator).toBeHidden();
  await expect(page.getByRole("region", { name: "Source editor" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rendered preview" })).toBeVisible();
  await expect(source).toHaveAttribute("data-owner", "source");
  await expect(preview).toHaveAttribute("data-owner", "preview");
  await expect(input).toHaveValue("Retained narrow draft");
  await expect(layout.locator('[data-pane-content="source"]')).toHaveCount(1);
  await expect(layout.locator('[data-pane-content="preview"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(separator).toBeVisible();
  await expect(source).toHaveAttribute("data-owner", "source");
  await expect(input).toHaveValue("Retained narrow draft");
});

test("SplitLayout refresh retains accepted panes, draft, separator, and focused action on every frame", async ({ page }) => {
  await page.goto("/split-layout");
  await ready(page);
  const layout = page.getByRole("group", { name: "Document workspace" });
  const source = page.locator('[data-pane-content="source"]');
  const preview = page.locator('[data-pane-content="preview"]');
  const input = page.getByRole("textbox", { name: "Draft note" });
  const separator = page.getByRole("separator", { name: "Resize source and preview" });
  const refresh = page.getByRole("button", { name: "Refresh preview" });
  await source.evaluate(element => element.setAttribute("data-owner", "source"));
  await preview.evaluate(element => element.setAttribute("data-owner", "preview"));
  await separator.evaluate(element => element.setAttribute("data-owner", "separator"));
  await input.fill("Draft retained during refresh");
  await refresh.focus();
  await refresh.press("Enter");
  await expect(layout).toHaveAttribute("aria-busy", "true");
  const samples = await layout.evaluate(async element => {
    const frames: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      frames.push(element.textContent ?? "");
    }
    return frames;
  });
  expect(samples.every(sample => sample.includes("Source") && sample.includes("Preview") && sample.includes("Draft retained during refresh"))).toBe(true);
  await expect(page.getByRole("status", { name: "Preview revision" })).toHaveText("Revision 2");
  await expect(layout).not.toHaveAttribute("aria-busy", "true");
  await expect(source).toHaveAttribute("data-owner", "source");
  await expect(preview).toHaveAttribute("data-owner", "preview");
  await expect(separator).toHaveAttribute("data-owner", "separator");
  await expect(input).toHaveValue("Draft retained during refresh");
  await expect(refresh).toBeFocused();
});

test("SplitLayout retains complete server geometry and an early native draft through delayed hydration", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/split-layout", { waitUntil: "commit" });
    const layout = page.getByRole("group", { name: "Document workspace" });
    const source = page.getByRole("region", { name: "Source editor" });
    const preview = page.getByRole("region", { name: "Rendered preview" });
    const input = page.getByRole("textbox", { name: "Draft note" });
    const panel = source.locator("xpath=../..");
    await expect(source).toContainText("Source");
    await expect(preview).toContainText("Accepted preview revision 1");
    await expect(panel).toHaveCSS("flex-basis", "36%");
    await layout.evaluate(element => element.setAttribute("data-server", "layout"));
    await source.evaluate(element => element.setAttribute("data-server", "source"));
    await preview.evaluate(element => element.setAttribute("data-server", "preview"));
    await input.fill("Typed before hydration");
    release();
    await ready(page);
    await expect(layout).toHaveAttribute("data-server", "layout");
    await expect(source).toHaveAttribute("data-server", "source");
    await expect(preview).toHaveAttribute("data-server", "preview");
    await expect(input).toHaveValue("Typed before hydration");
    await expect(panel).toHaveCSS("flex-basis", "36%");
  } finally { release(); }
});

test("SplitLayout has no automated WCAG A or AA violations and preserves forced-colors boundaries", async ({ page }) => {
  await page.goto("/split-layout");
  await ready(page);
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.setViewportSize({ width: 600, height: 800 });
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.emulateMedia({ forcedColors: "active" });
  await page.setViewportSize({ width: 1000, height: 800 });
  const separator = page.getByRole("separator", { name: "Resize source and preview" });
  await separator.focus();
  await expect(separator).toHaveCSS("outline-style", "solid");
  await expect(separator.locator("span")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});
