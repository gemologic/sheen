import { expect, test } from "@playwright/test";

test("regional retry handles real rejection without replacing drafts or allowing duplicate attempts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/error-state");
  const region = page.getByRole("region", { name: "Orders refresh failed", exact: true });
  const draft = page.getByRole("textbox", { name: "Retained content draft", exact: true });
  await draft.fill("Existing work");
  await region.getByRole("textbox").fill("Action draft");
  const draftBounds = await region.getByRole("textbox").boundingBox();
  await region.evaluate(element => element.setAttribute("data-original", "retained"));
  const retry = region.getByRole("button", { name: "Retry", exact: true });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(retry).toBeDisabled();
  await expect(region.getByRole("status")).toHaveText("Retrying");
  await page.keyboard.press("Enter");
  await expect(region.getByRole("status")).toHaveText("Retry failed. Try again.");
  expect(await region.getByRole("textbox").boundingBox()).toEqual(draftBounds);
  await expect(page.getByRole("status", { name: "Retry attempts", exact: true })).toHaveText("1");
  await expect(region).not.toContainText("Private transport");
  await expect(retry).toBeEnabled();
  await page.getByRole("button", { name: "Allow retry success", exact: true }).click();
  await retry.click();
  await expect(retry).toBeEnabled();
  await expect(region.getByRole("status")).toBeEmpty();
  await expect(region).toHaveAttribute("data-original", "retained");
  await expect(region.getByRole("textbox")).toHaveValue("Action draft");
  await expect(draft).toHaveValue("Existing work");
  await expect(page.getByRole("status", { name: "Retry attempts", exact: true })).toHaveText("2");
  expect(errors).toEqual([]);
});

test("retry rejection after owner disposal causes no browser error or stale feedback", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/error-state");
  const region = page.getByRole("region", { name: "Orders refresh failed", exact: true });
  const response = page.waitForResponse(value => value.url().endsWith("/api/optimistic"));
  await region.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(region.getByRole("button")).toBeDisabled();
  await page.getByRole("button", { name: "Toggle error region", exact: true }).click();
  await expect(region).toHaveCount(0);
  expect((await response).status()).toBe(409);
  await page.getByRole("button", { name: "Toggle error region", exact: true }).click();
  await expect(region.getByRole("status")).toBeEmpty();
  await expect(region.getByRole("button")).toBeEnabled();
  expect(errors).toEqual([]);
});

test("error variants honor hidden state and render dark and light RTL layouts", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/error-state");
  await expect(page.locator(".sheen-error-state[hidden]")).toBeHidden();
  await expect(page.locator("[data-error-matrix]")).toHaveScreenshot("error-state-dark-light-rtl.png");
  await page.setViewportSize({ width: 375, height: 750 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("regional errors hydrate without replacing drafts or dropping queued retry", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/error-state", { waitUntil: "commit" });
    const region = page.getByRole("region", { name: "Orders refresh failed", exact: true });
    await region.getByRole("textbox").fill("Before hydration");
    await region.evaluate(element => element.setAttribute("data-server", "retained"));
    await region.getByRole("button", { name: "Retry", exact: true }).click();
    release();
    await expect(region.getByRole("status")).toHaveText("Retry failed. Try again.");
    await expect(region).toHaveAttribute("data-server", "retained");
    await expect(region.getByRole("textbox")).toHaveValue("Before hydration");
    expect(errors).toEqual([]);
  } finally { release(); }
});
