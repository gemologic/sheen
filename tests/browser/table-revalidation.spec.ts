import { expect, test } from "@playwright/test";

test("refresh keys preserve accepted rows, focus, drafts, expansion and selection through success and failure", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("/api/table-chrome?delay=650")) requests.push(request.url());
  });
  await page.goto("/table-chrome");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  expect(requests).toHaveLength(0);
  const section = page.getByRole("region", { name: "Refresh table" });
  const root = section.locator(".sheen-data-table");
  const alpha = section.locator('tr[data-row-id="alpha"]');
  await section.getByRole("checkbox", { name: "Select row alpha" }).press("Space");
  await section.getByText("Notes for alpha", { exact: true }).click();
  const draft = section.getByRole("textbox", { name: "Draft for alpha" });
  await draft.fill("keep my draft");
  await draft.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected draft input");
    element.setSelectionRange(2, 6);
    element.setAttribute("data-original", "yes");
  });
  await section.getByRole("button", { name: "Revalidate accounts" }).evaluate(element => {
    if (!(element instanceof HTMLButtonElement)) throw new Error("Expected refresh button");
    element.click();
  });
  await expect(root).toHaveAttribute("data-pending", "");
  const retained = await draft.evaluate(async element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected input");
    const table = element.closest("table");
    const samples: boolean[] = [];
    for (let frame = 0; frame < 50; frame++) {
      samples.push(element.isConnected && document.activeElement === element && element.value === "keep my draft"
        && element.selectionStart === 2 && element.selectionEnd === 6
        && table?.querySelectorAll("tbody tr[data-row-id]").length === 3);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    return samples;
  });
  expect(retained.every(Boolean)).toBe(true);
  await expect(root).not.toHaveAttribute("data-pending", "");
  await expect(alpha).toHaveAttribute("data-selected", "");
  await expect(draft).toHaveAttribute("data-original", "yes");
  await expect(draft).toBeFocused();
  expect(requests).toHaveLength(1);

  await section.getByRole("button", { name: "Fail next refresh" }).click();
  await section.getByRole("button", { name: "Revalidate accounts" }).press("Enter");
  await expect(section.getByRole("alert")).toContainText("Chrome request failed (503)");
  await expect(draft).toHaveValue("keep my draft");
  await expect(alpha).toHaveAttribute("data-selected", "");
  await section.getByRole("button", { name: "Revalidate accounts" }).press("Enter");
  await expect(root).not.toHaveAttribute("data-pending", "");
  await expect(section.getByRole("alert")).toHaveCount(0);
  await expect(draft).toHaveAttribute("data-original", "yes");
});

test("key invalidation preserves the newest in-flight sort query", async ({ page }) => {
  await page.goto("/table-chrome");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const section = page.getByRole("region", { name: "Refresh table" });
  const table = section.getByRole("table", { name: "Refresh accounts" });
  const sort = table.getByRole("button", { name: "Name", exact: true });
  await sort.click();
  await expect(section.locator(".sheen-data-table")).not.toHaveAttribute("data-pending", "");
  const requested = page.waitForRequest(request => request.url().includes("direction=desc"));
  await sort.click();
  await requested;
  const revalidated = page.waitForResponse(response => response.url().includes("direction=desc") && response.ok());
  await section.getByRole("button", { name: "Revalidate accounts" }).click();
  await revalidated;
  await expect(table.locator("tbody tr[data-row-id]").first()).toHaveAttribute("data-row-id", "gamma");
  await expect(table.locator('th[data-column="name"]')).toHaveAttribute("aria-sort", "descending");
});
