import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("server export availability and deterministic markup hydrate in place", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/table-export")) requests.push(request.url()); });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table-export", { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Export query", exact: true });
    await expect(input).toHaveValue("Alpha");
    await expect(page.getByRole("status", { name: "Export state" })).toHaveText("Idle");
    await expect(page.getByRole("region", { name: "Without export adapter" }).getByRole("button", { name: "Export", exact: true })).toHaveCount(0);
    const serverTrigger = page.getByRole("region", { name: "Server DataTable export" }).getByRole("button", { name: "Export", exact: true });
    await serverTrigger.click();
    await input.evaluate(element => element.setAttribute("data-server", "true"));
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(input).toHaveAttribute("data-server", "true");
    await expect(page.getByRole("status", { name: "Adapter calls" })).toHaveText("0");
    await expect(page.getByRole("menuitem", { name: "Export CSV", exact: true })).toHaveCount(1);
    await expect(page.getByRole("status", { name: "DataTable export calls" })).toHaveText("0");
    expect(requests).toEqual([]);
  } finally { release(); }
});

test("client DataTable exports the complete accepted view, visible columns, and active selection", async ({ page }) => {
  await page.goto("/table-export");
  const region = page.getByRole("region", { name: "Client DataTable export" });
  const trigger = region.getByRole("button", { name: "Export", exact: true });
  await trigger.click();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export CSV", exact: true }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("client-orders.csv");
  const csvPath = await csv.path();
  if (!csvPath) throw new Error("Expected downloaded client CSV");
  expect(await readFile(csvPath, "utf8")).toBe('"Name"\r\n"Alpha"\r\n"Alpha second"\r\n');
  await expect(region.getByText("Beta", { exact: true })).toHaveCount(0);

  await region.getByRole("checkbox", { name: "Select row alpha", exact: true }).focus();
  await region.getByRole("checkbox", { name: "Select row alpha", exact: true }).press("Space");
  await trigger.click();
  const jsonPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export JSON", exact: true }).click();
  const json = await jsonPromise;
  expect(json.suggestedFilename()).toBe("client-orders.json");
  const jsonPath = await json.path();
  if (!jsonPath) throw new Error("Expected downloaded client JSON");
  expect(JSON.parse(await readFile(jsonPath, "utf8"))).toEqual([{ name: "Alpha" }]);
});

test("DataTable delegates server exports, retains the last artifact on failure, and retries the captured request", async ({ page }) => {
  await page.goto("/table-export");
  const region = page.getByRole("region", { name: "Server DataTable export" });
  const trigger = region.getByRole("button", { name: "Export", exact: true });
  const acceptedRow = region.locator('tr[data-row-id="alpha"]');
  await acceptedRow.evaluate(element => element.setAttribute("data-export-row", "retained"));
  await trigger.click();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Export CSV", exact: true }).click();
  await expect(region.getByRole("status", { name: "DataTable export calls" })).toHaveText("1");
  await expect(region.getByRole("status").filter({ hasText: "Preparing export" })).toBeVisible();
  const blankFrames = await region.evaluate(async element => {
    let blanks = 0;
    for (let frame = 0; frame < 20; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      if (element.querySelectorAll("tbody tr[data-row-id]").length === 0) blanks++;
    }
    return blanks;
  });
  expect(blankFrames).toBe(0);
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("server-orders.csv");
  const csvPath = await csv.path();
  if (!csvPath) throw new Error("Expected downloaded DataTable server CSV");
  expect(await readFile(csvPath, "utf8")).toBe('"Name"\r\n"Alpha"\r\n"Alpha second"\r\n');
  await expect(acceptedRow).toHaveAttribute("data-export-row", "retained");
  const requestText = await region.getByRole("status", { name: "DataTable export request" }).textContent();
  if (!requestText) throw new Error("Expected captured DataTable export request");
  const request = JSON.parse(requestText);
  expect(request).toEqual({ format: "csv", search: "Alpha", selection: null });

  const retained = region.getByRole("button", { name: "Download last export", exact: true });
  await retained.evaluate(element => element.setAttribute("data-retained", "true"));
  await page.getByRole("checkbox", { name: "Reject exports", exact: true }).focus();
  await page.getByRole("checkbox", { name: "Reject exports", exact: true }).press("Space");
  await trigger.click();
  await page.getByRole("menuitem", { name: "Export JSON", exact: true }).click();
  await expect(region.getByRole("alert")).toHaveText(/Export failed/);
  await expect(retained).toHaveAttribute("data-retained", "true");
  await expect(region.getByRole("status", { name: "DataTable export calls" })).toHaveText("2");

  await page.getByRole("checkbox", { name: "Reject exports", exact: true }).press("Space");
  const jsonPromise = page.waitForEvent("download");
  await region.getByRole("button", { name: "Retry export", exact: true }).click();
  const json = await jsonPromise;
  expect(json.suggestedFilename()).toBe("server-orders.json");
  await expect(retained).toHaveAttribute("data-retained", "true");
  await expect(region.getByRole("status", { name: "DataTable export calls" })).toHaveText("3");
});

