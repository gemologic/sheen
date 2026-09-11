import { expect, test } from "@playwright/test";

test("avatar fallback, localized overflow, and native progress semantics work", async ({ page }) => {
  await page.goto("/inventory");
  const avatar = page.getByRole("img", { name: "Ada Lovelace" });
  await expect(avatar.locator(".sheen-avatar-fallback")).toHaveText("AL");
  await expect(avatar.locator("img")).toHaveCount(0);
  await expect(page.getByLabel("1.001 weitere")).toHaveText("+1.001");

  const progress = page.getByRole("progressbar", { name: "Upload progress" });
  await expect(progress).toHaveAttribute("value", "4");
  await expect(page.getByRole("progressbar", { name: "Queued work" })).not.toHaveAttribute("value");
  await expect(page.getByRole("meter", { name: "Storage used" })).toHaveAttribute("value", "7");
  await expect(page.locator("main")).toHaveScreenshot("avatar-progress-dark.png");
  await page.getByRole("button", { name: "Advance upload" }).click();
  await expect(progress).toHaveAttribute("value", "7");

  const frames = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>("[data-avatar-refresh]");
    const trigger = Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Load avatar image");
    if (!root || !trigger) throw new Error("Missing avatar refresh fixture");
    trigger.click();
    const samples: boolean[] = [];
    await new Promise<void>(resolve => {
      const started = performance.now();
      const sample = (): void => {
        samples.push(root.getBoundingClientRect().width > 0 && root.querySelector(".sheen-avatar-fallback, img") !== null);
        if (performance.now() - started >= 500) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return samples;
  });
  expect(frames.length).toBeGreaterThan(1);
  expect(frames.every(Boolean)).toBe(true);
  await expect(avatar.locator("img")).toHaveCount(1);
});

test("avatar and native value elements hydrate their server nodes in place", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/inventory", { waitUntil: "commit" });
    const roots = page.locator("[data-avatar-refresh], [data-inventory-progress], [data-inventory-meter]");
    await expect(roots).toHaveCount(3);
    await roots.evaluateAll(elements => {
      for (const element of elements) element.setAttribute("data-server-identity", "retained");
    });
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(roots).toHaveCount(3);
    await expect(page.locator('[data-server-identity="retained"]')).toHaveCount(3);
    await expect(page.getByRole("img", { name: "Ada Lovelace" }).locator(".sheen-avatar-fallback")).toHaveText("AL");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
