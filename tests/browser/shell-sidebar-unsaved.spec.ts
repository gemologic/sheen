import { expect, test } from "@playwright/test";

test.use({ channel: "chromium" });

for (const resolution of ["save", "dispose"]) {
  test(`sidebar dirty registration survives projection and clears on ${resolution}`, async ({ page }) => {
    await page.goto("/shell-sidebar-unsaved");
    const editor = page.getByRole("textbox", { name: "Sidebar editor", exact: true });
    await editor.fill("Retained dirty sidebar");
    await expect(page.getByRole("status", { name: "Sidebar dirty", exact: true })).toHaveText("true");
    await editor.evaluate(element => element.setAttribute("data-retained", "true"));
    await page.setViewportSize({ width: 600, height: 800 });
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    await expect(drawer).toHaveCount(0);
    const leave = page.getByRole("link", { name: "Leave sidebar workspace", exact: true });
    await leave.click();
    const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
    await expect(prompt).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(leave).toBeFocused();
    await expect(page).toHaveURL(/\/shell-sidebar-unsaved$/);
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(editor).toHaveAttribute("data-retained", "true");
    await expect(editor).toHaveValue("Retained dirty sidebar");
    await editor.fill("Changed inside drawer");
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect(drawer).toHaveCount(0);
    await expect(editor).toHaveAttribute("data-retained", "true");
    await expect(editor).toHaveValue("Changed inside drawer");
    await leave.click();
    await expect(prompt).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(leave).toBeFocused();
    if (resolution === "save") {
      await page.getByRole("button", { name: "Save sidebar draft", exact: true }).click();
      await expect(page.getByRole("status", { name: "Sidebar dirty", exact: true })).toHaveText("false");
    } else {
      await page.setViewportSize({ width: 600, height: 800 });
      await page.getByRole("button", { name: "Toggle sidebar editor", exact: true }).click();
      await toggle.click();
      await expect(drawer).toBeVisible();
      await expect(page.getByText("Sidebar editor removed", { exact: true })).toBeVisible();
      await expect(editor).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
    }
    await leave.click();
    await expect(page).toHaveURL(/\/browser-status$/);
    await expect(page.getByRole("heading", { name: "Browser status qualification" })).toBeVisible();
  });
}

test("closed drawer retains the native unload guard for its dirty editor", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto("/shell-sidebar-unsaved");
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.click();
  const editor = page.getByRole("textbox", { name: "Sidebar editor", exact: true });
  await editor.fill("Do not discard on drawer close");
  await expect(page.getByRole("status", { name: "Sidebar dirty", exact: true })).toHaveText("true");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("dialog", { name: "Sidebar", exact: true })).toHaveCount(0);
  let promptType: string | undefined;
  page.once("dialog", async prompt => { promptType = prompt.type(); await prompt.dismiss(); });
  await page.reload({ timeout: 5000 }).catch(() => null);
  expect(promptType).toBe("beforeunload");
  await toggle.click();
  await expect(editor).toHaveValue("Do not discard on drawer close");
});

test("discard confirmation above the drawer cancels one layer or completes navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto("/shell-sidebar-unsaved");
  await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  const editor = drawer.getByRole("textbox", { name: "Sidebar editor", exact: true });
  await editor.fill("Nested confirmation draft");
  await expect(drawer.getByRole("status", { name: "Sidebar dirty", exact: true })).toHaveText("true");
  const leave = drawer.getByRole("link", { name: "Leave from sidebar", exact: true });
  await leave.click();
  const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await expect(prompt).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(prompt).toHaveCount(0);
  await expect(drawer).toBeVisible();
  await expect(leave).toBeFocused();
  await expect(editor).toHaveValue("Nested confirmation draft");
  await leave.click();
  await prompt.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/browser-status$/);
  await expect(page.getByRole("heading", { name: "Browser status qualification" })).toBeVisible();
  await expect(prompt).toHaveCount(0);
  await expect(drawer).toHaveCount(0);
  expect(errors).toEqual([]);
});
