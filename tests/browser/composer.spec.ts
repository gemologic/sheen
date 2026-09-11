import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true", { timeout: 15_000 });
  const frame = page.locator('iframe[title="Editable AdminApp preview"]');
  await expect(frame).toHaveAttribute("data-composer-ready", "true", { timeout: 15_000 });
  await expect(page.frameLocator('iframe[title="Editable AdminApp preview"]').locator(".sheen-admin-app")).toBeVisible();
}

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.getByRole("listbox").getByRole("option", { name: option, exact: true }).click();
}

test("Composer server starter and iframe owners hydrate without blank or replacement frames", async ({ page }) => {
  let release: () => void = () => {};
  const scriptsReleased = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await scriptsReleased;
    await route.continue();
  });
  try {
    await page.goto("/composer", { waitUntil: "commit" });
    const editor = page.locator(".loupe-composer-page");
    const frameElement = page.locator('iframe[title="Editable AdminApp preview"]');
    const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
    const app = frame.locator(".sheen-admin-app");
    const table = frame.locator(".sheen-data-table");
    const draft = frame.getByRole("textbox", { name: "Search accounts", exact: true });
    await expect(editor).toContainText("Application Composer");
    await expect(app).toBeVisible();
    await expect(table).toBeVisible();
    await editor.evaluate(element => element.setAttribute("data-composer-hydration", "editor"));
    await frameElement.evaluate(element => element.setAttribute("data-composer-hydration", "frame"));
    await app.evaluate(element => element.setAttribute("data-composer-hydration", "app"));
    await table.evaluate(element => element.setAttribute("data-composer-hydration", "table"));
    await draft.fill("typed before hydration");
    await draft.evaluate(element => element.setAttribute("data-composer-hydration", "draft"));
    release();
    await ready(page);
    await expect(editor).toHaveAttribute("data-composer-hydration", "editor");
    await expect(frameElement).toHaveAttribute("data-composer-hydration", "frame");
    await expect(app).toHaveAttribute("data-composer-hydration", "app");
    await expect(table).toHaveAttribute("data-composer-hydration", "table");
    await expect(draft).toHaveAttribute("data-composer-hydration", "draft");
    await expect(draft).toHaveValue("typed before hydration");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test("brand axes and semantic placements update a retained preview independently of document history", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/composer");
  await ready(page);
  const frameElement = page.locator('iframe[title="Editable AdminApp preview"]');
  const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
  const app = frame.locator(".sheen-admin-app");
  const scope = frame.locator(".loupe-composer-preview-scope");
  const draft = frame.getByRole("textbox", { name: "Search accounts", exact: true });
  await frameElement.evaluate(element => element.setAttribute("data-composer-frame", "retained"));
  await app.evaluate(element => element.setAttribute("data-composer-app", "retained"));
  await draft.fill("preserve this draft");
  await draft.evaluate(element => element.setAttribute("data-composer-draft", "retained"));

  await choose(page, "Theme", "Paper");
  await choose(page, "Accent", "Rose");
  await choose(page, "Navigation", "Indicator");
  await choose(page, "Actions", "Accent");
  await page.getByText("Place navigation, account, and app chrome", { exact: true }).click();
  await choose(page, "Account menu placement", "Topbar end");

  await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
  await expect(scope).toHaveAttribute("data-sheen-accent", "rose");
  await expect(app).toHaveAttribute("data-admin-navigation", "indicator");
  await expect(app).toHaveAttribute("data-admin-actions", "accent");
  const account = frame.locator('.sheen-admin-account[data-admin-account-target="topbar-end"]');
  await expect(account).toBeVisible();
  expect(await account.evaluate(element => element.closest(".sheen-admin-topbar-end") !== null)).toBe(true);
  await account.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true }).click();
  const menu = frame.getByRole("menu", { name: "Open Ada Lovelace account menu", exact: true });
  await expect(menu).toBeVisible();
  const triggerBox = await account.getByRole("button", { name: "Open Ada Lovelace account menu", exact: true }).boundingBox();
  const menuBox = await menu.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(menuBox?.y ?? 0).toBeGreaterThanOrEqual((triggerBox?.y ?? 0) + (triggerBox?.height ?? 0) - 3);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(frame.locator('.sheen-admin-account[data-admin-account-target="sidebar-footer"]')).toBeVisible();
  await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
  await expect(scope).toHaveAttribute("data-sheen-accent", "rose");
  await expect(frameElement).toHaveAttribute("data-composer-frame", "retained");
  await expect(app).toHaveAttribute("data-composer-app", "retained");
  await expect(draft).toHaveAttribute("data-composer-draft", "retained");
  await expect(draft).toHaveValue("preserve this draft");
  expect(errors).toEqual([]);
});

