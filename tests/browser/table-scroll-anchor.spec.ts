import { expect, test } from "@playwright/test";

test("fixed table scrolling retains the visible anchor on refresh without measuring overscan rows", async ({ page }) => {
  await page.goto("/table-benchmark");
  await page.locator('[data-benchmark-ready="true"]').waitFor();
  await page.locator("[data-benchmark-mount]").evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing mount action");
    element.click();
  });
  await expect(page.locator("tbody tr[data-row-id]").first()).toBeVisible();
  const sample = await page.locator(".sheen-data-table-viewport").evaluate(async viewport => {
    const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await settle();
    const original = Element.prototype.getBoundingClientRect;
    let rowMeasurements = 0;
    Element.prototype.getBoundingClientRect = function () {
      if (this.matches("tbody tr[data-row-key]")) rowMeasurements++;
      return original.call(this);
    };
    try {
      // Include both exact row boundaries and partially visible rows.
      for (const top of [2800, 2813, 5000, 5034]) {
        viewport.scrollTop = top;
        await settle();
      }
    } finally { Element.prototype.getBoundingClientRect = original; }
    const header = viewport.querySelector("thead");
    if (!header) throw new Error("Missing header");
    const boundary = header.getBoundingClientRect().bottom;
    const row = [...viewport.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-id]")]
      .find(element => element.getBoundingClientRect().bottom > boundary);
    if (!row) throw new Error("Missing visible row");
    row.setAttribute("data-anchor-test", "retained");
    return { rowMeasurements, top: viewport.scrollTop, offset: row.getBoundingClientRect().top - boundary,
      time: row.querySelector("time")?.getAttribute("datetime") };
  });
  expect(sample.rowMeasurements).toBe(0);
  const row = page.locator('tr[data-anchor-test="retained"]');
  const originalRow = await row.elementHandle();
  if (!originalRow) throw new Error("Missing anchor owner");
  await page.locator("[data-benchmark-refresh]").evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Missing refresh action");
    element.click();
  });
  await expect(row.locator("time")).not.toHaveAttribute("datetime", sample.time ?? "");
  expect(await row.evaluate((element, original) => element === original, originalRow)).toBe(true);
  await expect(page.locator(".sheen-data-table-viewport")).toHaveJSProperty("scrollTop", sample.top);
  const offset = await row.evaluate(element => {
    const header = element.closest("table")?.querySelector("thead");
    if (!header) throw new Error("Missing retained header");
    return element.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
  });
  expect(offset).toBeCloseTo(sample.offset, 5);
});
