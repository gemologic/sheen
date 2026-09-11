import { expect, test } from "@playwright/test";
import { contrastRatio } from "../../packages/tokens/src/color";

test("footers cover the complete client view and empty queries remain distinct", async ({ page }) => {
  await page.goto("/table-chrome");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const actionTable = page.getByRole("table", { name: "Action accounts" });
  await expect(actionTable.locator("tbody tr[data-row-id]")).toHaveCount(2);
  await expect(actionTable.locator("tfoot td[data-column=name]")).toHaveText("Total");
  await expect(actionTable.locator("tfoot td[data-column=amount]")).toHaveText("60");
  await expect(actionTable).toHaveAttribute("aria-rowcount", "5");

  const empty = page.getByRole("region", { name: "Empty table" });
  await expect(empty.getByRole("region", { name: "Nothing here yet" })).toBeVisible();
  await expect(empty.getByRole("button", { name: "Clear filters" })).toHaveCount(0);

  const filtered = page.getByRole("region", { name: "No results table" });
  await expect(filtered.getByRole("region", { name: "No results" })).toBeVisible();
  await filtered.getByRole("button", { name: "Clear filters" }).click();
  await expect(filtered.getByRole("table", { name: "No matching accounts" }).locator('tr[data-row-id="alpha"]')).toBeVisible();
  await expect(filtered.locator(".sheen-data-table-viewport")).toBeFocused();
});

