import { expect, test } from "@playwright/test";
import { serializeState } from "../../packages/table/src/table-state";
import { exportSchema, exportState } from "../../apps/loupe/src/fixtures/table-export";

test("URL writes preserve unrelated query/hash state and clear only the table parameter", async ({ page }) => {
  await page.goto("/table-url?keep=1#anchor");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const input = page.getByRole("textbox", { name: "Table search state", exact: true });
  await input.fill("Beta");
  await page.getByRole("button", { name: "Replace URL state", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("keep") === "1" && url.searchParams.has("table") && url.hash === "#anchor");
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("Beta");
  await page.getByRole("button", { name: "Clear URL state", exact: true }).click();
  await expect(page).toHaveURL(url => url.searchParams.get("keep") === "1" && !url.searchParams.has("table") && url.hash === "#anchor");
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("Alpha");
});

test("pushed table states follow actual browser history", async ({ page }) => {
  await page.goto("/table-url?keep=1");
  const input = page.getByRole("textbox", { name: "Table search state", exact: true });
  await input.fill("First");
  await page.getByRole("button", { name: "Push URL state", exact: true }).click();
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("First");
  await input.fill("Second");
  await page.getByRole("button", { name: "Push URL state", exact: true }).click();
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("Second");
  await page.goBack();
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("First");
  await page.goBack();
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("Alpha");
});

test("valid initial state hydrates in place without navigating", async ({ page }) => {
  const state = { ...exportState, search: "From URL" };
  const parameters = new URLSearchParams({ keep: "1", table: serializeState(state, exportSchema) });
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const documents: string[] = [];
  page.on("request", request => { if (request.resourceType() === "document") documents.push(request.url()); });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto(`/table-url?${parameters}`, { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Table search state", exact: true });
    await expect(input).toHaveValue("From URL");
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Server");
    const historyLength = await page.evaluate(() => history.length);
    await input.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(input).toHaveAttribute("data-server", "retained");
    await expect(input).toHaveValue("From URL");
    expect(documents).toHaveLength(1);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
  } finally { release(); }
});

test("duplicate or malformed parameters fail closed without replacing current state", async ({ page }) => {
  await page.goto("/table-url?table=bad&table=worse&keep=1");
  await expect(page.getByRole("alert")).toContainText("invalid");
  await expect(page.getByRole("status", { name: "Accepted table search" })).toHaveText("Alpha");
  await expect(page).toHaveURL(url => url.searchParams.getAll("table").length === 2 && url.searchParams.get("keep") === "1");
});
