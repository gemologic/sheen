import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function openColumns(page: Page, section: Locator, caption: string): Promise<void> {
  const toolbar = section.getByRole("toolbar", { name: `${caption} table controls`, exact: true });
  const columns = toolbar.getByRole("button", { name: "Columns", exact: true });
  if (await columns.isVisible()) {
    await columns.click();
    return;
  }
  const more = toolbar.getByRole("button", { name: "More actions", exact: true });
  if (await more.getAttribute("aria-expanded") === "true") await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.focus();
  await more.press("Enter");
  const columnsItem = page.getByRole("menuitem", { name: "Columns", exact: true });
  await expect(columnsItem).toBeVisible();
  await columnsItem.hover();
}

test("continuous client mode virtualizes one complete bounded result without page controls", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Continuous client example" });
  const root = section.locator(".sheen-data-table");
  const table = section.getByRole("table", { name: "Continuous client rows" });
  await expect(root).not.toHaveAttribute("data-variant");
  await expect(root).toHaveCSS("border-top-width", "1px");
  await expect(root).toHaveCSS("border-radius", "8px");
  await expect(table).toHaveAttribute("aria-rowcount", "301");
  const firstRow = table.locator('[data-row-id="client-0"]');
  await expect(firstRow).toHaveCSS("height", "34px");
  await firstRow.evaluate(element => element.setAttribute("data-density-identity", "retained"));
  await section.getByRole("button", { name: "Compact table" }).click();
  await expect(firstRow).toHaveCSS("height", "28px");
  await expect(table.locator('[data-row-id="client-1"]')).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 28)");
  await expect(table.locator("thead th").first()).toHaveCSS("height", "28px");
  await expect(section.getByRole("button", { name: "Columns", exact: true })).toHaveCSS("height", "26px");
  await expect(firstRow).toHaveAttribute("data-density-identity", "retained");
  await section.getByRole("button", { name: "Spacious table" }).click();
  await expect(firstRow).toHaveCSS("height", "42px");
  await expect(table.locator('[data-row-id="client-1"]')).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 42)");
  expect(await table.locator("tbody tr[data-row-id]").count()).toBeLessThan(300);
  await expect(section.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  const viewport = section.locator(".sheen-data-table-viewport");
  const blankFrames = await viewport.evaluate(async element => {
    let blank = 0;
    for (let frame = 0; frame <= 40; frame++) {
      element.scrollTop = ((element.scrollHeight - element.clientHeight) * frame) / 40;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const bounds = element.getBoundingClientRect();
      const visible = [...element.querySelectorAll("tbody tr[data-row-id]")].some(row => {
        const rect = row.getBoundingClientRect();
        return rect.bottom > bounds.top && rect.top < bounds.bottom;
      });
      if (!visible) blank++;
    }
    return blank;
  });
  expect(blankFrames).toBe(0);
  await expect(table.locator('[data-row-id="client-299"]')).toBeVisible();
  expect(await table.locator("tbody tr[data-row-id]").count()).toBeLessThan(40);
});

test("continuous client refresh preserves the first visible row anchor", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Continuous client example" });
  const viewport = section.locator(".sheen-data-table-viewport");
  const anchor = await viewport.evaluate(async element => {
    element.scrollTop = 3_600;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const bounds = element.getBoundingClientRect();
    const visibleTop = element.querySelector("thead")?.getBoundingClientRect().bottom ?? bounds.top;
    const row = [...element.querySelectorAll<HTMLElement>("tbody tr[data-row-id]")].find(candidate => candidate.getBoundingClientRect().bottom > visibleTop);
    if (!row?.dataset.rowId) throw new Error("Expected a visible anchor row");
    const rowIndex = Number(row.getAttribute("aria-rowindex"));
    if (!Number.isInteger(rowIndex) || rowIndex < 2) throw new Error("Expected a logical row index");
    return { id: row.dataset.rowId, offset: row.getBoundingClientRect().top - bounds.top, rowIndex };
  });
  const anchorRow = viewport.locator(`[data-row-id="${anchor.id}"]`);
  await anchorRow.evaluate(element => {
    element.setAttribute("data-anchor-identity", "retained");
    element.focus({ preventScroll: true });
  });
  await expect(anchorRow).toBeFocused();
  await section.getByRole("button", { name: "Prepend continuous row" }).evaluate(element => {
    if (!(element instanceof HTMLElement)) throw new Error("Expected an HTML button");
    element.click();
  });
  const nextOffset = await viewport.evaluate(async (element, id) => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const row = element.querySelector<HTMLElement>(`tbody tr[data-row-id="${CSS.escape(id)}"]`);
    if (!row) throw new Error("Expected the retained anchor row");
    return row.getBoundingClientRect().top - element.getBoundingClientRect().top;
  }, anchor.id);
  expect(Math.abs(nextOffset - anchor.offset)).toBeLessThanOrEqual(1);
  await expect(anchorRow).toHaveAttribute("data-anchor-identity", "retained");
  await expect(anchorRow).toHaveAttribute("aria-rowindex", String(anchor.rowIndex + 1));
  await expect(anchorRow).toBeFocused();
});

