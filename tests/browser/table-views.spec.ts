import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("saved-view controls hydrate in place without implicit persistence requests", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/table-views")) requests.push(request.url()); });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto(`/table-views?session=${randomUUID()}`, { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Current table search", exact: true });
    await expect(input).toHaveValue("Alpha");
    await input.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(input).toHaveAttribute("data-server", "retained");
    expect(requests).toEqual([]);
  } finally { release(); }
});

test("app adapter lists, saves, restores, and deletes versioned views", async ({ page }) => {
  await page.goto(`/table-views?session=${randomUUID()}`);
  const activity = page.getByRole("status", { name: "View activity" });
  await page.getByRole("button", { name: "List views", exact: true }).click();
  await expect(activity).toHaveText("Pending");
  await expect(page.getByRole("list", { name: "Saved views" }).getByRole("listitem")).toHaveCount(0);
  const search = page.getByRole("textbox", { name: "Current table search", exact: true });
  await search.fill("Saved query");
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveText("My view");
  await search.fill("Unsaved query");
  await page.getByRole("button", { name: "Restore My view", exact: true }).click();
  await expect(search).toHaveValue("Saved query");
  await expect(page.getByRole("status", { name: "Current search state" })).toHaveText("Saved query");
  await page.getByRole("button", { name: "Delete My view", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveCount(0);
});

test("adapter failure retains views and current state until exact retry succeeds", async ({ page }) => {
  await page.goto(`/table-views?session=${randomUUID()}`);
  await page.getByRole("textbox", { name: "Current table search", exact: true }).fill("Kept query");
  await page.getByRole("button", { name: "Save view", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveText("My view");
  await page.getByRole("checkbox", { name: "Reject view operations", exact: true }).press("Space");
  await page.getByRole("button", { name: "Delete My view", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("retained");
  await expect(page.getByRole("listitem")).toHaveText("My view");
  await expect(page.getByRole("status", { name: "Current search state" })).toHaveText("Kept query");
  await page.getByRole("checkbox", { name: "Reject view operations", exact: true }).press("Space");
  await page.getByRole("button", { name: "Retry view operation", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