test("selection, configuration, and every structural edit have keyboard-operable controls", async ({ page }) => {
  await page.goto("/composer");
  await ready(page);
  const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
  await frame.getByRole("group", { name: "PageHeader block", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  await title.fill("Deployments");
  await title.press("Tab");
  await expect(frame.getByRole("heading", { name: "Deployments", level: 1 })).toBeVisible();
  await expect(title).not.toBeFocused();

  await choose(page, "Component to insert", "Text");
  await page.getByRole("button", { name: "Add after", exact: true }).click();
  const added = frame.getByRole("group", { name: "Text block", exact: true }).filter({ hasText: "Lorem ipsum" });
  await expect(added).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Inspector" })).toContainText("Text");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(frame.getByRole("group", { name: "Text block", exact: true }).filter({ hasText: "Lorem ipsum" })).toHaveCount(2);
  await page.getByRole("button", { name: "Move up", exact: true }).click();
  await page.getByRole("button", { name: "Move down", exact: true }).click();
  await choose(page, "Move to region", "Details panel");
  await expect(frame.getByRole("complementary", { name: "Details" }).getByRole("group", { name: "Text block", exact: true }).filter({ hasText: "Lorem ipsum" })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Inspector" })).toContainText("Select a block");
});

test("pointer dragging is lazy, valid-region constrained, and backed by the same document history", async ({ page }) => {
  await page.goto("/composer");
  await ready(page);
  const drag = page.locator('[data-composer-palette-component="Text"] [data-composer-palette-drag]');
  const target = page.locator('[data-composer-drop-region="toolbar"]');
  await expect(page.locator(".loupe-composer-palette-column")).toHaveAttribute("data-drag-ready", "true");
  await expect(page.locator('[data-composer-palette-component="Text"]')).toHaveAttribute("data-composer-drag-ready", "true");
  await drag.scrollIntoViewIfNeeded();
  const sourceBox = await drag.boundingBox();
  if (!sourceBox) throw new Error("Composer drag source geometry is unavailable");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 24, sourceBox.y + sourceBox.height / 2 + 24, { steps: 8 });
  await expect(page.locator(".loupe-composer-drop-targets")).toHaveAttribute("data-active", "true");
  const targetPoint = await target.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const left = Math.max(0, bounds.left);
    const right = Math.min(window.innerWidth, bounds.right);
    const top = Math.max(0, bounds.top);
    const bottom = Math.min(window.innerHeight, bounds.bottom);
    return right > left && bottom > top ? { x: (left + right) / 2, y: (top + bottom) / 2 } : undefined;
  });
  if (!targetPoint) throw new Error("Composer drag target has no visible geometry");
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
  const hit = await page.evaluate(point => {
    const element = document.elementFromPoint(point.x, point.y);
    const target = document.querySelector<HTMLElement>('[data-composer-drop-region="toolbar"]')?.getBoundingClientRect();
    return { point, target: target ? { left: target.left, right: target.right, top: target.top, bottom: target.bottom } : undefined,
      tag: element?.tagName, text: element?.textContent, region: element instanceof HTMLElement ? element.dataset.composerDropRegion : undefined, className: element?.getAttribute("class"), overlay: document.querySelector(".loupe-composer-drop-targets")?.getAttribute("data-active") };
  }, targetPoint);
  if (hit.region !== "toolbar") throw new Error(`Composer drag target is obscured: ${JSON.stringify(hit)}`);
  await expect(target).toHaveAttribute("data-drag-over", "true");
  await page.mouse.up();
  await expect(page.locator(".loupe-composer-status")).toContainText("Text added to Toolbar");
  await expect(page.frameLocator('iframe[title="Editable AdminApp preview"]').getByRole("group", { name: "Text block", exact: true }).filter({ hasText: "Lorem ipsum" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
});

test("local drafts are recoverable without replacing the server starter during hydration", async ({ page }) => {
  await page.goto("/composer");
  await ready(page);
  const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
  await frame.getByRole("group", { name: "PageHeader block", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  await title.fill("Recovered deployments");
  await title.press("Tab");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sheen-loupe-composer-v1")?.includes("Recovered deployments"))).toBe(true);

  await page.reload({ waitUntil: "commit" });
  await expect(frame.getByRole("heading", { name: "Accounts", level: 1 })).toBeVisible();
  await expect(frame.getByRole("heading", { name: "Recovered deployments", level: 1 })).toHaveCount(0);
  await ready(page);
  await expect(page.getByRole("region", { name: "Recovered draft" })).toBeVisible();
  await expect(frame.getByRole("heading", { name: "Accounts", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Restore draft", exact: true }).click();
  await expect(frame.getByRole("heading", { name: "Recovered deployments", level: 1 })).toBeVisible();
});

test("generated self-contained and structure-only TSX both SSR-render and hydrate", async ({ page }) => {
  for (const mode of ["self-contained", "structure-only"]) {
    const errors: string[] = [];
    const listener = (error: Error): void => { errors.push(error.message); };
    page.on("pageerror", listener);
    await page.goto(`/composer-generated?mode=${mode}`, { waitUntil: "commit" });
    const app = page.locator(".sheen-admin-app");
    const row = page.locator('tbody tr[data-row-id="record-0001"]');
    await expect(app).toBeVisible();
    await expect(row).toBeVisible();
    await app.evaluate((element, value) => element.setAttribute("data-generated-hydration", value), mode);
    await expect(page.locator('[data-sheen-portal="root"]').last()).toHaveAttribute("data-sheen-ready", "true");
    await expect(app).toHaveAttribute("data-generated-hydration", mode);
    if (mode === "structure-only") await expect(page.getByText("Injected main slot", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    page.off("pageerror", listener);
  }
});

test("Composer editor and generated preview have no automated WCAG A or AA violations", async ({ page }) => {
  await page.goto("/composer");
  await ready(page);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
  await page.goto("/composer-preview");
  await expect(page.locator(".sheen-admin-app")).toBeVisible();
  const previewResult = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(previewResult.violations).toEqual([]);
});

test("hostile multilingual content reflows in a reduced-motion RTL phone preview without obscuring focus", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 760, height: 900 });
  await page.goto("/composer");
  await ready(page);
  const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
  await page.locator('[data-composer-palette-component="Text"]').getByRole("button", { name: "Add", exact: true }).click();
  const hostileCopy = frame.locator('[data-composer-node-id="text-1"]');
  const text = page.getByRole("textbox", { name: "Text", exact: true });
  const hostile = `مرحبا بالعالم · 中文測試 · 日本語テスト · नमस्ते दुनिया · 👩🏽‍💻 ${"a-very-long-unbroken-identifier".repeat(18)}`;
  await text.fill(hostile);
  await text.press("Tab");
  await choose(page, "Motion", "Reduced");
  await choose(page, "Direction", "Right to left");
  await choose(page, "Locale", "العربية");
  await choose(page, "Viewport", "Phone, 390 × 844");

  const scope = frame.locator(".loupe-composer-preview-scope");
  await expect(scope).toHaveAttribute("data-sheen-motion", "reduced");
  await expect(scope).toHaveAttribute("dir", "rtl");
  await expect(hostileCopy).toContainText("مرحبا بالعالم");
  expect(await scope.evaluate(element => getComputedStyle(element).getPropertyValue("--sheen-duration-fast").trim())).toBe("0ms");
  expect(await frame.locator("html").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);

  const close = frame.locator(".sheen-admin-details-header").getByRole("button", { name: "Close details", exact: true });
  await close.focus();
  const focusGeometry = await close.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, bounds.left + bounds.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, bounds.top + bounds.height / 2));
    const visible = document.elementFromPoint(x, y);
    return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left, visible: visible === element || element.contains(visible) };
  });
  expect(focusGeometry.top).toBeGreaterThanOrEqual(0);
  expect(focusGeometry.left).toBeGreaterThanOrEqual(0);
  expect(focusGeometry.right).toBeLessThanOrEqual(390);
  expect(focusGeometry.bottom).toBeLessThanOrEqual(844);
  expect(focusGeometry.visible).toBe(true);

  const targetSizeViolations = async (targets: Locator): Promise<readonly string[]> => targets.evaluateAll(elements => {
    const samples = elements.map(element => ({
      label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "",
      bounds: element.getBoundingClientRect(),
      equivalent: element.matches("[data-composer-drag-handle], [data-composer-palette-drag]"),
    }));
    return samples.flatMap((sample, index) => {
      if (sample.equivalent || (sample.bounds.width >= 24 && sample.bounds.height >= 24)) return [];
      const center = { x: sample.bounds.left + sample.bounds.width / 2, y: sample.bounds.top + sample.bounds.height / 2 };
      const overlaps = samples.some((candidate, candidateIndex) => {
        if (candidateIndex === index || candidate.equivalent) return false;
        if (candidate.bounds.width < 24 || candidate.bounds.height < 24) {
          const x = candidate.bounds.left + candidate.bounds.width / 2 - center.x;
          const y = candidate.bounds.top + candidate.bounds.height / 2 - center.y;
          return Math.hypot(x, y) < 24;
        }
        const x = Math.max(candidate.bounds.left, Math.min(center.x, candidate.bounds.right));
        const y = Math.max(candidate.bounds.top, Math.min(center.y, candidate.bounds.bottom));
        return Math.hypot(x - center.x, y - center.y) < 12;
      });
      return overlaps ? [`${sample.label} (${sample.bounds.width.toFixed(1)} × ${sample.bounds.height.toFixed(1)})`] : [];
    });
  });
  expect(await targetSizeViolations(page.locator(".loupe-composer-page button:visible"))).toEqual([]);
  expect(await targetSizeViolations(frame.locator("button:visible"))).toEqual([]);
  await expect(hostileCopy).toHaveCSS("outline-style", "solid");

  await page.setViewportSize({ width: 640, height: 900 });
  expect(await page.locator("html").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.locator("html").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).include(".loupe-composer-page").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
});

test("repeated add and remove edits retain a bounded live DOM and drag-registration surface", async ({ page }) => {
  await page.goto("/composer");
  await ready(page);
  const frame = page.frameLocator('iframe[title="Editable AdminApp preview"]');
  const nodes = frame.locator("[data-composer-node-id]");
  const registered = frame.locator("[data-composer-node-id][data-composer-drag-ready]");
  const paletteItems = page.locator("[data-composer-palette-component]");
  const addText = page.locator('[data-composer-palette-component="Text"]').getByRole("button", { name: "Add", exact: true });
  const initialNodes = await nodes.count();
  const initialPaletteItems = await paletteItems.count();
  await expect(registered).toHaveCount(initialNodes);

  for (let index = 0; index < 24; index++) {
    await addText.click();
    await expect(nodes).toHaveCount(initialNodes + 1);
    await expect(registered).toHaveCount(initialNodes + 1);
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(nodes).toHaveCount(initialNodes);
    await expect(registered).toHaveCount(initialNodes);
  }

  await expect(paletteItems).toHaveCount(initialPaletteItems);
  const storedBytes = await page.evaluate(() => localStorage.getItem("sheen-loupe-composer-v1")?.length ?? 0);
  expect(storedBytes).toBeLessThan(20_000);
});