test("column resize stays on the CSS path during pointer movement and commits once", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Column interaction example" });
  const table = section.getByRole("table", { name: "Interactive columns" });
  const header = table.locator('th[data-column="name"]');
  const resize = header.getByRole("separator", { name: "Resize Name" });
  const row = table.locator('[data-row-id="client-0"]');
  await row.evaluate(element => element.setAttribute("data-resize-identity", "retained"));
  await resize.focus();
  await resize.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", "190");
  await expect(resize).toHaveAttribute("aria-valuetext", "190 pixels");
  await expect(section.getByLabel("Accepted column layout")).toContainText("name:shown:190:center");

  const box = await resize.boundingBox();
  if (!box) throw new Error("Expected a visible column resize handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const widths: number[] = [];
  for (const delta of [8, 16, 24, 32, 40]) {
    await page.mouse.move(box.x + box.width / 2 + delta, box.y + box.height / 2);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    widths.push(await header.evaluate(element => element.getBoundingClientRect().width));
  }
  await page.mouse.up();
  expect(widths.every((width, index) => index === 0 || width >= (widths[index - 1] ?? 0))).toBe(true);
  expect(widths.at(-1)).toBeGreaterThanOrEqual(229);
  await expect(section.getByLabel("Accepted column layout")).toContainText("name:shown:230:center");
  await expect(row).toHaveAttribute("data-resize-identity", "retained");
  await expect(resize).toBeFocused();

  await resize.dblclick();
  const autoFit = Number(await resize.getAttribute("aria-valuenow"));
  expect(autoFit).toBeGreaterThanOrEqual(100);
  expect(autoFit).toBeLessThanOrEqual(360);
  await openColumns(page, section, "Interactive columns");
  await page.getByRole("menuitem", { name: "Name", exact: true }).hover();
  await page.getByRole("menuitem", { name: "Reset width" }).click();
  await expect(header).toHaveCSS("width", "180px");
  await expect(section.getByLabel("Accepted column layout")).toContainText("name:shown:default:center");
  await expect(row).toHaveAttribute("data-resize-identity", "retained");
});

test("multi-sort keeps one primary aria-sort and exposes visible ordered indicators", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Column interaction example" });
  const table = section.getByRole("table", { name: "Interactive columns" });
  const name = table.locator('th[data-column="name"]');
  const amount = table.locator('th[data-column="amount"]');
  await name.getByRole("button", { name: "Name", exact: true }).click();
  await amount.getByRole("button", { name: "Amount", exact: true }).click({ modifiers: ["Shift"] });
  await expect(name).toHaveAttribute("aria-sort", "ascending");
  await expect(amount).not.toHaveAttribute("aria-sort");
  await expect(name).toHaveAttribute("data-sort-priority", "1");
  await expect(amount).toHaveAttribute("data-sort-priority", "2");
  await expect(name.locator(".sheen-data-table-sort-indicator")).toHaveText("↑1");
  await expect(amount.locator(".sheen-data-table-sort-indicator")).toHaveText("↑2");
  const nameDescription = await name.getByRole("button", { name: "Name", exact: true }).getAttribute("aria-describedby");
  const amountDescription = await amount.getByRole("button", { name: "Amount", exact: true }).getAttribute("aria-describedby");
  if (!nameDescription || !amountDescription) throw new Error("Expected sort descriptions");
  await expect(page.locator(`[id="${nameDescription}"]`)).toHaveText("ascending, priority 1 of 2");
  await expect(page.locator(`[id="${amountDescription}"]`)).toHaveText("ascending, priority 2 of 2");
  expect(await table.locator("thead [aria-sort]").count()).toBe(1);
});

