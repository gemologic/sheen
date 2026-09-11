import { expect, test } from "@playwright/test";

test("navigation slots preserve focused links during a real count refresh", async ({ page }) => {
  await page.goto("/nav-slots");
  const nav = page.getByRole("navigation", { name: "Inbox navigation", exact: true });
  const inbox = nav.getByRole("link", { name: "Inbox 3 unread", exact: true });
  await page.getByRole("button", { name: "Refresh unread count", exact: true }).click();
  await inbox.focus();
  await inbox.evaluate(element => element.setAttribute("data-retained", "yes"));
  const updated = nav.getByRole("link", { name: "Inbox 4 unread", exact: true });
  await expect(updated).toBeFocused();
  await expect(updated).toHaveAttribute("data-retained", "yes");
  await expect(updated).toHaveAttribute("aria-current", "page");
  await expect(updated.locator(".sheen-nav-item-icon")).toHaveAttribute("aria-hidden", "true");
  const icon = await updated.locator("svg").boundingBox();
  const badge = await updated.locator(".sheen-nav-item-badge").boundingBox();
  expect(icon).not.toBeNull(); expect(badge).not.toBeNull();
  expect(icon?.x).toBeGreaterThan(badge?.x ?? Infinity);
  await page.keyboard.press("Tab");
  await expect(nav.getByRole("link", { name: "Archive", exact: true })).toBeFocused();
});

test("navigation slots reuse server link and slot nodes through delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/nav-slots", { waitUntil: "commit" });
    const inbox = page.getByRole("link", { name: "Inbox 3 unread", exact: true });
    await inbox.evaluate(element => { element.setAttribute("data-server", "yes"); element.querySelector("svg")?.setAttribute("data-server", "yes"); });
    await page.getByRole("button", { name: "Refresh unread count", exact: true }).click();
    release();
    const updated = page.getByRole("link", { name: "Inbox 4 unread", exact: true });
    await expect(updated).toHaveAttribute("data-server", "yes");
    await expect(updated.locator("svg")).toHaveAttribute("data-server", "yes");
  } finally { release(); }
});
