import { expect, test } from "@playwright/test";

test.use({ channel: "chromium" });

test("window focus follows native tab activation", async ({ page, context }) => {
  await page.goto("/browser-status");
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await page.bringToFront();
  const focused = page.getByRole("status", { name: "Window focused", exact: true });
  await expect(focused).toHaveText("true");
  const other = await context.newPage();
  try {
    const otherSession = await context.newCDPSession(other);
    await otherSession.send("Emulation.setFocusEmulationEnabled", { enabled: false });
    await other.bringToFront();
    await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(false);
    await expect(focused).toHaveText("false");
    await page.bringToFront();
    await expect(focused).toHaveText("true");
  } finally { await other.close(); }
});

test("connectivity follows actual browser offline state and reinitializes after disposal", async ({ page, context }) => {
  await page.goto("/browser-status");
  const online = page.getByRole("status", { name: "Browser online", exact: true });
  await expect(online).toHaveText("true");
  await context.setOffline(true);
  await expect(online).toHaveText("false");
  await page.getByRole("button", { name: "Toggle observer" }).click();
  await expect(online).toHaveCount(0);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Toggle observer" }).click();
  await expect(online).toHaveText("true");
  await context.setOffline(true);
  await expect(online).toHaveText("false");
  await context.setOffline(false);
  await expect(online).toHaveText("true");
});

test("delayed hydration retains deterministic server status nodes", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/browser-status", { waitUntil: "commit" });
    const online = page.getByRole("status", { name: "Browser online", exact: true });
    await expect(online).toHaveText("undefined");
    await online.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(online).toHaveText("true");
    await expect(online).toHaveAttribute("data-server", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
