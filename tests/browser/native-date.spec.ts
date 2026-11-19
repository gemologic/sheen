import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function submitted(page: Page): Promise<Record<string, string>> {
  await page.getByRole("button", { name: "Submit" }).click();
  const text = await page.locator("#native-submitted").innerText();
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null) throw new Error("form output is not an object");
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
}

test("native date inputs keep server markup and a pre-hydration draft through delayed hydration", async ({ page }) => {
  let releaseScripts: () => void = () => {};
  const scriptsReleased = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await scriptsReleased;
    await route.continue();
  });
  try {
    await page.goto("/native-date", { waitUntil: "commit" });
    const date = page.getByLabel("Invoice date");
    await expect(date).toHaveValue("2026-09-08");
    await expect(date).toHaveAttribute("min", "2026-01-01");
    await expect(page.getByLabel("Daily cutoff")).toHaveValue("17:30");
    await expect(page.getByLabel("Settlement date")).toHaveAttribute("aria-invalid", "true");
    await date.fill("2026-10-01");
    await date.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    releaseScripts();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(date).toHaveAttribute("data-server-identity", "retained");
    await expect(date).toHaveValue("2026-10-01");
    expect(await submitted(page)).toMatchObject({ invoiceDate: "2026-10-01", cutoff: "17:30:00.000", startsAt: "" });
  } finally {
    releaseScripts();
  }
});

test("native fields publish keyboard edits through ISO projections and restore defaults on reset", async ({ page }) => {
  await page.goto("/native-date");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const time = page.getByLabel("Daily cutoff");
  await time.focus();
  await page.keyboard.press("ArrowUp");
  await expect(time).toHaveValue("18:30");
  const date = page.getByLabel("Invoice date");
  await date.focus();
  await page.keyboard.press("ArrowUp");
  await expect(date).toHaveValue("2026-10-08");
  expect(await submitted(page)).toMatchObject({ invoiceDate: "2026-10-08", cutoff: "18:30:00.000" });
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(date).toHaveValue("2026-09-08");
  await expect(time).toHaveValue("17:30");
  expect(await submitted(page)).toMatchObject({ invoiceDate: "2026-09-08", cutoff: "17:30:00.000" });
});

test("native datetime-local rejects an ambiguous New York wall time until an instant is chosen", async ({ page }) => {
  await page.goto("/native-date");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const field = page.getByLabel("Change window start (New York)");
  await field.fill("2026-11-01T01:30");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("occurs twice");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#native-instant")).toHaveText("none");
  await alert.getByRole("button", { name: /^Later:/u }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.locator("#native-instant")).toHaveText("2026-11-01T06:30:00.000Z[America/New_York]");
  await expect(field).toHaveValue("2026-11-01T01:30");
  await field.fill("2026-07-04T09:00");
  await expect(page.locator("#native-instant")).toHaveText("2026-07-04T13:00:00.000Z[America/New_York]");
  expect(await submitted(page)).toMatchObject({ startsAt: "2026-07-04T13:00:00.000Z[America/New_York]" });
});
