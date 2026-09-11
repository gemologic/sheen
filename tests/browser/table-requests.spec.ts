import { expect, test } from "@playwright/test";

test("background refresh retains rows, editor identity, focus, and selection on intermediate frames", async ({ page }) => {
  await page.goto("/table-requests");
  const table = page.getByRole("table", { name: "Request rows" });
  const draft = page.getByRole("textbox", { name: "Draft a-1", exact: true });
  await draft.fill("Unsaved draft");
  await draft.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected input");
    element.setSelectionRange(2, 7);
    element.setAttribute("data-retained", "true");
    const table = element.closest("table");
    if (!table) throw new Error("Expected table");
    let count = 0;
    let failures = 0;
    const sample = () => {
      if (!table.isConnected) return;
      count++;
      if (table.querySelectorAll("tbody tr").length !== 3 || !element.isConnected || document.activeElement !== element || element.selectionStart !== 2 || element.selectionEnd !== 7) failures++;
      table.setAttribute("data-samples", String(count));
      table.setAttribute("data-continuity-failures", String(failures));
      if (!table.hasAttribute("data-stop-sampling")) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole("button", { name: "Refresh current", exact: true }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected refresh button");
    element.click();
  });
  await expect(table).toHaveAttribute("aria-busy", "true");
  await expect(table).toContainText("a-1 revision 0");
  await expect(table).toContainText("a-1 revision 1");
  await expect(page.getByRole("status", { name: "Request activity" })).toHaveText("Settled");
  await expect(draft).toHaveValue("Unsaved draft");
  await expect(draft).toHaveAttribute("data-retained", "true");
  await expect(draft).toBeFocused();
  await table.evaluate(element => element.setAttribute("data-stop-sampling", "true"));
  expect(Number(await table.getAttribute("data-samples"))).toBeGreaterThan(1);
  await expect(table).toHaveAttribute("data-continuity-failures", "0");
});

test("different queries retain labeled previous rows, reject actions, and discard late results", async ({ page }) => {
  await page.goto("/table-requests");
  const table = page.getByRole("table", { name: "Request rows" });
  await expect(table).toContainText("a-1 revision 0");
  await page.getByRole("button", { name: "Fail B", exact: true }).click();
  await expect(page.getByRole("status", { name: "Query state" })).toHaveText("Showing previous query results");
  await expect(page.getByRole("button", { name: "Archive a-1", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Archive a-1", exact: true }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
  await expect(page.getByRole("status", { name: "Archive count" })).toHaveText("0");
  await expect(page.getByRole("alert")).toHaveText("Request failed. Existing results retained.");
  await expect(table).toContainText("a-1 revision 0");
  const slowResponse = page.waitForResponse(response => response.url().includes("/api/table-requests?") && response.url().includes("delay=1500"));
  await page.getByRole("button", { name: "Slow A", exact: true }).click();
  await page.getByRole("button", { name: "Fast B", exact: true }).click();
  await expect(table).toContainText("b-1 revision 3");
  await (await slowResponse).finished();
  await expect(page.getByRole("status", { name: "Request completions" })).toHaveText("3");
  await expect(table).toContainText("b-1 revision 3");
  await expect(table).not.toContainText("a-1");
  await page.getByRole("button", { name: "Clear results", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(0);
});

test("cleared results stay empty after a non-cancellable response completes", async ({ page }) => {
  await page.goto("/table-requests");
  const table = page.getByRole("table", { name: "Request rows" });
  await expect(table).toContainText("a-1 revision 0");
  await page.getByRole("button", { name: "Slow A", exact: true }).click();
  await expect(table).toHaveAttribute("aria-busy", "true");
  await page.getByRole("button", { name: "Clear results", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Query state" })).toHaveText("No accepted results");
  await expect(page.getByRole("status", { name: "Request completions" })).toHaveText("1");
  await expect(table.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Request activity" })).toHaveText("Settled");
});

test("initial accepted rows hydrate without a duplicate request or lost editor draft", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/table-requests?")) requests.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/table-requests", { waitUntil: "commit" });
    const table = page.getByRole("table", { name: "Request rows" });
    await expect(table.locator("tbody tr")).toHaveCount(3);
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Server");
    const input = page.getByRole("textbox", { name: "Draft a-1", exact: true });
    await input.fill("Typed before hydration");
    await input.evaluate(element => { element.setAttribute("data-server", "retained"); if (element instanceof HTMLInputElement) element.setSelectionRange(2, 8); });
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(input).toHaveAttribute("data-server", "retained");
    await expect(input).toHaveValue("Typed before hydration");
    await expect(input).toBeFocused();
    expect(await input.evaluate(element => element instanceof HTMLInputElement ? [element.selectionStart, element.selectionEnd] : [])).toEqual([2, 8]);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Archive a-1", exact: true }).click();
    await expect(page.getByRole("status", { name: "Archive count" })).toHaveText("1");
  } finally { release(); }
});
