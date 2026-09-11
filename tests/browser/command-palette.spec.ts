import { expect, test } from "@playwright/test";

test("CommandPalette is scoped, fuzzy, recent, and executes runtime shortcut registrations", async ({ page }) => {
  await page.goto("/command-palette");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("xpath=ancestor::*[@data-sheen-portal='scope']")).toHaveCount(1);
  const search = page.getByRole("combobox", { name: "Command palette" });
  await search.fill("sett");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Selected command" })).toHaveText("settings");
  await expect(page.getByRole("status", { name: "Saved recents" })).toHaveText("settings");

  await page.getByRole("button", { name: "Open palette" }).click();
  await expect(dialog.getByText("Recent", { exact: true })).toBeVisible();
  await search.fill("jump inbox");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Selected command" })).toHaveText("inbox");
});

test("CommandPalette retains accepted remote results until an abortable refresh is accepted", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/palette?query=remote", async route => { await barrier; await route.continue(); });
  try {
    await page.goto("/command-palette");
    await page.getByRole("button", { name: "Open palette" }).click();
    const search = page.getByRole("combobox", { name: "Command palette" });
    const accepted = page.getByRole("option", { name: "Remote report" });
    await accepted.evaluate(element => element.setAttribute("data-accepted", "retained"));
    await search.fill("remote");
    await expect(page.locator("[cmdk-root]" )).toHaveAttribute("data-refreshing", "true");
    await expect(accepted).toHaveAttribute("data-accepted", "retained");
    release();
    await expect(page.getByRole("option", { name: "Remote remote result" })).toBeVisible();
  } finally { release(); }
});