test("narrow table chrome overflows without a hydration flash or owner replacement", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/data-table", { waitUntil: "commit" });
    const section = page.getByRole("region", { name: "Column interaction example" });
    const root = section.locator(".loupe-column-table");
    const toolbar = section.getByRole("toolbar", { name: "Interactive columns table controls", exact: true });
    const row = section.locator('[data-row-id="client-0"]');
    const columns = toolbar.getByRole("button", { name: "Columns", exact: true });
    const more = toolbar.getByRole("button", { name: "More actions", exact: true });
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByText("20 results", { exact: true })).toBeVisible();
    await expect(columns).toBeHidden();
    await expect(more).toBeVisible();
    const serverBounds = await toolbar.boundingBox();
    await toolbar.evaluate(element => element.setAttribute("data-toolbar-identity", "retained"));
    await row.evaluate(element => element.setAttribute("data-toolbar-row-identity", "retained"));

    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(toolbar).toHaveAttribute("data-toolbar-identity", "retained");
    await expect(row).toHaveAttribute("data-toolbar-row-identity", "retained");
    expect(await toolbar.boundingBox()).toEqual(serverBounds);
    await expect(columns).toBeHidden();
    await expect(more).toBeVisible();

    await more.click();
    const columnsItem = page.getByRole("menuitem", { name: "Columns", exact: true });
    await expect(columnsItem).toBeVisible();
    await columnsItem.press("ArrowRight");
    await expect(page.getByRole("menuitem", { name: "Name", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await root.evaluate(element => { if (element instanceof HTMLElement) element.style.inlineSize = "48rem"; });
    await expect(columns).toBeVisible();
    await expect(more).toBeHidden();
    await expect(toolbar).toHaveAttribute("data-toolbar-identity", "retained");
    await expect(row).toHaveAttribute("data-toolbar-row-identity", "retained");
  } finally { release(); }
});

