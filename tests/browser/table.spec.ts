import { expect, test } from "@playwright/test";

test("native table semantics and controls survive hydration, density, and RTL changes", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table", { waitUntil: "commit" });
    const table = page.getByRole("table", { name: "Orders" });
    await expect(table).toBeVisible();
    await table.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    const input = page.getByLabel("ETH notes");
    await input.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(table).toHaveAttribute("data-server-identity", "retained");
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    await expect(table.getByRole("columnheader", { name: "Quantity" })).toHaveAttribute("scope", "col");
    await expect(table.getByRole("rowheader", { name: "BTC" })).toHaveAttribute("scope", "row");
    await expect(table.getByText("Hidden order")).toBeHidden();
    await expect(table.getByRole("cell", { name: "1.25" })).toHaveCSS("text-align", "end");
    await expect(table.getByRole("cell", { name: "1.25" })).toHaveCSS("font-variant-numeric", "tabular-nums");
    await input.fill("Keep this draft");
    await page.getByLabel("BTC notes").focus();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
    const surface = await input.evaluate(element => {
      const row = element.closest("tr");
      if (!row) throw new Error("No native row");
      return { offset: getComputedStyle(element).getPropertyValue("--sheen-color-focus-ring-offset").trim(), fill: getComputedStyle(row).getPropertyValue("--sheen-color-bg-subtle").trim() };
    });
    expect(surface.offset).toEqual(surface.fill);
    await page.getByRole("button", { name: "Toggle direction" }).click();
    await page.getByRole("button", { name: "Toggle density" }).click();
    await expect(table).toHaveCSS("direction", "rtl");
    await expect(table.getByRole("columnheader", { name: "Quantity" })).toHaveCSS("height", "28px");
    await expect(input).toHaveValue("Keep this draft");
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
