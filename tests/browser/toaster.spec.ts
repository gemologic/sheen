import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => { page.on("pageerror", error => { throw error; }); });

test("presenter disposal releases its lease and cancels its running timers", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Show timed notification", exact: true }).click();
  await expect(page.getByRole("group", { name: "Timed notification", exact: true })).toBeVisible();
  const toggle = page.getByRole("button", { name: "Toggle root presenter", exact: true });
  await toggle.click();
  await expect(page.getByRole("region", { name: "Notifications", exact: true })).toHaveCount(0);
  await page.waitForTimeout(1400);
  await toggle.click();
  await expect(page.getByRole("group", { name: "Timed notification", exact: true })).toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("region", { name: "Notifications", exact: true })).toHaveCount(1);
});

test("owner disposal prevents late action completion from reviving its queue", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Queue two", exact: true }).click();
  await page.getByRole("button", { name: "Show disposable action", exact: true }).click();
  const region = page.getByRole("region", { name: "Disposable notices", exact: true });
  const completed = page.waitForResponse(response => response.url().endsWith("/api/optimistic") && response.status() === 200);
  await region.getByRole("button", { name: "Commit", exact: true }).click();
  const toggle = page.getByRole("button", { name: "Toggle notification owner", exact: true });
  await toggle.click();
  await expect(region).toHaveCount(0);
  await completed;
  await toggle.click();
  await expect(region).toBeAttached();
  await expect(region.getByRole("group")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "First notification", exact: true })).toBeVisible();
  await expect(toggle).toBeFocused();
});

test("reducing and restoring the visible limit preserves consumed lifetime", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Show resumable pair", exact: true }).click();
  const card = page.getByRole("group", { name: "Resumable second", exact: true });
  await expect(card).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Limit to one", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Limit to two", exact: true }).click();
  await expect(card).toBeVisible();
  await expect(card).toHaveCount(0, { timeout: 1200 });
  await expect(page.getByRole("group", { name: "Persistent first", exact: true })).toBeVisible();
});

test("successful actions retain a usable focus target while pending and restore their opener", async ({ page }) => {
  await page.goto("/toaster");
  const opener = page.getByRole("button", { name: "Show successful action", exact: true });
  await opener.click();
  const card = page.getByRole("group", { name: "Successful action", exact: true });
  await card.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(card.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await expect(card).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("action completion does not steal deliberate external focus", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Show successful action", exact: true }).click();
  const card = page.getByRole("group", { name: "Successful action", exact: true });
  await card.getByRole("button", { name: "Apply", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Unrelated draft" });
  await input.fill("Keep working while the request completes");
  await expect(card).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Keep working while the request completes");
});

test("dismissing a pending action does not revive it when the request finishes", async ({ page }) => {
  await page.goto("/toaster");
  const opener = page.getByRole("button", { name: "Show successful action", exact: true });
  await opener.click();
  const card = page.getByRole("group", { name: "Successful action", exact: true });
  const completed = page.waitForResponse(response => response.url().endsWith("/api/optimistic") && response.status() === 200);
  await card.getByRole("button", { name: "Apply", exact: true }).click();
  await card.getByRole("button", { name: "Close", exact: true }).click();
  await expect(opener).toBeFocused();
  await completed;
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Notifications", exact: true }).getByRole("status")).toHaveText("");
});

test("focus pauses remaining lifetime instead of resetting it", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Show timed notification", exact: true }).click();
  const card = page.getByRole("group", { name: "Timed notification", exact: true });
  await expect(card).toBeVisible();
  await page.waitForTimeout(600);
  await card.getByRole("button", { name: "Close", exact: true }).focus();
  await page.waitForTimeout(1300);
  await expect(card).toBeVisible();
  await page.getByRole("textbox", { name: "Unrelated draft" }).focus();
  await expect(card).toHaveCount(0, { timeout: 900 });
  await expect(page.getByRole("textbox", { name: "Unrelated draft" })).toBeFocused();
});

test("page lifecycle events pause notification lifetime", async ({ page }) => {
  await page.goto("/toaster");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await page.getByRole("button", { name: "Show timed notification", exact: true }).click();
  const card = page.getByRole("group", { name: "Timed notification", exact: true });
  await expect(card).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(1400);
  await expect(card).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(card).toHaveCount(0);
});

test("pre-hydration notification trigger replays into the ready portal", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/toaster", { waitUntil: "commit" });
    const trigger = page.getByRole("button", { name: "Queue two", exact: true });
    await trigger.evaluate(element => element.setAttribute("data-server-trigger", "retained"));
    await trigger.click();
    release();
    await expect(page.getByRole("group", { name: "First notification", exact: true })).toBeVisible();
    await expect(trigger).toHaveAttribute("data-server-trigger", "retained");
    await page.getByRole("button", { name: "Clear root notifications", exact: true }).click();
    const region = page.getByRole("region", { name: "Notifications", exact: true });
    await expect(region.getByRole("status")).toHaveText("");
    await expect(region.getByRole("group")).toHaveCount(0);
  } finally { release(); }
});

test("queued notifications consume visible time only and pause on hover", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Queue two", exact: true }).click();
  const region = page.getByRole("region", { name: "Notifications", exact: true });
  const first = region.getByRole("group", { name: "First notification", exact: true });
  await expect(first).toBeInViewport({ ratio: 1 });
  await expect(region.getByRole("status")).toContainText("First notification");
  await page.waitForTimeout(800);
  await expect(region.getByRole("group", { name: "Queued notification" })).toHaveCount(0);
  await first.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Queue two", exact: true })).toBeFocused();
  const queued = region.getByRole("group", { name: "Queued notification", exact: true });
  await expect(queued).toBeVisible();
  await queued.hover();
  await page.waitForTimeout(800);
  await expect(queued).toBeVisible();
  await page.getByRole("heading").hover();
  await expect(queued).toHaveCount(0);
  await expect(region.locator(".sheen-toast-entry")).toHaveCount(0);
});

test("pending and failed actions remain available beyond their configured lifetime", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Show action notification", exact: true }).click();
  const card = page.getByRole("group", { name: "Action notification", exact: true });
  await card.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(card).toHaveAttribute("data-pending", "true");
  await page.getByRole("textbox", { name: "Unrelated draft" }).fill("Still editing");
  await page.getByRole("heading").hover();
  await expect(card).toHaveAttribute("data-invalid", "true");
  await page.waitForTimeout(800);
  await expect(card.getByRole("button", { name: "Retry", exact: true })).toBeEnabled();
  await expect(page.getByRole("region", { name: "Notifications", exact: true }).getByRole("status")).toContainText("Undo failed safely");
  await expect(card).not.toContainText("Private failure");
  await expect(page.getByRole("textbox", { name: "Unrelated draft" })).toBeFocused();
});

test("scoped notifications do not seize modal Escape ownership", async ({ page }) => {
  await page.goto("/toaster");
  await page.getByRole("button", { name: "Open scoped dialog", exact: true }).click();
  await page.getByRole("button", { name: "Show scoped notification", exact: true }).click();
  const region = page.getByRole("region", { name: "Scoped notices", exact: true });
  const card = region.getByRole("group", { name: "Scoped notification", exact: true });
  await expect(card).toBeVisible();
  await expect(region).toHaveCSS("direction", "rtl");
  await expect(region.getByRole("alert")).toContainText("Scoped notification");
  await expect(page.getByRole("button", { name: "Show scoped notification", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Scoped dialog", exact: true })).toHaveCount(0);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Dismiss", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
});