test("server exports use the complete captured view and retain an artifact through failure", async ({ page }) => {
  await page.goto("/table-export");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const state = page.getByRole("status", { name: "Export state" });
  const calls = page.getByRole("status", { name: "Adapter calls" });
  await page.getByRole("button", { name: "Prepare server CSV", exact: true }).click();
  await expect(state).toHaveText("Preparing");
  await expect(page.getByRole("button", { name: "Prepare server CSV", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Prepare server JSON", exact: true })).toBeDisabled();
  await expect(calls).toHaveText("1");
  const link = page.getByRole("link", { name: "Download server export", exact: true });
  await expect(link).toBeVisible();
  await expect(page.getByTestId("prepared-query")).toHaveText("Alpha");
  await link.evaluate(element => element.setAttribute("data-artifact-node", "retained"));
  const csvPromise = page.waitForEvent("download");
  await link.press("Enter");
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("server.csv");
  const csvPath = await csv.path();
  if (!csvPath) throw new Error("Expected downloaded server CSV");
  expect(await readFile(csvPath, "utf8")).toBe('"Name"\r\n"Alpha"\r\n"Alpha second"\r\n');

  await page.getByRole("textbox", { name: "Export query", exact: true }).fill("Alpha second");
  await page.getByRole("checkbox", { name: "Reject exports", exact: true }).press("Space");
  await page.getByRole("button", { name: "Prepare server JSON", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("previous download");
  await expect(page.getByTestId("prepared-query")).toHaveText("Alpha");
  await expect(link).toHaveAttribute("data-artifact-node", "retained");
  await expect(calls).toHaveText("2");

  await page.getByRole("checkbox", { name: "Reject exports", exact: true }).press("Space");
  await page.getByRole("button", { name: "Retry export", exact: true }).click();
  await expect(page.getByTestId("prepared-query")).toHaveText("Alpha second");
  await expect(link).toHaveAttribute("data-artifact-node", "retained");
  await expect(calls).toHaveText("3");
  const jsonPromise = page.waitForEvent("download");
  await link.press("Enter");
  const json = await jsonPromise;
  expect(json.suggestedFilename()).toBe("server.json");
  const jsonPath = await json.path();
  if (!jsonPath) throw new Error("Expected downloaded server JSON");
  expect(JSON.parse(await readFile(jsonPath, "utf8"))).toEqual([{ name: "Alpha second" }]);
});

test("clearing an in-flight export prevents late publication and permits a new request", async ({ page }) => {
  await page.goto("/table-export");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  await page.getByRole("button", { name: "Prepare server CSV", exact: true }).click();
  await expect(page.getByRole("status", { name: "Export state" })).toHaveText("Preparing");
  await page.getByRole("button", { name: "Clear exports", exact: true }).click();
  await expect(page.getByRole("status", { name: "Export state" })).toHaveText("Idle");
  await page.waitForTimeout(700);
  await expect(page.getByRole("link", { name: "Download server export", exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Export query", exact: true }).fill("Beta");
  await page.getByRole("button", { name: "Prepare server CSV", exact: true }).click();
  await expect(page.getByTestId("prepared-query")).toHaveText("Beta");
  await expect(page.getByRole("status", { name: "Adapter calls" })).toHaveText("2");
});