test("one action model drives the selection bar and row context menu", async ({ page }) => {
  await page.goto("/table-chrome");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const section = page.getByRole("region", { name: "Action and footer table" });
  const table = section.getByRole("table", { name: "Action accounts" });
  const alpha = table.locator('tr[data-row-id="alpha"]');
  const beta = table.locator('tr[data-row-id="beta"]');
  await expect.poll(() => alpha.evaluate(element => getComputedStyle(element).getPropertyValue("-webkit-touch-callout"))).not.toBe("none");
  const restingFill = await alpha.evaluate(element => getComputedStyle(element).backgroundColor);
  await beta.hover();
  const hoverFill = await beta.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(hoverFill).not.toBe(restingFill);

  await section.getByRole("checkbox", { name: "Select row alpha" }).press("Space");
  await expect(alpha).toHaveAttribute("data-selected", "");
  const selectedFill = await alpha.evaluate(element => {
    const selectionCell = element.querySelector(".sheen-data-table-selection-cell");
    if (!selectionCell) throw new Error("Expected a selection cell");
    return { row: getComputedStyle(element).backgroundColor, cell: getComputedStyle(selectionCell).backgroundColor };
  });
  expect(selectedFill.row).not.toBe(restingFill);
  expect(selectedFill.cell).toBe(selectedFill.row);
  const bar = section.getByRole("toolbar", { name: "Selection actions" });
  await expect(bar).toContainText("1 selected");
  await bar.getByRole("button", { name: "Review" }).click();
  await expect(section.getByRole("status", { name: "Action result" })).toHaveText("review|anchor:none|selection:alpha|loaded:alpha");

  await beta.click({ button: "right" });
  await expect(section.getByRole("status", { name: "Action selection" })).toHaveText(JSON.stringify({ kind: "ids", ids: ["beta"] }));
  await expect(page.getByRole("menuitem", { name: "Archive" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(section.getByRole("status", { name: "Action result" })).toHaveText("archive|anchor:beta|selection:beta|loaded:beta");

  await alpha.focus();
  await alpha.press("ArrowDown");
  await beta.press("ArrowUp");
  await expect(alpha).toBeFocused();
  expect(await alpha.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(restingFill);
  await alpha.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: "Review" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(alpha).toBeFocused();
  const closingBar = section.locator(".sheen-data-table-selection-actions");
  await closingBar.getByRole("button", { name: "Clear selection" }).click();
  await expect(closingBar).toHaveAttribute("data-open", "false");
  await expect(closingBar).toHaveCount(0);
});

test("a table without replacement actions preserves the native contextmenu event", async ({ page }) => {
  await page.goto("/table-chrome");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const row = page.getByRole("table", { name: "Native context accounts" }).locator('tr[data-row-id="alpha"]');
  const result = await row.evaluate(element => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 });
    return { dispatched: element.dispatchEvent(event), prevented: event.defaultPrevented, touchCallout: getComputedStyle(element).getPropertyValue("-webkit-touch-callout") };
  });
  expect(result.dispatched).toBe(true);
  expect(result.prevented).toBe(false);
  expect(result.touchCallout).not.toBe("none");
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("cold load is delayed, then accepts rows without replacing the table", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/table-chrome?*", async route => {
    if (new URL(route.request().url()).searchParams.get("delay") === "450") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table-chrome");
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    const section = page.getByRole("region", { name: "Cold table" });
    const table = section.getByRole("table", { name: "Cold accounts" });
    await table.evaluate(element => element.setAttribute("data-cold-identity", "retained"));
    await expect(section.locator('tbody[data-state="cold"]')).toBeVisible();
    await expect(section.locator(".sheen-data-table-cold")).toHaveAttribute("data-visible", "", { timeout: 1_000 });
    await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(0);
    release();
    await expect(table.locator('tr[data-row-id="alpha"]')).toBeVisible();
    await expect(table).toHaveAttribute("data-cold-identity", "retained");
    await expect(section.locator(".sheen-data-table-cold")).toHaveCount(0);
  } finally { release(); }
});

test("refresh retains opaque rows, delays its progress bar, and keeps failures actionable", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/table-chrome?*", async route => {
    if (new URL(route.request().url()).searchParams.get("delay") === "650") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table-chrome");
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    const section = page.getByRole("region", { name: "Refresh table" });
    const root = section.locator(".sheen-data-table");
    const table = section.getByRole("table", { name: "Refresh accounts" });
    const alpha = table.locator('tr[data-row-id="alpha"]');
    const acceptedBackground = await alpha.evaluate(element => getComputedStyle(element).backgroundColor);
    await alpha.evaluate(element => element.setAttribute("data-refresh-identity", "retained"));
    await table.getByRole("button", { name: "Name", exact: true }).click();
    await expect(root).toHaveAttribute("data-previous-results", "");
    const early = await table.evaluate(async element => {
      const counts: number[] = [];
      for (let frame = 0; frame < 20; frame++) {
        counts.push(element.querySelectorAll("tbody tr[data-row-id]").length);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      return counts;
    });
    expect(early.every(count => count === 3)).toBe(true);
    const refresh = section.locator(".sheen-data-table-refresh");
    await expect(refresh).toBeVisible({ timeout: 1_000 });
    await expect(refresh).toContainText("Refreshing, showing existing results");
    await expect(alpha).toHaveCSS("opacity", "1");
    expect(await alpha.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(acceptedBackground);
    await expect(alpha).toHaveAttribute("data-refresh-identity", "retained");
    const pendingContext = await alpha.evaluate(element => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(pendingContext).toBe(false);
    await expect(page.getByRole("menu")).toHaveCount(0);
    release();
    await expect(root).not.toHaveAttribute("data-pending", "");
    await expect(section.locator(".sheen-data-table-refresh")).toHaveCount(0);

    await section.getByRole("button", { name: "Fail next refresh" }).click();
    await table.getByRole("button", { name: "Name", exact: true }).click();
    await expect(section.getByRole("alert")).toContainText("Chrome request failed (503)");
    await expect(root).toHaveAttribute("data-previous-results", "");
    await expect(section.getByText("Previous results", { exact: true })).toBeVisible();
    await expect(alpha).toHaveAttribute("data-refresh-identity", "retained");
    await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(3);
    expect(await alpha.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(acceptedBackground);
    const failedContext = await alpha.evaluate(element => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(failedContext).toBe(false);
    await section.getByRole("button", { name: "Retry" }).click();
    await expect(section.getByRole("alert")).toHaveCount(0);
    await expect(root).not.toHaveAttribute("data-previous-results");
  } finally { release(); }
});

test("delayed hydration retains a row and leaves pre-hydration context handling native", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table-chrome", { waitUntil: "commit" });
    const row = page.getByRole("table", { name: "Action accounts" }).locator('tr[data-row-id="alpha"]');
    await row.evaluate(element => element.setAttribute("data-context-hydration-identity", "retained"));
    const preHydration = await row.evaluate(element => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(preHydration).toBe(false);
    await expect(page.getByRole("menu")).toHaveCount(0);
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(row).toHaveAttribute("data-context-hydration-identity", "retained");
    await row.focus();
    await row.press("Shift+F10");
    await expect(page.getByRole("menuitem", { name: "Archive" })).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(row).toBeFocused();
  } finally { release(); }
});

test("table actions, footers, and zero-result states have bounded dark and light compact baselines", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/table-chrome");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const action = page.getByRole("region", { name: "Action and footer table" });
  await action.getByRole("checkbox", { name: "Select row alpha" }).press("Space");
  await expect(action.locator(".sheen-data-table")).toHaveScreenshot("data-table-actions-footer-dark.png");
  await action.getByRole("table", { name: "Action accounts" }).locator('tr[data-row-id="beta"]').click({ button: "right" });
  await expect(page.getByRole("menu")).toHaveScreenshot("context-menu-dark.png");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Empty table" })).toHaveScreenshot("data-table-empty-dark.png");
  await expect(page.getByRole("region", { name: "No results table" })).toHaveScreenshot("data-table-no-results-dark.png");
  await page.locator("html").evaluate(element => {
    element.setAttribute("data-sheen-theme", "paper");
    element.setAttribute("data-sheen-mode", "light");
    element.setAttribute("data-sheen-density", "compact");
  });
  await expect(action.getByRole("table", { name: "Action accounts" }).locator('tr[data-row-id="alpha"]')).toHaveCSS("height", "28px");
  const selectionColors = await action.locator(".sheen-data-table-selection-actions").evaluate(element => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas unavailable");
    function color(value: string): string {
      if (!context) throw new Error("Canvas unavailable");
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return "#" + [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => channel.toString(16).padStart(2, "0")).join("");
    }
    const fill = color(getComputedStyle(element).backgroundColor);
    return [...element.querySelectorAll("strong, button")].map(item => ({ label: item.textContent?.trim() ?? "selection action", text: color(getComputedStyle(item).color), fill }));
  });
  for (const color of selectionColors) expect(contrastRatio(color.text, color.fill), `${color.label}: ${color.text} on ${color.fill}`).toBeGreaterThanOrEqual(4.5);
  await expect(action.locator(".sheen-data-table")).toHaveScreenshot("data-table-actions-footer-paper-light-compact.png");
});
