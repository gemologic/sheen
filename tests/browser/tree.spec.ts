import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

test("tree keyboard behavior separates focus, selection, expansion, and activation", async ({ page }) => {
  await page.goto("/tree");
  await ready(page);
  const source = page.getByRole("treeitem", { name: "Source r0", exact: true });
  const app = page.getByRole("treeitem", { name: "App", exact: true });
  const tests = page.getByRole("treeitem", { name: "Tests", exact: true });
  const archive = page.getByRole("treeitem", { name: "Archive", exact: true });
  const old = page.getByRole("treeitem", { name: "Old", exact: true });
  await source.focus();
  await source.press("ArrowRight");
  await expect(app).toBeFocused();
  await app.press("ArrowDown");
  await expect(tests).toBeFocused();
  await tests.press("End");
  await expect(archive).toBeFocused();
  await archive.press("ArrowRight");
  await expect(archive).toHaveAttribute("aria-expanded", "true");
  await archive.press("ArrowRight");
  await expect(old).toBeFocused();
  await old.press("ArrowLeft");
  await expect(archive).toBeFocused();
  await archive.press(" ");
  await expect(page.getByRole("status", { name: "Selected tree values" })).toHaveText("readme,archive");
  await archive.press("r");
  await expect(page.getByRole("treeitem", { name: "README", exact: true })).toBeFocused();
  await page.getByRole("treeitem", { name: "README", exact: true }).press("Enter");
  await expect(page.getByRole("status", { name: "Activated tree value" })).toHaveText("readme");
  await page.waitForTimeout(550);
  await page.getByRole("treeitem", { name: "README", exact: true }).press("l");
  const locked = page.getByRole("treeitem", { name: "Locked", exact: true });
  await expect(locked).toBeFocused();
  await locked.press(" ");
  await locked.press("Enter");
  await expect(page.getByRole("status", { name: "Selected tree values" })).toHaveText("readme,archive");
  await expect(page.getByRole("status", { name: "Activated tree value" })).toHaveText("readme");
});

test("tree retains visible and collapsed identities through a background refresh", async ({ page }) => {
  await page.goto("/tree");
  await ready(page);
  const surface = page.locator(".loupe-tree-surface");
  const tree = page.getByRole("tree", { name: "Workspace" });
  const source = page.getByRole("treeitem", { name: "Source r0", exact: true });
  const old = page.locator('[data-sheen-tree-value="old"]');
  await tree.evaluate(element => { element.dataset.retainedTree = "yes"; });
  await source.evaluate(element => { element.dataset.retainedSource = "yes"; });
  await old.evaluate(element => { element.dataset.retainedOld = "yes"; });
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Refreshing workspace" })).toBeVisible();
  await source.focus();
  const frames = await surface.evaluate(async element => {
    const samples: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push(element.textContent ?? "");
    }
    return samples;
  });
  expect(frames.every(frame => frame.includes("Source") && frame.includes("README") && frame.includes("Archive"))).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Accepted revision 1" })).toBeVisible();
  await expect(tree).toHaveAttribute("data-retained-tree", "yes");
  await expect(page.getByRole("treeitem", { name: "Source r1", exact: true })).toHaveAttribute("data-retained-source", "yes");
  await expect(old).toHaveAttribute("data-retained-old", "yes");
  await expect(page.getByRole("treeitem", { name: "Source r1", exact: true })).toBeFocused();
  await expect(page.getByRole("treeitem", { name: "Worker r1", exact: true })).toBeVisible();
});

test("server tree is complete and correctly collapsed without scripts", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/tree");
    await expect(page.locator("html")).not.toHaveAttribute("data-sheen-mode", /.+/u);
    await expect(page.locator(".loupe-tree-surface")).toHaveAttribute("data-sheen-mode", "dark");
    await expect(page.getByRole("tree", { name: "Workspace" })).toBeVisible();
    await expect(page.getByRole("treeitem", { name: "Source r0", exact: true })).toHaveAttribute("tabindex", "0");
    await expect(page.getByRole("treeitem", { name: "App", exact: true })).toBeVisible();
    await expect(page.locator('[data-sheen-tree-value="old"]')).toBeHidden();
    await expect(page.getByRole("treeitem", { name: "README", exact: true })).toHaveAttribute("aria-selected", "true");
  } finally { await context.close(); }
});

test("tree hydration preserves server nodes and initial semantics", async ({ page }) => {
  await page.addInitScript(() => {
    const mark = (): void => {
      const tree = document.querySelector<HTMLElement>('[role="tree"]');
      const source = document.querySelector<HTMLElement>('[data-sheen-tree-value="source"]');
      const old = document.querySelector<HTMLElement>('[data-sheen-tree-value="old"]');
      if (tree) tree.dataset.serverTree = "yes";
      if (source) source.dataset.serverSource = "yes";
      if (old) old.dataset.serverOld = "yes";
    };
    new MutationObserver(mark).observe(document, { childList: true, subtree: true });
    mark();
  });
  await page.goto("/tree");
  await ready(page);
  await expect(page.getByRole("tree", { name: "Workspace" })).toHaveAttribute("data-server-tree", "yes");
  await expect(page.getByRole("treeitem", { name: "Source r0", exact: true })).toHaveAttribute("data-server-source", "yes");
  await expect(page.locator('[data-sheen-tree-value="old"]')).toHaveAttribute("data-server-old", "yes");
  await expect(page.getByRole("treeitem", { name: "Source r0", exact: true })).toHaveAttribute("aria-expanded", "true");
});
