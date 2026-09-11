import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

async function chooseColumn(page: Page, section: Locator, name: string): Promise<Locator> {
  await section.getByRole("button", { name: "+ Filter", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Filter columns" });
  await picker.getByRole("searchbox", { name: "Search filter columns" }).fill(name.slice(0, 4));
  await picker.getByRole("button", { name, exact: true }).click();
  return page.getByRole("dialog", { name: `+ Filter: ${name}` });
}

async function chooseOperator(page: Page, editor: Locator, name: string): Promise<void> {
  await editor.getByRole("button", { name: /Operator/ }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

test("typed filters apply atomically with facets, ranges, stable chips, and focus recovery", async ({ page }) => {
  await page.goto("/filter-bar");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const section = page.getByRole("region", { name: "Typed client filters" });
  const table = section.getByRole("table", { name: "Client filter rows" });
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(4);

  let editor = await chooseColumn(page, section, "Status");
  await chooseOperator(page, editor, "is any of");
  await expect(editor.getByRole("checkbox", { name: "open (2)" })).toBeVisible();
  await editor.getByRole("checkbox", { name: "open (2)" }).focus();
  await editor.getByRole("checkbox", { name: "open (2)" }).press("Space");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  await expect(section.getByRole("button", { name: "Status is any of open", exact: true })).toBeVisible();
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(2);

  const statusChip = section.locator(".sheen-filter-chip > .sheen-button").first();
  await statusChip.evaluate(element => element.setAttribute("data-filter-chip-identity", "retained"));
  await statusChip.click();
  editor = page.getByRole("dialog", { name: "Edit filter: Status" });
  await expect(editor.getByRole("checkbox", { name: "closed (1)" })).toBeVisible();
  await expect(editor.getByRole("checkbox", { name: "pending (1)" })).toBeVisible();
  await editor.getByRole("checkbox", { name: "Exclude matches" }).focus();
  await editor.getByRole("checkbox", { name: "Exclude matches" }).press("Space");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  const negatedStatus = section.getByRole("button", { name: "Not: Status is any of open", exact: true });
  await expect(negatedStatus).toHaveAttribute("data-filter-chip-identity", "retained");
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(2);
  await negatedStatus.click();
  editor = page.getByRole("dialog", { name: "Edit filter: Status" });
  await editor.getByRole("checkbox", { name: "Exclude matches" }).focus();
  await editor.getByRole("checkbox", { name: "Exclude matches" }).press("Space");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  await expect(section.getByRole("button", { name: "Status is any of open", exact: true })).toHaveAttribute("data-filter-chip-identity", "retained");

  editor = await chooseColumn(page, section, "Amount");
  await chooseOperator(page, editor, "is between");
  await editor.getByRole("spinbutton", { name: "Minimum" }).fill("35");
  await editor.getByRole("spinbutton", { name: "Maximum" }).fill("45");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(1);
  await expect(table.locator('[data-row-id="filter-d"]')).toBeVisible();

  editor = await chooseColumn(page, section, "Created");
  await chooseOperator(page, editor, "is between");
  await editor.getByLabel("Start date").fill("09/04/2026");
  await editor.getByLabel("Start date").press("Enter");
  await editor.getByLabel("End date").fill("09/04/2026");
  await editor.getByLabel("End date").press("Enter");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  await expect(table.locator('[data-row-id="filter-d"]')).toBeVisible();
  await expect(section.getByLabel("Accepted client filter")).toContainText('"min":1788480000000,"max":1788566399999');

  editor = await chooseColumn(page, section, "Name");
  await chooseOperator(page, editor, "starts with");
  await editor.getByRole("textbox", { name: "Value" }).fill("Gam");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  await expect(table.locator('[data-row-id="filter-d"]')).toBeVisible();

  const amountRemove = section.getByRole("button", { name: /Remove filter: Amount is between/ });
  const createdRemove = section.getByRole("button", { name: /Remove filter: Created is between/ });
  await amountRemove.click();
  await expect(amountRemove).toHaveCount(0);
  await expect(createdRemove).toBeFocused();
});

test("delegated filtering retains accepted rows and DOM through a real refresh", async ({ page }) => {
  await page.goto("/filter-bar");
  const section = page.getByRole("region", { name: "Delegated filter refresh" });
  const table = section.getByRole("table", { name: "Server filter rows" });
  const retained = table.locator('[data-row-id="filter-a"]');
  await retained.evaluate(element => element.setAttribute("data-filter-refresh-identity", "retained"));

  const editor = await chooseColumn(page, section, "Name");
  await chooseOperator(page, editor, "contains");
  await editor.getByRole("textbox", { name: "Value" }).fill("Alpha");
  await editor.getByRole("button", { name: "Apply filter" }).click();

  const root = section.locator(".sheen-data-table");
  await expect(root).toHaveAttribute("data-previous-results", "");
  await expect(root).toHaveAttribute("aria-busy", "true");
  await expect(retained).toBeVisible();
  const blankFrames = await table.evaluate(async element => {
    let blanks = 0;
    for (let frame = 0; frame < 12; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (element.querySelectorAll("tbody tr[data-row-id]").length === 0) blanks++;
    }
    return blanks;
  });
  expect(blankFrames).toBe(0);

  await expect(root).not.toHaveAttribute("data-previous-results", "", { timeout: 5_000 });
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(1);
  await expect(retained).toHaveAttribute("data-filter-refresh-identity", "retained");
  await expect(section.getByLabel("Accepted server filter")).toContainText('"column":"name","operator":"contains","value":"Alpha"');
});

test("a queued pre-hydration filter trigger opens once on the retained server button", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/filter-bar", { waitUntil: "commit" });
    const section = page.getByRole("region", { name: "Typed client filters" });
    const trigger = section.getByRole("button", { name: "+ Filter", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-filter-hydration-identity", "retained"));
    await trigger.click();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(trigger).toHaveAttribute("data-filter-hydration-identity", "retained");
    await expect(page.getByRole("dialog", { name: "Filter columns" })).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("filter chips have a bounded dark visual baseline", async ({ page }) => {
  await page.goto("/filter-bar");
  const section = page.getByRole("region", { name: "Typed client filters" });
  let editor = await chooseColumn(page, section, "Status");
  await chooseOperator(page, editor, "is any of");
  await editor.getByRole("checkbox", { name: "open (2)" }).focus();
  await editor.getByRole("checkbox", { name: "open (2)" }).press("Space");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  editor = await chooseColumn(page, section, "Amount");
  await editor.getByRole("spinbutton", { name: "Value" }).fill("10");
  await editor.getByRole("button", { name: "Apply filter" }).click();
  await expect(section.locator(".sheen-data-table")).toHaveScreenshot("filter-bar-dark.png", { animations: "disabled" });
});
