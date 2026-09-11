import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("nested query editing filters retained table rows and round-trips through the URL", async ({ page }) => {
  await page.goto("/query-builder");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const builder = page.getByRole("region", { name: "Account query" });
  const table = page.getByRole("table", { name: "Query builder accounts" });
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(3);
  const retained = table.locator('[data-row-id="aperture"]');
  await retained.evaluate(element => element.setAttribute("data-query-row-identity", "retained"));

  const addRule = builder.getByRole("button", { name: "Add rule", exact: true }).first();
  await addRule.focus();
  await addRule.press("Enter");
  const rules = builder.getByRole("group", { name: /Query rule:/ });
  await expect(rules).toHaveCount(2);
  const accountRule = rules.nth(1);
  const value = accountRule.getByRole("textbox", { name: "Value", exact: true });
  await value.fill("Aperture");
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(1);
  await expect(retained).toHaveAttribute("data-query-row-identity", "retained");

  const beforeMove = await page.getByLabel("Serialized query").textContent();
  await accountRule.getByRole("button", { name: "Move before", exact: true }).press("Enter");
  await expect.poll(() => page.getByLabel("Serialized query").textContent()).not.toBe(beforeMove);
  await expect(retained).toHaveAttribute("data-query-row-identity", "retained");

  const movedAccountRule = builder.getByRole("group", { name: "Query rule: Account", exact: true });
  await movedAccountRule.getByRole("button", { name: "Exclude", exact: true }).press("Enter");
  await expect(builder.getByRole("region", { name: "Exclude" })).toBeVisible();
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(2);

  await builder.getByRole("button", { name: "Add group", exact: true }).first().press("Enter");
  const nested = builder.locator('fieldset[data-query-path="2"]');
  await expect(nested).toBeVisible();
  await nested.getByRole("button", { name: "Add rule", exact: true }).press("Enter");
  await expect(nested.getByRole("group", { name: "Query rule: Account", exact: true })).toBeVisible();
  await nested.getByRole("button", { name: "Remove", exact: true }).last().press("Enter");
  await expect(nested.getByRole("group", { name: /Query rule:/ })).toHaveCount(0);

  const serialized = await page.getByLabel("Serialized query").textContent();
  expect(serialized).toContain('"version":1');
  expect(decodeURIComponent(page.url())).toContain('"version":1');
  await page.reload();
  await expect(page.getByLabel("Serialized query")).toHaveText(serialized ?? "");
  await expect(page.getByRole("region", { name: "Account query" }).getByRole("region", { name: "Exclude" })).toBeVisible();
});

test("query builder preserves a pre-hydration draft and hydrates retained editor and table owners", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    const serialized = JSON.stringify({ version: 1, filter: { kind: "and", children: [{ kind: "text", column: "account", operator: "contains", value: "Aperture", caseSensitive: false }] } });
    await page.goto(`/query-builder?query=${encodeURIComponent(serialized)}`, { waitUntil: "commit" });
    const builder = page.getByRole("region", { name: "Account query" });
    const table = page.getByRole("table", { name: "Query builder accounts" });
    await builder.evaluate(element => element.setAttribute("data-query-hydration", "builder"));
    await table.evaluate(element => element.setAttribute("data-query-hydration", "table"));
    const rule = builder.getByRole("group", { name: "Query rule: Account", exact: true });
    const draft = rule.getByRole("textbox", { name: "Value", exact: true });
    await rule.evaluate(element => element.setAttribute("data-query-hydration", "rule"));
    await draft.fill("typed before hydration");
    await draft.evaluate(element => element.setAttribute("data-query-hydration", "draft"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(builder).toHaveAttribute("data-query-hydration", "builder");
    await expect(table).toHaveAttribute("data-query-hydration", "table");
    await expect(rule).toHaveAttribute("data-query-hydration", "rule");
    await expect(draft).toHaveAttribute("data-query-hydration", "draft");
    await expect(draft).toHaveValue("typed before hydration");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("query builder and its filtered table have no automated WCAG A or AA violations", async ({ page }) => {
  await page.goto("/query-builder");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
});
