import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("CSV and JSON downloads contain immutable cross-page selection snapshots", async ({ page }) => {
  await page.goto("/table-selection");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  await page.getByRole("checkbox", { name: "Select page", exact: true }).press("Space");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByRole("button", { name: "Prepare selected CSV", exact: true }).click();
  const link = page.getByRole("link", { name: "Download prepared selection", exact: true });
  const oldURL = await link.getAttribute("href");
  if (!oldURL) throw new Error("Expected prepared URL");
  await page.getByRole("checkbox", { name: "Select c", exact: true }).press("Space");
  const csvPromise = page.waitForEvent("download");
  await link.press("Enter");
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("selection.csv");
  const csvPath = await csv.path();
  if (!csvPath) throw new Error("Expected downloaded CSV");
  expect(await readFile(csvPath, "utf8")).toBe('"ID"\r\n"a"\r\n"b"\r\n');
  await page.getByRole("button", { name: "Prepare selected JSON", exact: true }).click();
  const jsonPromise = page.waitForEvent("download");
  await link.press("Enter");
  const json = await jsonPromise;
  expect(json.suggestedFilename()).toBe("selection.json");
  const jsonPath = await json.path();
  if (!jsonPath) throw new Error("Expected downloaded JSON");
  expect(JSON.parse(await readFile(jsonPath, "utf8"))).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  expect(await page.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, oldURL)).toBe(true);
});

test("page selection retains IDs and query selection excludes rows without mutating captured actions", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", message => { if (message.type() === "warning" && message.text().includes("will never be disposed")) warnings.push(message.text()); });
  await page.goto("/table-selection");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const payload = page.getByRole("status", { name: "Selection payload" });
  await page.getByRole("checkbox", { name: "Select page", exact: true }).press("Space");
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["a", "b"] }));
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Select c", exact: true })).not.toBeChecked();
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: ["a", "b"] }));
  await page.getByRole("button", { name: "Prepare selected CSV", exact: true }).click();
  expect(await page.getByRole("status", { name: "Selected CSV" }).textContent()).toBe('"ID"\r\n"a"\r\n"b"\r\n');
  await page.getByRole("button", { name: "Select all matching", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Select c", exact: true })).toBeChecked();
  await page.getByRole("checkbox", { name: "Select c", exact: true }).press("Space");
  await expect(page.getByRole("checkbox", { name: "Select page", exact: true })).toBeChecked({ indeterminate: true });
  const captured = JSON.stringify({ kind: "query", filter: { kind: "and", children: [] }, excluded: ["c"] });
  await expect(payload).toHaveText(captured);
  await page.getByRole("button", { name: "Prepare selected CSV", exact: true }).click();
  expect(await page.getByRole("status", { name: "Selected CSV" }).textContent()).toBe('"ID"\r\n"a"\r\n"b"\r\n"d"\r\n');
  await page.getByRole("button", { name: "Capture bulk selection", exact: true }).click();
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Select a", exact: true })).toBeChecked();
  await page.getByRole("checkbox", { name: "Select a", exact: true }).press("Space");
  await expect(page.getByRole("status", { name: "Captured selection" })).toHaveText(captured);
  await page.getByRole("button", { name: "Only closed", exact: true }).click();
  await expect(payload).toHaveText(JSON.stringify({ kind: "ids", ids: [] }));
  await expect(page.getByRole("checkbox", { name: "Select d", exact: true })).not.toBeChecked();
  await expect(page.getByRole("table", { name: "Selection rows" }).locator("tbody tr")).toHaveCount(1);
  expect(warnings).toEqual([]);
});

test("selection controls hydrate in place and keyboard changes produce one coherent payload", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/table-selection", { waitUntil: "commit" });
    const checkbox = page.getByRole("checkbox", { name: "Select a", exact: true });
    await checkbox.evaluate(element => element.setAttribute("data-server", "true"));
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(checkbox).toHaveAttribute("data-server", "true");
    await checkbox.press("Space");
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeFocused();
    await expect(page.getByRole("status", { name: "Selection payload" })).toHaveText(JSON.stringify({ kind: "ids", ids: ["a"] }));
    await expect(page.getByRole("checkbox", { name: "Select page", exact: true })).toBeChecked({ indeterminate: true });
    expect(errors).toEqual([]);
  } finally { release(); }
});
