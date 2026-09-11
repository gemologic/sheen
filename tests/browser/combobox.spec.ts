import { expect, test } from "@playwright/test";

test("Combobox retains accepted option nodes until async results settle", async ({ page }) => {
  let releaseRequest: () => void = () => {};
  const requestBarrier = new Promise<void>(resolve => { releaseRequest = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/combobox?**", async route => {
    await requestBarrier;
    await route.continue();
  });
  try {
    await page.goto("/combobox");
    const input = page.getByRole("combobox", { name: "Async owner", exact: true });
    await input.fill("lin");
    const root = page.locator(".sheen-combobox").first();
    await expect(root).toHaveAttribute("data-previous-results", "");
    await expect(input).toHaveAttribute("aria-busy", "true");
    const listbox = page.locator(".sheen-combobox-listbox");
    await expect(listbox).toHaveAttribute("inert", "");
    await expect(listbox).toHaveAttribute("aria-disabled", "true");
    const ada = page.locator('[role="option"]', { hasText: "Ada Lovelace" });
    await expect(ada).toBeVisible();
    await ada.evaluate(element => element.setAttribute("data-accepted-option", "retained"));
    await page.evaluate(() => new Promise<void>(resolve => {
      let frames = 0;
      const next = (): void => { if (++frames >= 20) resolve(); else requestAnimationFrame(next); };
      requestAnimationFrame(next);
    }));
    await expect(ada).toHaveAttribute("data-accepted-option", "retained");
    releaseRequest();
    await expect(root).not.toHaveAttribute("data-previous-results", "", { timeout: 3_000 });
    await expect(input).not.toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("option", { name: "Linus Torvalds", exact: true })).toBeEnabled();
    await expect(page.getByRole("option", { name: "Ada Lovelace", exact: true })).toHaveCount(0);
    await page.getByRole("option", { name: "Linus Torvalds", exact: true }).click();
    await expect(page.getByLabel("Selected owner")).toHaveText("linus");
    expect(errors).toEqual([]);
  } finally { releaseRequest(); }
});

test("Combobox keeps accepted data through result failure and retries independently of field validation", async ({ page }) => {
  await page.goto("/combobox");
  const input = page.getByRole("combobox", { name: "Async owner", exact: true });
  await input.fill("fail");
  await expect(page.getByRole("alert")).toContainText("Search service unavailable", { timeout: 3_000 });
  await expect(page.getByRole("option", { name: "Ada Lovelace", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 3_000 });
  await expect(page.getByText("No results", { exact: true })).toBeVisible();
});

test("MultiCombobox selection, Backspace, tags, and native form values agree", async ({ page }) => {
  await page.goto("/combobox");
  const input = page.getByRole("combobox", { name: "Reviewers", exact: true });
  await expect(page.getByLabel("Selected reviewers")).toHaveText("ada");
  await input.fill("Grace");
  await expect(page.getByLabel("Selected reviewers")).toHaveText("ada");
  await expect(page.getByRole("option", { name: "Grace Hopper", exact: true })).toHaveAttribute("aria-selected", "false");
  await page.getByRole("option", { name: "Grace Hopper", exact: true }).click();
  await expect(page.getByLabel("Selected reviewers")).toHaveText("ada,grace");
  await input.press("Escape");
  await page.getByRole("button", { name: "Inspect form" }).click();
  await expect(page.getByLabel("Form values")).toHaveText('[["reviewers","ada"],["reviewers","grace"]]');
  await input.press("Backspace");
  await expect(page.getByLabel("Selected reviewers")).toHaveText("ada");
  await page.getByRole("button", { name: "Remove Ada Lovelace", exact: true }).click();
  await expect(page.getByLabel("Selected reviewers")).toHaveText("");
  await expect(input).toHaveAttribute("placeholder", "Add reviewers");
});

test("Combobox portal inherits its ThemeScope", async ({ page }) => {
  await page.goto("/combobox");
  const input = page.getByRole("combobox", { name: "Scoped owner", exact: true });
  await input.fill("Ada");
  const option = page.getByRole("option", { name: "Ada Lovelace", exact: true });
  await expect(option).toBeVisible();
  expect(await option.evaluate(element => {
    const scope = element.closest("[data-sheen-portal]");
    return { theme: scope?.getAttribute("data-sheen-theme"), mode: scope?.getAttribute("data-sheen-mode"), direction: getComputedStyle(element).direction };
  })).toEqual({ theme: "paper", mode: "light", direction: "rtl" });
});

test("Combobox preserves native input edits made before hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/combobox", { waitUntil: "commit" });
    const input = page.getByRole("combobox", { name: "Async owner", exact: true });
    await input.fill("pre-hydration");
    await input.evaluate(element => element.setAttribute("data-server-input", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(input).toHaveValue("pre-hydration");
    await expect(input).toHaveAttribute("data-server-input", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
