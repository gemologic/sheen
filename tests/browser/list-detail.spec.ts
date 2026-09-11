import { expect, test } from "@playwright/test";

test("desktop navigation keeps list continuity and restores detail scroll per accepted URL", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/list-detail");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const list = page.getByRole("region", { name: "Messages", exact: true });
  const detail = page.getByRole("region", { name: "Message detail", exact: true });
  const first = page.getByRole("link", { name: /Message 1 Unread/ });
  await first.focus();
  await first.press("End");
  const last = page.getByRole("link", { name: /Message 60 Account/ });
  await expect(last).toBeFocused();
  await last.press("ArrowUp");
  const previous = page.getByRole("link", { name: /Message 59 Account/ });
  await expect(previous).toBeFocused();
  const listOffset = await list.evaluate(element => element.scrollTop);
  await previous.press("Enter");
  await expect(page).toHaveURL(/item=message-59/u);
  await expect(previous).toHaveAttribute("aria-current", "page");
  await expect(previous).toBeFocused();
  await expect.poll(() => list.evaluate(element => element.scrollTop)).toBe(listOffset);
  await detail.evaluate(element => { element.scrollTop = 600; });
  await expect.poll(() => detail.evaluate(element => element.scrollTop)).toBe(600);
  await page.getByRole("link", { name: /Message 58 Unread/ }).click();
  await expect(page).toHaveURL(/item=message-58/u);
  await expect.poll(() => detail.evaluate(element => element.scrollTop)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/item=message-59/u);
  await expect.poll(() => detail.evaluate(element => element.scrollTop)).toBe(600);
  expect(errors).toEqual([]);
});

test("phone activation and back navigation hand focus between retained panes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 750 });
  await page.goto("/list-detail");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const layout = page.locator(".sheen-list-detail");
  const list = page.getByRole("region", { name: "Messages", exact: true });
  const detail = page.locator('.sheen-list-detail-detail[aria-label="Message detail"]');
  await layout.evaluate(element => element.setAttribute("data-retained-layout", "yes"));
  await list.evaluate(element => element.setAttribute("data-retained-list", "yes"));
  await detail.evaluate(element => element.setAttribute("data-retained-detail", "yes"));
  const origin = page.getByRole("link", { name: /Message 1 Unread/ });
  await origin.click();
  await expect(page).toHaveURL(/item=message-1/u);
  await expect(list).toBeHidden();
  await expect(detail).toBeVisible();
  await expect(detail).toBeFocused();
  await expect(layout).toHaveAttribute("data-retained-layout", "yes");
  await expect(detail).toHaveAttribute("data-retained-detail", "yes");
  await page.getByRole("link", { name: "Back to messages", exact: true }).click();
  await expect(page).toHaveURL(/\/list-detail$/u);
  await expect(list).toBeVisible();
  await expect(detail).toBeHidden();
  await expect(origin).toBeFocused();
  await expect(list).toHaveAttribute("data-retained-list", "yes");
});

test("real detail refresh retains content, identity, and scroll without blank frames", async ({ page }) => {
  await page.goto("/list-detail?item=message-4");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const detail = page.getByRole("region", { name: "Message detail", exact: true });
  const article = page.locator("[data-detail-root]");
  await article.evaluate(element => element.setAttribute("data-retained-article", "yes"));
  await detail.evaluate(element => { element.scrollTop = 500; });
  await expect.poll(() => detail.evaluate(element => element.scrollTop)).toBe(500);
  await page.getByRole("button", { name: "Refresh detail", exact: true }).click();
  await expect(page.getByRole("status", { name: "Refresh state" })).toHaveText("Refreshing");
  const frames = await page.evaluate(async () => {
    const samples: string[] = [];
    for (let index = 0; index < 20; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      samples.push(document.querySelector("[data-detail-root]")?.textContent ?? "");
    }
    return samples;
  });
  expect(frames.every(frame => frame.includes("retained content line 50") && frame.includes("Revision 0"))).toBe(true);
  await expect(page.getByRole("status", { name: "Refresh state" })).toHaveText("Ready");
  await expect(page.getByRole("status", { name: "Accepted revision" })).toHaveText("Revision 1");
  await expect(article).toHaveAttribute("data-retained-article", "yes");
  await expect.poll(() => detail.evaluate(element => element.scrollTop)).toBe(500);
});

test("delayed hydration adopts the dark URL-selected layout without replacing panes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 750 });
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/list-detail?item=message-2", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    const layout = page.locator(".sheen-list-detail");
    const list = page.locator('.sheen-list-detail-list[aria-label="Messages"]');
    const detail = page.locator('.sheen-list-detail-detail[aria-label="Message detail"]');
    await layout.evaluate(element => element.setAttribute("data-server-layout", "yes"));
    await list.evaluate(element => element.setAttribute("data-server-list", "yes"));
    await detail.evaluate(element => element.setAttribute("data-server-detail", "yes"));
    await expect(list).toBeHidden();
    await expect(detail).toContainText("Message 2 retained content line 50");
    release();
    await page.getByRole("button", { name: "Refresh detail", exact: true }).click();
    await expect(layout).toHaveAttribute("data-server-layout", "yes");
    await expect(list).toHaveAttribute("data-server-list", "yes");
    await expect(detail).toHaveAttribute("data-server-detail", "yes");
    await expect(page.locator(".sheen-list-detail")).toHaveCount(1);
    await expect(list).toHaveCount(1);
    await expect(detail).toHaveCount(1);
  } finally { release(); }
});

test("list-detail layout has a bounded dark desktop baseline", async ({ page }) => {
  await page.goto("/list-detail?item=message-4");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator(".sheen-list-detail")).toHaveScreenshot("list-detail-dark.png", { animations: "disabled" });
});