test("columns reorder, pin, and hide through pointer-independent controls without replacing cells", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Column interaction example" });
  const table = section.getByRole("table", { name: "Interactive columns" });
  const amountCell = table.locator('[data-row-id="client-0"] td[data-column="amount"]');
  await amountCell.evaluate(element => element.setAttribute("data-column-cell-identity", "retained"));

  const reorder = table.getByRole("button", { name: "Drag to reorder Name" });
  await reorder.focus();
  await reorder.press("ArrowRight");
  await expect(reorder).toBeFocused();
  expect(await table.locator("thead th[data-column]").evaluateAll(headers => headers.map(header => header.getAttribute("data-column")))).toEqual(["amount", "name", "identifier"]);
  await expect(amountCell).toHaveAttribute("data-column-cell-identity", "retained");

  const dragHandle = await table.getByRole("button", { name: "Drag to reorder Name" }).boundingBox();
  const dragTarget = await table.locator('th[data-column="amount"]').boundingBox();
  if (!dragHandle || !dragTarget) throw new Error("Expected visible column drag geometry");
  await page.mouse.move(dragHandle.x + dragHandle.width / 4, dragHandle.y + dragHandle.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragTarget.x + 2, dragTarget.y + 12, { steps: 5 });
  await expect(section.locator(".sheen-data-table")).toHaveAttribute("data-reordering", "name");
  await expect(table.locator('th[data-column="amount"]')).toHaveAttribute("data-drop-placement", "before");
  await page.mouse.up();
  expect(await table.locator("thead th[data-column]").evaluateAll(headers => headers.map(header => header.getAttribute("data-column")))).toEqual(["name", "amount", "identifier"]);
  await expect(amountCell).toHaveAttribute("data-column-cell-identity", "retained");

  await section.getByRole("button", { name: "Use RTL column layout" }).click();
  await openColumns(page, section, "Interactive columns");
  await page.getByRole("menuitem", { name: "Name", exact: true }).hover();
  await page.getByRole("menuitemradio", { name: "Pin to start" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(table.locator('th[data-column="name"]')).toHaveAttribute("data-pin", "start");
  await expect(table.locator('th[data-column="name"]')).toHaveAttribute("data-pin-edge", "start");
  expect(await table.locator("thead th[data-column]").evaluateAll(headers => headers.map(header => header.getAttribute("data-column")))).toEqual(["name", "amount", "identifier"]);
  const pinnedBefore = await table.locator('th[data-column="name"]').evaluate(element => element.getBoundingClientRect().right);
  await section.locator(".sheen-data-table-viewport").evaluate(element => { element.scrollLeft = -100; });
  const pinnedAfter = await table.locator('th[data-column="name"]').evaluate(element => element.getBoundingClientRect().right);
  expect(Math.abs(pinnedAfter - pinnedBefore)).toBeLessThanOrEqual(1);
  const pinnedEdge = await table.locator('th[data-column="name"]').evaluate(element => {
    const style = getComputedStyle(element, "::before");
    return { background: style.backgroundColor, shadow: style.boxShadow };
  });
  expect(pinnedEdge.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(pinnedEdge.shadow).not.toBe("none");
  const firstRow = table.locator('tr[data-row-id="client-0"]');
  await firstRow.hover();
  const pinnedFill = await firstRow.evaluate(element => {
    const cell = element.querySelector('td[data-column="name"]');
    if (!cell) throw new Error("Expected a pinned Name cell");
    return { row: getComputedStyle(element).backgroundColor, cell: getComputedStyle(cell).backgroundColor };
  });
  expect(pinnedFill.cell).toBe(pinnedFill.row);

  await openColumns(page, section, "Interactive columns");
  await page.getByRole("menuitem", { name: "Amount", exact: true }).hover();
  await page.getByRole("menuitemcheckbox", { name: "Show column" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(table.locator('th[data-column="amount"]')).toHaveCount(0);
  await expect(section.getByLabel("Accepted column layout")).toContainText("amount:hidden");
});

test("server-side column layout changes do not dispatch data requests", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/data-table") requests++; });
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Paginated server example" });
  const table = section.getByRole("table", { name: "Paginated server rows" });
  const row = table.locator('[data-row-id="server-0"]');
  await row.evaluate(element => element.setAttribute("data-local-layout-identity", "retained"));
  await table.getByRole("separator", { name: "Resize Amount" }).press("ArrowRight");
  await expect(table.locator('th[data-column="amount"]')).toHaveCSS("width", "130px");
  await expect(row).toHaveAttribute("data-local-layout-identity", "retained");
  expect(requests).toBe(0);
});

test("column layout controls have a bounded dark visual baseline", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Column interaction example" });
  await section.scrollIntoViewIfNeeded();
  await section.getByRole("separator", { name: "Resize Name" }).focus();
  await expect(section).toHaveScreenshot("data-table-columns-dark.png");
});

test("polished table chrome spans light compact and contrast spacious RTL configurations", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Column interaction example" });
  const root = section.locator(".sheen-data-table");
  const table = section.getByRole("table", { name: "Interactive columns" });
  await table.getByRole("button", { name: "Name", exact: true }).click();
  await table.getByRole("button", { name: "Amount", exact: true }).click({ modifiers: ["Shift"] });
  await openColumns(page, section, "Interactive columns");
  await page.getByRole("menuitem", { name: "Name", exact: true }).hover();
  await page.getByRole("menuitemradio", { name: "Pin to start" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await root.evaluate(element => {
    const scope = element.closest("[data-sheen-theme]");
    if (!scope) throw new Error("Expected a theme scope");
    scope.setAttribute("data-sheen-theme", "paper");
    scope.setAttribute("data-sheen-mode", "light");
    scope.setAttribute("data-sheen-density", "compact");
  });
  await table.getByRole("separator", { name: "Resize Name" }).focus();
  await expect(table.locator('tr[data-row-id="client-0"]')).toHaveCSS("height", "28px");
  await expect(root).toHaveScreenshot("data-table-columns-paper-light-compact.png", { maxDiffPixelRatio: 0.004 });

  await root.evaluate(element => {
    const scope = element.closest("[data-sheen-theme]");
    if (!scope) throw new Error("Expected a theme scope");
    scope.setAttribute("data-sheen-theme", "contrast");
    scope.setAttribute("data-sheen-mode", "light");
    scope.setAttribute("data-sheen-density", "spacious");
  });
  await section.getByRole("button", { name: "Use RTL column layout" }).click();
  await table.getByRole("separator", { name: "Resize Name" }).focus();
  await expect(table.locator('tr[data-row-id="client-0"]')).toHaveCSS("height", "42px");
  await expect(root).toHaveScreenshot("data-table-columns-contrast-light-spacious-rtl.png", { maxDiffPixelRatio: 0.004 });
});

test("variable-height rows measure wrapped content and remain populated while scrolling", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Variable-height client example" });
  const table = section.getByRole("table", { name: "Variable-height client rows" });
  const heights = await table.locator("tbody tr[data-row-id]").evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
  expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(30);
  const viewport = section.locator(".sheen-data-table-viewport");
  const blankFrames = await viewport.evaluate(async element => {
    let blank = 0;
    for (let frame = 0; frame <= 30; frame++) {
      element.scrollTop = ((element.scrollHeight - element.clientHeight) * frame) / 30;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const bounds = element.getBoundingClientRect();
      if (![...element.querySelectorAll("tbody tr[data-row-id]")].some(row => {
        const rect = row.getBoundingClientRect();
        return rect.bottom > bounds.top && rect.top < bounds.bottom;
      })) blank++;
    }
    return blank;
  });
  expect(blankFrames).toBe(0);
  await expect(table.locator('[data-row-id="variable-79"]')).toBeVisible();
});

test("client grouping exposes complete-view aggregates and keyboard collapses stable group rows", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Grouped client example" });
  const table = section.getByRole("treegrid", { name: "Grouped client rows" });
  await expect(table.locator("tbody tr[data-group-id]" )).toHaveCount(3);
  const alpha = table.locator('tr[data-group-id*="Alpha"]');
  await expect(alpha.locator('td[data-column="amount"]')).toHaveText("30");
  await expect(alpha).toHaveAttribute("aria-level", "1");
  await expect(table.locator('[data-row-id="group-a"]')).toHaveAttribute("aria-level", "2");
  await alpha.evaluate(element => element.setAttribute("data-group-identity", "retained"));
  await alpha.focus();
  await alpha.press("ArrowLeft");
  await expect(alpha).toHaveAttribute("aria-expanded", "false");
  await expect(table.locator('[data-row-id="group-a"]')).toHaveCount(0);
  await expect(alpha).toHaveAttribute("data-group-identity", "retained");
  await alpha.press("ArrowRight");
  await expect(table.locator('[data-row-id="group-a"]')).toBeVisible();
  await expect(alpha).toBeFocused();
});

test("delegated server grouping retains accepted groups and uses full-query totals across pages", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Grouped server example" });
  const table = section.getByRole("treegrid", { name: "Grouped server rows" });
  const alpha = table.locator('tr[data-group-id*="Alpha"]');
  await expect(alpha).toContainText("(30)");
  await expect(alpha.locator('td[data-column="amount"]')).toHaveText("4350");
  await alpha.evaluate(element => element.setAttribute("data-server-group-identity", "retained"));

  await section.getByRole("button", { name: "Next page" }).click();
  await expect(section.locator(".sheen-data-table")).toHaveAttribute("data-previous-results", "");
  await expect(alpha).toHaveAttribute("data-server-group-identity", "retained");
  await expect(alpha.getByRole("button", { name: "Collapse Alpha" })).toBeDisabled();
  await expect(table.locator('[data-row-id="server-10"]')).toBeVisible();
  await expect(alpha).toHaveAttribute("data-server-group-identity", "retained");
  await expect(alpha).toContainText("(30)");

  await section.getByRole("button", { name: "Next page" }).click();
  await expect(table.locator('[data-row-id="server-20"]')).toBeVisible();
  await section.getByRole("button", { name: "Next page" }).click();
  const beta = table.locator('tr[data-group-id*="Beta"]');
  await expect(table.locator('[data-row-id="server-30"]')).toBeVisible();
  await expect(beta).toContainText("(25)");
  await expect(beta.locator('td[data-column="amount"]')).toHaveText("10500");
});

