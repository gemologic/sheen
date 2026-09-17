import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("grouped permissions submit native values and retain drafts through refresh", async ({ page }) => {
  await page.goto("/admin/policies");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const form = page.getByRole("form", { name: "Create policy" });
  await expect(page.getByRole("region", { name: "No policies yet" })).toBeVisible();
  await page.getByRole("button", { name: "Name your first policy" }).click();
  const name = form.getByRole("textbox", { name: "Policy name" });
  await expect(name).toBeFocused();
  await name.fill("support-reviewer");
  const read = form.getByRole("checkbox", { name: "Read accounts", exact: true });
  await read.focus();
  await page.keyboard.press("Space");
  await form.getByRole("checkbox", { name: "Read audit log", exact: true }).press("Space");
  await expect(form.getByText("2 permissions selected", { exact: true })).toBeVisible();
  await expect(form.getByRole("group", { name: "Accounts", exact: true })).toContainText("1 selected in accounts");
  await expect(form.getByRole("group", { name: "Operations", exact: true })).toContainText("1 selected in operations");
  await expect(form.getByRole("checkbox", { name: "Administer workspace" })).toBeDisabled();
  expect(await form.evaluate(element => {
    if (!(element instanceof HTMLFormElement)) throw new Error("Expected form");
    return new FormData(element).getAll("scopes");
  })).toEqual(["accounts:read", "audit:read"]);
  const retained = await name.elementHandle();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(name).toHaveValue("support-reviewer");
  await expect(read).toBeChecked();
  expect(await name.evaluate((element, before) => element === before, retained)).toBe(true);
  const submission = page.waitForRequest(request => request.url().endsWith("/api/admin-policy") && request.method() === "POST");
  await form.getByRole("button", { name: "Create policy", exact: true }).click();
  expect((await submission).postDataJSON()).toEqual({ name: "support-reviewer", scopes: ["accounts:read", "audit:read"] });
  await expect(name).toHaveAttribute("readonly", "");
  await expect(form.getByRole("button", { name: "Reset form" })).toBeDisabled();
  const pendingValues = await form.evaluate(element => {
    if (!(element instanceof HTMLFormElement)) throw new Error("Expected form");
    const checkbox = element.querySelector<HTMLInputElement>('input[value="accounts:read"]');
    if (!checkbox) throw new Error("Missing selected permission");
    checkbox.click();
    element.reset();
    return { name: new FormData(element).get("name"), scopes: new FormData(element).getAll("scopes") };
  });
  expect(pendingValues).toEqual({ name: "support-reviewer", scopes: ["accounts:read", "audit:read"] });
  await expect(page.locator(".loupe-admin-policy-list")).toContainText("support-reviewer");
  await expect(name).toHaveValue("");
  await expect(read).not.toBeChecked();
  await page.getByText("View permissions for support-reviewer", { exact: true }).click();
  await expect(page.locator(".loupe-admin-policy-list code")).toHaveText(["accounts:read", "audit:read"]);
  await expect(page.locator('.sheen-admin-actions[data-action-role="primary"] .sheen-button')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
});

test("policy validation, reset, duplicate checks and confirmed deletion perform real work", async ({ page }) => {
  await page.goto("/admin/policies");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const form = page.getByRole("form", { name: "Create policy" });
  const name = form.getByRole("textbox", { name: "Policy name" });
  const submit = form.getByRole("button", { name: "Create policy", exact: true });
  await name.fill("Invalid name");
  await submit.click();
  await expect(form.getByRole("alert")).toContainText("3–48 lowercase");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/3–48 lowercase/u);
  await expect(form.locator("fieldset[aria-invalid=true]")).toHaveCount(0);
  await name.fill("reviewer");
  await submit.click();
  await expect(form.getByRole("alert")).toHaveText("Select at least one permission.");
  await expect(name).not.toHaveAttribute("aria-invalid", "true");
  await expect(form.getByRole("group", { name: "Accounts", exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByRole("group", { name: "Operations", exact: true })).toHaveAccessibleDescription(/Select at least one permission/u);
  await form.getByRole("checkbox", { name: "Review accounts", exact: true }).press("Space");
  await form.getByRole("button", { name: "Reset form" }).click();
  await expect(name).toHaveValue("");
  await expect(form.getByRole("checkbox", { name: "Review accounts", exact: true })).not.toBeChecked();
  await expect(form.getByRole("alert")).toHaveCount(0);
  for (let attempt = 0; attempt < 2; attempt++) {
    await name.fill("reviewer");
    await form.getByRole("checkbox", { name: "Review accounts", exact: true }).press("Space");
    await submit.click();
    await expect(page.locator(".loupe-admin-policy-list strong")).toHaveText("reviewer");
  }
  await expect(form.getByRole("alert")).toContainText("already exists");
  await page.getByRole("button", { name: "Delete reviewer", exact: true }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete reviewer?" });
  await expect(confirmation).toContainText("cannot be undone");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Delete reviewer", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Delete reviewer", exact: true }).click();
  await confirmation.getByRole("button", { name: "Delete policy", exact: true }).click();
  await expect(page.getByRole("region", { name: "No policies yet" })).toBeVisible();
});

test("policy endpoint independently rejects unavailable grants", async ({ page, request }) => {
  await page.goto("/admin/policies");
  const response = await request.post("/api/admin-policy", { headers: { origin: new URL(page.url()).origin }, data: { name: "owner", scopes: ["workspace:admin"] } });
  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("unavailable");
});

test("failed refresh and retry retain policy groups, focused selection, and draft values", async ({ page }) => {
  await page.goto("/admin/policies?refresh=fail-first");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const form = page.getByRole("form", { name: "Create policy" });
  const name = form.getByRole("textbox", { name: "Policy name" });
  const read = form.getByRole("checkbox", { name: "Read accounts", exact: true });
  await name.fill("retained-reviewer");
  await read.press("Space");
  const identity = await form.elementHandle();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await read.focus();
  const frames = await read.evaluate(async element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected checkbox");
    const samples = [];
    for (let index = 0; index < 12; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push({ connected: element.isConnected, checked: element.checked, focused: document.activeElement === element });
    }
    return samples;
  });
  expect(frames).toEqual(Array.from({ length: 12 }, () => ({ connected: true, checked: true, focused: true })));
  await expect(page.locator('.loupe-admin-refresh-error[role="alert"]')).toBeVisible();
  await expect(name).toHaveValue("retained-reviewer");
  await expect(read).toBeFocused();
  await page.getByRole("button", { name: "Retry refresh" }).click();
  await expect(page.locator(".sheen-toast-title")).toHaveText("Workspace refreshed");
  expect(await form.evaluate((element, before) => element === before, identity)).toBe(true);
  await expect(name).toHaveValue("retained-reviewer");
  await expect(read).toBeChecked();
  await expect(form.getByText("1 permission selected", { exact: true })).toBeVisible();
});
