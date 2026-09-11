import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("large log, diff, and JSON snapshots stay virtualized, searchable, and copyable", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/advanced-viewers");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  for (const label of ["Worker logs", "Configuration diff", "API response"]) {
    const viewer = page.getByRole("region", { name: label, exact: true });
    await expect(viewer.getByRole("list", { name: `${label} lines`, exact: true }).getByRole("listitem")).toHaveCount(21);
  }

  const logs = page.getByRole("region", { name: "Worker logs", exact: true });
  const viewport = logs.getByRole("list", { name: "Worker logs lines", exact: true });
  await viewport.evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event("scroll")); });
  await expect(logs.locator('[data-row-id="log-4999"]')).toBeVisible();
  await logs.getByRole("textbox", { name: "Search Worker logs", exact: true }).fill("fatal marker");
  await expect(logs.getByRole("status")).toHaveText("1 of 5000 lines");
  const fatal = logs.locator('[data-row-id="log-4321"]');
  await expect(fatal).toContainText("Fatal marker");
  await fatal.evaluate(element => element.setAttribute("data-viewer-row-identity", "retained"));
  await viewport.evaluate(element => element.setAttribute("data-viewer-scroll-identity", "retained"));
  await page.getByRole("button", { name: "Append accepted log", exact: true }).click();
  await expect(fatal).toHaveAttribute("data-viewer-row-identity", "retained");
  await expect(viewport).toHaveAttribute("data-viewer-scroll-identity", "retained");
  await expect(logs.getByRole("status")).toHaveText("1 of 5001 lines");
  await logs.getByRole("button", { name: "Copy Worker logs", exact: true }).click();
  await expect(logs.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Refresh accepted");

  const diff = page.getByRole("region", { name: "Configuration diff", exact: true });
  await diff.getByRole("textbox", { name: "Search Configuration diff", exact: true }).fill("changed");
  await expect(diff.getByRole("status")).toHaveText("1 of 2001 lines");
  await expect(diff.getByRole("listitem")).toHaveAttribute("data-kind", "added");
  await expect(diff.getByRole("listitem")).toContainText("+");

  const json = page.getByRole("region", { name: "API response", exact: true });
  await json.getByRole("textbox", { name: "Search API response", exact: true }).fill("record-1199");
  await expect(json.getByRole("status")).toHaveText(/1 of \d+ lines/u);
  await expect(json.getByRole("listitem")).toContainText("record-1199");
});

test("advanced viewer roots, scroll owner, and visible row hydrate in place", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/advanced-viewers", { waitUntil: "commit" });
    const viewer = page.getByRole("region", { name: "Worker logs", exact: true });
    const list = viewer.getByRole("list", { name: "Worker logs lines", exact: true });
    const row = viewer.locator('[data-row-id="log-0"]');
    await viewer.evaluate(element => element.setAttribute("data-viewer-hydration", "root"));
    await list.evaluate(element => element.setAttribute("data-viewer-hydration", "list"));
    await row.evaluate(element => element.setAttribute("data-viewer-hydration", "row"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(viewer).toHaveAttribute("data-viewer-hydration", "root");
    await expect(list).toHaveAttribute("data-viewer-hydration", "list");
    await expect(row).toHaveAttribute("data-viewer-hydration", "row");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("advanced viewers have no automated WCAG A or AA violations", async ({ page }) => {
  await page.goto("/advanced-viewers");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
});