test("hierarchical rows load, cancel, discard stale children, and retry without replacing parents", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Hierarchical client example" });
  const table = section.getByRole("treegrid", { name: "Hierarchical client rows" });
  await expect(table.locator('[data-row-id="tree-default-child-1"]')).toBeVisible();

  const staticParent = table.locator('[data-row-id="tree-static"]');
  await staticParent.focus();
  await staticParent.press("ArrowRight");
  await expect(table.locator('[data-row-id="tree-static-child"]')).toBeVisible();
  await staticParent.press("ArrowRight");
  await expect(table.locator('[data-row-id="tree-static-child"]')).toBeFocused();
  await table.locator('[data-row-id="tree-static-child"]').press("ArrowLeft");
  await expect(staticParent).toBeFocused();

  const remoteParent = table.locator('[data-row-id="tree-remote"]');
  await remoteParent.evaluate(element => element.setAttribute("data-parent-identity", "retained"));
  await remoteParent.getByRole("button", { name: "Expand tree-remote" }).click();
  await expect(remoteParent).toHaveAttribute("data-loading", "");
  await remoteParent.getByRole("button", { name: "Collapse tree-remote" }).click();
  await remoteParent.getByRole("button", { name: "Expand tree-remote" }).click();
  await expect(table.locator('[data-row-id="tree-remote-child-2"]')).toBeVisible();
  await page.waitForTimeout(100);
  await expect(table.locator('[data-row-id="tree-remote-child-1"]')).toHaveCount(0);
  await expect(remoteParent).toHaveAttribute("data-parent-identity", "retained");

  const retryParent = table.locator('[data-row-id="tree-retry"]');
  await retryParent.getByRole("button", { name: "Expand tree-retry" }).click();
  await expect(retryParent).toHaveAttribute("data-load-error", "");
  await expect(retryParent.getByRole("alert")).toContainText("Something went wrong");
  await retryParent.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(table.locator('[data-row-id="tree-retry-child-2"]')).toBeVisible();
  await expect(retryParent).not.toHaveAttribute("data-load-error", "");

  await section.getByRole("button", { name: "Switch hierarchy authority" }).click();
  await expect(table.locator('[data-row-id="tree-remote-child-2"]')).toHaveCount(0);
  await expect(table.locator('[data-row-id="tree-retry-child-2"]')).toHaveCount(0);
  await expect(remoteParent).toHaveAttribute("data-parent-identity", "retained");
  await expect(remoteParent).toHaveAttribute("aria-expanded", "false");
});

