import { expect, test } from "@playwright/test";

test("TanStack adapter blocks, cancels, retries, and traverses exact real history attempts", async ({ page }) => {
  await page.goto("/tanstack-router");
  const location = page.getByRole("status", { name: "TanStack location" });
  const state = page.getByRole("status", { name: "TanStack block state" });
  await expect(location).toHaveText("/");
  await page.getByRole("switch", { name: "Unsaved changes" }).press("Space");
  await page.getByRole("button", { name: "Open next route" }).click();
  await expect(state).toHaveText("blocked");
  await expect(location).toHaveText("/");
  await page.getByRole("button", { name: "Stay here" }).click();
  await expect(state).toHaveText("idle");
  await expect(location).toHaveText("/");
  await page.getByRole("button", { name: "Open next route" }).click();
  await page.getByRole("button", { name: "Discard and continue" }).click();
  await expect(location).toHaveText("/next?view=detail#result");
  await expect(page.getByText("Next route", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(location).toHaveText("/");
  await expect(page.getByText("Index route", { exact: true })).toBeVisible();
});

test("TanStack adapter hydrates deterministic initial location without replacing controls", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/tanstack-router", { waitUntil: "commit" });
    const button = page.getByRole("button", { name: "Open next route" });
    await button.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(button).toHaveAttribute("data-server", "retained");
    await expect(page.getByRole("status", { name: "TanStack location" })).toHaveText("/");
  } finally { release(); }
});
