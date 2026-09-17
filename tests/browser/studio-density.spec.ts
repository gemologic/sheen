import { expect, test } from "@playwright/test";

for (const density of ["compact", "spacious"]) {
  test(`comfortable Studio table restores its spacing inside ${density}`, async ({ page }) => {
    await page.addInitScript(density => localStorage.setItem("sheen", JSON.stringify({ theme: "studio", density })), density);
    await page.goto("/data-table");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const table = page.getByRole("region", { name: "Continuous client example", exact: true }).locator(".sheen-data-table");
    await expect(table).toHaveAttribute("data-sheen-density", "comfortable");
    const spacing = await table.evaluate(element => {
      const style = getComputedStyle(element);
      return ["--sheen-space-inline-sm", "--sheen-space-block-sm", "--sheen-control-px-md", "--sheen-space-section"].map(name => style.getPropertyValue(name).trim());
    });
    expect(spacing).toEqual(["8px", "8px", "10px", "24px"]);
  });
}

for (const theme of ["studio", "obsidian"]) {
  test(`${theme} table density preserves theme geometry and readable text`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem("sheen", JSON.stringify({ theme, density: "comfortable", mode: "dark" })), theme);
    await page.goto("/data-table");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    const region = page.getByRole("region", { name: "Continuous client example", exact: true });
    const row = region.locator("tbody tr[data-row-id]").first();
    const font = await row.locator("td").first().evaluate(element => getComputedStyle(element).fontSize);
    expect(Number.parseFloat(font)).toBeGreaterThanOrEqual(12);
    for (const density of ["comfortable", "compact", "spacious"]) {
      if (density !== "comfortable") await region.getByRole("button", { name: density === "compact" ? "Compact table" : "Spacious table", exact: true }).click();
      const expected = theme === "studio" ? density === "compact" ? 36 : density === "comfortable" ? 40 : 48 : density === "compact" ? 28 : density === "comfortable" ? 34 : 42;
      await expect(row).toHaveCSS("height", `${expected}px`);
      await expect(row.locator("td").first()).toHaveCSS("height", `${expected}px`);
      await expect(row.locator("td").first()).toHaveCSS("font-size", font);
      if (density === "compact") {
        const spacing = await row.evaluate(element => {
          const style = getComputedStyle(element);
          return ["--sheen-space-inline-xs", "--sheen-space-inline-md", "--sheen-space-block-xs"].map(token => style.getPropertyValue(token).trim());
        });
        expect(spacing).toEqual(theme === "studio" ? ["4px", "8px", "4px"] : ["2px", "6px", "2px"]);
      }
      const positions = await region.locator("tbody tr[data-row-id]").evaluateAll(elements => elements.slice(0, 3).map(element => element.getBoundingClientRect().top));
      expect(positions).toHaveLength(3);
      expect((positions[1] ?? 0) - (positions[0] ?? 0)).toBe(expected);
      expect((positions[2] ?? 0) - (positions[1] ?? 0)).toBe(expected);
    }
  });
}

test("two-line account rows share their 48px geometry with cells and virtualization", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/accounts?table=continuous");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const rows = page.locator('.loupe-admin-accounts tbody tr[data-row-id]');
  const geometry = await rows.evaluateAll(elements => elements.slice(0, 5).map(element => {
    const cell = element.querySelector("td");
    const content = element.querySelector(".loupe-admin-account-cell");
    if (!cell || !content) throw new Error("Missing account cell");
    return { row: element.getBoundingClientRect().height, cell: cell.getBoundingClientRect().height, top: element.getBoundingClientRect().top, content: content.getBoundingClientRect().height, token: getComputedStyle(cell).getPropertyValue("--sheen-table-row-h").trim() };
  }));
  expect(geometry).toHaveLength(5);
  for (const [index, item] of geometry.entries()) {
    expect(item.row).toBe(48);
    expect(item.cell).toBe(48);
    expect(item.content).toBeLessThanOrEqual(item.cell);
    if (index > 0) expect(item.top - (geometry[index - 1]?.top ?? 0)).toBe(48);
  }
});