test("pre-hydration hierarchy expansion reuses the focused native control and server row", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/data-table", { waitUntil: "commit" });
    const table = page.getByRole("treegrid", { name: "Hierarchical client rows" });
    const parent = table.locator('[data-row-id="tree-static"]');
    const expander = parent.getByRole("button", { name: "Expand tree-static" });
    await parent.evaluate(element => element.setAttribute("data-hierarchy-hydration-identity", "retained"));
    await expander.evaluate(element => element.setAttribute("data-expander-hydration-identity", "retained"));
    await expander.focus();
    await expander.press("Enter");
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(table.locator('[data-row-id="tree-static-child"]')).toBeVisible();
    await expect(parent).toHaveAttribute("data-hierarchy-hydration-identity", "retained");
    const retainedExpander = parent.locator('[data-expander-hydration-identity="retained"]');
    await expect(retainedExpander).toHaveAttribute("aria-label", "Collapse tree-static");
    await expect(retainedExpander).toBeFocused();
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("grouping and hierarchy have bounded dark visual baselines", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const grouped = page.getByRole("region", { name: "Grouped client example" });
  const hierarchy = page.getByRole("region", { name: "Hierarchical client example" });
  await expect(grouped.locator('[data-row-id="group-d"]')).toBeVisible();
  await expect(hierarchy.locator('[data-row-id="tree-default-child-1"]')).toBeVisible();
  const groupedBounds = await grouped.locator(".sheen-data-table-viewport").boundingBox();
  const lastGroupBounds = await grouped.locator("tbody tr[data-group-id]").last().boundingBox();
  expect(groupedBounds).not.toBeNull();
  expect(lastGroupBounds).not.toBeNull();
  expect((lastGroupBounds?.y ?? 0) + (lastGroupBounds?.height ?? 0)).toBeLessThanOrEqual((groupedBounds?.y ?? 0) + (groupedBounds?.height ?? 0));
  await expect(grouped).toHaveScreenshot("data-table-grouping-dark.png", { animations: "disabled" });
  await expect(hierarchy).toHaveScreenshot("data-table-hierarchy-dark.png", { animations: "disabled" });
});

test("row keyboard navigation realizes offscreen targets before focusing and activating", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Continuous client example" });
  const first = section.locator('[data-row-id="client-0"]');
  await first.focus();
  await expect(first).toBeFocused();
  await first.press("End");
  const last = section.locator('[data-row-id="client-299"]');
  await expect(last).toBeFocused();
  await expect(last).toBeVisible();
  await last.press("Enter");
  await expect(section.getByLabel("Activated client row")).toHaveText("client-299");
  await last.press("Home");
  await expect(section.locator('[data-row-id="client-0"]')).toBeFocused();
});

