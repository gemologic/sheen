import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

async function chooseState(page: Page, option: string): Promise<void> {
  await page.getByRole("button", { name: /^Dashboard state /u }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("dashboard gallery retains accepted content during refresh and exposes explicit operational states", async ({ page }) => {
  await page.goto("/gallery/dashboard");
  await ready(page);
  const content = page.locator("[data-dashboard-content]");
  const draft = page.getByRole("textbox", { name: "Retained dashboard draft", exact: true });
  await expect(page.getByRole("group", { name: "Operational summary", exact: true })).toBeVisible();
  await expect(page.getByRole("img")).toHaveCount(3);
  await expect(page.getByRole("table", { name: "Recent workspace activity", exact: true })).toBeVisible();
  await content.evaluate(element => element.setAttribute("data-dashboard-identity", "retained"));
  await draft.fill("Keep the operator note");
  await page.getByRole("button", { name: "Refresh data", exact: true }).click();
  await expect(content).toHaveAttribute("data-pending", "true");
  const samples = await content.evaluate(async element => {
    const frames: Array<{ readonly connected: boolean; readonly identity: string | null; readonly text: string }> = [];
    for (let index = 0; index < 20; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      frames.push({ connected: element.isConnected, identity: element.getAttribute("data-dashboard-identity"), text: element.textContent ?? "" });
    }
    return frames;
  });
  expect(samples.every(sample => sample.connected && sample.identity === "retained" && sample.text.includes("Throughput") && sample.text.includes("Deployment completed"))).toBe(true);
  await expect(page.getByRole("status", { name: "Dashboard revision", exact: true })).toHaveText("Revision 1");
  await expect(content).not.toHaveAttribute("data-pending", "");
  await expect(content).toHaveAttribute("data-dashboard-identity", "retained");
  await expect(draft).toHaveValue("Keep the operator note");

  await chooseState(page, "Empty");
  await expect(page.getByRole("region", { name: "No dashboard data", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load sample data", exact: true }).click();
  await expect(page.locator("[data-dashboard-content]")).toBeVisible();
  await chooseState(page, "Server error");
  await expect(page.getByText("The dashboard service did not return an accepted snapshot.", { exact: true })).toBeVisible();
  await chooseState(page, "Permission denied");
  await expect(page.getByText("Dashboard data was removed immediately when access changed.", { exact: true })).toBeVisible();
  await expect(page.locator("[data-dashboard-content]")).toHaveCount(0);
  await chooseState(page, "Loading");
  await expect(page.getByRole("region", { name: "Loading dashboard", exact: true })).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".loupe-dashboard-loading .sheen-skeleton")).toHaveCount(6);
});

test("gallery table uses the full DataTable surface for the deterministic 100k paginated and continuous modes", async ({ page }) => {
  const session = randomUUID();
  await page.goto(`/data-table-page?session=${session}&rows=100000&table=paged`);
  await ready(page);
  const pagination = page.getByRole("navigation", { name: "Pagination", exact: true });
  await expect(pagination.getByRole("status")).toHaveText("Page 1 of 10,000");
  await expect(page.getByRole("button", { name: "+ Filter", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Columns", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saved views", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Select row account-1", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Select row account-11", exact: true })).toHaveCount(0);

  await page.goto(`/data-table-page?session=${session}&rows=100000`);
  await ready(page);
  await expect(page.getByRole("navigation", { name: "Pagination", exact: true })).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Accounts", exact: true })).toHaveAttribute("aria-rowcount", "100001");
  await expect(page.getByRole("checkbox", { name: "Select row account-1", exact: true })).toBeVisible();
});

test("gallery table exposes its empty data state without changing the table contract", async ({ page }) => {
  await page.goto(`/data-table-page?session=${randomUUID()}&rows=empty`);
  await ready(page);
  await expect(page.getByRole("table", { name: "Accounts", exact: true })).toBeVisible();
  await expect(page.locator(".sheen-empty-state[data-kind=empty]").first()).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Select this page", exact: true }).first()).toBeDisabled();
});