test("DataTable distinguishes page selection from immutable all-matching selection across pages", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Paginated client example" });
  const payload = section.getByLabel("DataTable selection payload");
  await section.getByRole("checkbox", { name: "Select this page" }).press("Space");
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["client-20", "client-21", "client-22", "client-23", "client-24"] }));
  await section.getByRole("button", { name: "Previous page" }).click();
  await expect(section.getByRole("checkbox", { name: "Select row client-10" })).not.toBeChecked();
  await expect(payload).toContainText("client-20");

  await section.getByRole("button", { name: "Select all matching" }).click();
  await expect(payload).toHaveText(JSON.stringify({ kind: "query", filter: { kind: "and", children: [] }, excluded: [] }));
  await expect(section.getByRole("checkbox", { name: "Select row client-10" })).toBeChecked();
  await section.getByRole("checkbox", { name: "Select row client-10" }).press("Space");
  await expect(payload).toHaveText(JSON.stringify({ kind: "query", filter: { kind: "and", children: [] }, excluded: ["client-10"] }));
  await section.getByRole("button", { name: "Previous page" }).click();
  await expect(section.locator('[data-row-id="client-0"]')).toHaveAttribute("data-selected", "");
  await expect(section.getByRole("checkbox", { name: "Select row client-0" })).toBeChecked();
  await section.getByRole("button", { name: "Clear selection" }).click();
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: [] }));
  await expect(section.getByRole("checkbox", { name: "Select row client-0" })).not.toBeChecked();

  await section.getByRole("checkbox", { name: "Select this page" }).press("Space");
  await section.getByRole("button", { name: "Switch selection authority" }).click();
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: [] }));
  await expect(section.getByRole("checkbox", { name: "Select row client-0" })).not.toBeChecked();
});

test("DataTable row keyboard and pointer gestures select ranges without losing unloaded IDs", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Paginated client example" });
  const table = section.getByRole("table", { name: "Paginated client rows" });
  const payload = section.getByLabel("DataTable selection payload");
  const row20 = table.locator('[data-row-id="client-20"]');
  await row20.focus();
  await row20.press("Space");
  await row20.press("ArrowDown");
  const row21 = table.locator('[data-row-id="client-21"]');
  await expect(row21).toBeFocused();
  await row21.press("Shift+ArrowDown");
  await expect(table.locator('[data-row-id="client-22"]')).toBeFocused();
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["client-20", "client-21", "client-22"] }));

  await table.getByRole("button", { name: "Amount", exact: true }).click();
  await expect(table.locator('[data-row-id="client-0"]')).toBeVisible();
  await expect(payload).toContainText("client-20");
  await table.locator('[data-row-id="client-0"] td[data-column="name"]').click();
  await table.locator('[data-row-id="client-2"] td[data-column="name"]').click({ modifiers: ["Control"] });
  await table.locator('[data-row-id="client-4"] td[data-column="name"]').click({ modifiers: ["Shift"] });
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["client-0", "client-2", "client-3", "client-4"] }));
  await expect(table.locator('[data-row-id="client-1"]')).not.toHaveAttribute("data-selected", "");
  await expect(table.locator('[data-row-id="client-3"]')).toHaveAttribute("data-selected", "");

  await table.locator('[data-row-id="client-4"]').press("Control+a");
  await expect(section.getByRole("checkbox", { name: "Select this page" })).toBeChecked();
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["client-0", "client-2", "client-3", "client-4", "client-1", "client-5", "client-6", "client-7", "client-8", "client-9"] }));

  await section.getByRole("button", { name: "Clear selection" }).click();
  await section.getByRole("checkbox", { name: "Select row client-2" }).press("Space");
  await section.getByRole("checkbox", { name: "Select row client-5" }).press("Shift+Space");
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["client-2", "client-3", "client-4", "client-5"] }));
});

test("pre-hydration native row selection is adopted without replacing the checkbox", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/data-table", { waitUntil: "commit" });
    const section = page.getByRole("region", { name: "Paginated client example" });
    const checkbox = section.getByRole("checkbox", { name: "Select row client-20" });
    await checkbox.evaluate(element => element.setAttribute("data-selection-hydration-identity", "retained"));
    await checkbox.focus();
    await checkbox.press("Space");
    await expect(checkbox).toBeChecked();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(checkbox).toHaveAttribute("data-selection-hydration-identity", "retained");
    await expect(checkbox).toBeFocused();
    await expect(checkbox).toBeChecked();
    await expect(section.getByLabel("DataTable selection payload")).toHaveText(JSON.stringify({ kind: "ids", ids: ["client-20"] }));
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("client pagination clamps atomically after the final page disappears", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Paginated client example" });
  const table = section.getByRole("table", { name: "Paginated client rows" });
  await expect(table.locator('[data-row-id="client-20"]')).toBeVisible();
  await section.getByRole("button", { name: "Shrink client data" }).click();
  await expect(table.locator('[data-row-id="client-0"]')).toBeVisible();
  await expect(section.getByText("Page 1 of 1", { exact: true })).toBeVisible();
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(5);
});

test("server pagination retains accepted rows during a real request and accepts atomically", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/data-table") requests++; });
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Paginated server example" });
  const root = section.locator(".sheen-data-table");
  const table = section.getByRole("table", { name: "Paginated server rows" });
  const firstRow = table.locator('[data-row-id="server-0"]');
  await expect(firstRow).toBeVisible();
  expect(requests).toBe(0);
  await section.getByRole("checkbox", { name: "Select row server-0" }).press("Space");
  await expect(section.getByLabel("Server DataTable selection payload")).toHaveText(JSON.stringify({ kind: "ids", ids: ["server-0"] }));
  await firstRow.evaluate(element => element.setAttribute("data-accepted-identity", "retained"));
  await section.getByRole("button", { name: "Page 2", exact: true }).click();
  await expect(root).toHaveAttribute("data-pending", "");
  await expect(root).toHaveAttribute("data-previous-results", "");
  await table.getByRole("separator", { name: "Resize Amount" }).press("ArrowRight");
  await expect(table.locator('th[data-column="amount"]')).toHaveCSS("width", "130px");
  await expect(firstRow).toHaveAttribute("data-accepted-identity", "retained");
  const frames = await table.evaluate(async element => {
    const counts: number[] = [];
    for (let frame = 0; frame < 12; frame++) {
      counts.push(element.querySelectorAll("tbody tr[data-row-id]").length);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return counts;
  });
  expect(frames.every(count => count > 0)).toBe(true);
  await expect(table.locator('[data-row-id="server-10"]')).toBeVisible();
  await section.getByRole("checkbox", { name: "Select row server-10" }).press("Space");
  await expect(section.getByLabel("Server DataTable selection payload")).toHaveText(JSON.stringify({ kind: "ids", ids: ["server-0", "server-10"] }));
  await expect(table.locator('th[data-column="amount"]')).toHaveCSS("width", "130px");
  await expect(root).not.toHaveAttribute("data-pending", "");
  await expect(root).not.toHaveAttribute("data-previous-results", "");
  await expect(section.getByText("Page 2 of 6", { exact: true })).toBeVisible();
  expect(requests).toBe(1);
});

test("server pagination retains accepted rows through failure and retries the captured request", async ({ page }) => {
  await page.goto("/data-table");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Paginated server example" });
  const root = section.locator(".sheen-data-table");
  const table = section.getByRole("table", { name: "Paginated server rows" });
  const firstRow = table.locator('[data-row-id="server-0"]');
  const acceptedBackground = await firstRow.evaluate(element => getComputedStyle(element).backgroundColor);
  await section.getByRole("button", { name: "Fail next server request" }).click();
  await section.getByRole("button", { name: "Page 2", exact: true }).click();
  await expect(root).toHaveAttribute("data-previous-results", "");
  await expect(section.getByRole("alert")).toContainText("DataTable request failed (503)");
  await expect(root).toHaveAttribute("data-previous-results", "");
  await expect(section.getByText("Previous results", { exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();
  await expect(firstRow).toBeVisible();
  expect(await firstRow.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(acceptedBackground);
  await expect(firstRow).toHaveCSS("opacity", "1");
  await expect(root).not.toHaveAttribute("data-pending", "");
  await section.getByRole("button", { name: "Retry" }).click();
  await expect(root).toHaveAttribute("data-previous-results", "");
  await expect(table.locator('[data-row-id="server-10"]')).toBeVisible();
  await expect(section.getByText("Page 2 of 6", { exact: true })).toBeVisible();
  await expect(section.getByRole("alert")).toHaveCount(0);
  await expect(root).not.toHaveAttribute("data-previous-results");
});

test("server initial results hydrate without duplicate fetch or replacing row DOM", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/data-table") requests++; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/data-table", { waitUntil: "commit" });
    const row = page.getByRole("table", { name: "Paginated server rows" }).locator('[data-row-id="server-0"]');
    const resize = page.getByRole("table", { name: "Paginated server rows" }).getByRole("separator", { name: "Resize Name" });
    await expect(row).toBeVisible();
    await row.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await resize.evaluate(element => element.setAttribute("data-resize-hydration-identity", "retained"));
    await resize.focus();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(row).toHaveAttribute("data-server-identity", "retained");
    await expect(resize).toHaveAttribute("data-resize-hydration-identity", "retained");
    await expect(resize).toBeFocused();
    expect(requests).toBe(0);
  } finally {
    release();
  }
});
