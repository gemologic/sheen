import { expect, test } from "@playwright/test";

test("external result changes recover removed page focus without stealing outside focus", async ({ page }) => {
  await page.goto("/pagination");
  await page.getByRole("button", { name: "Many pages", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Pagination", exact: true });
  const current = nav.getByRole("button", { name: "Page 99,996", exact: true });
  await current.focus();
  await current.press("Alt+s");
  await expect(nav.getByRole("status")).toHaveText("Page 2 of 2");
  await expect(nav.getByRole("button", { name: "Page 2", exact: true })).toBeFocused();
  await page.keyboard.press("Alt+e");
  await expect(nav.getByRole("status")).toHaveText("Page 0 of 0");
  await expect(nav.getByRole("button", { name: "First page", exact: true })).toBeFocused();
  const outside = page.getByRole("button", { name: "Many pages", exact: true });
  await outside.click();
  await outside.press("Alt+s");
  await expect(nav.getByRole("status")).toHaveText("Page 2 of 2");
  await expect(outside).toBeFocused();
  await expect(page.getByRole("status", { name: "Pagination requests" })).toHaveText("0");
});

test("pagination retains accepted announcements during pending and rejected requests", async ({ page }) => {
  await page.goto("/pagination");
  const nav = page.getByRole("navigation", { name: "Pagination", exact: true });
  const status = nav.getByRole("status");
  const next = nav.getByRole("button", { name: "Next page", exact: true });
  await page.getByRole("button", { name: "Toggle page rejection", exact: true }).click();
  await next.evaluate(element => element.setAttribute("data-retained", "true"));
  await next.press("Space");
  await expect(nav).toHaveAttribute("aria-busy", "true");
  await expect(status).toHaveText("Page 1 of 10");
  await expect(next).toBeFocused();
  await next.press("Enter");
  await expect(page.getByRole("status", { name: "Pagination requests" })).toHaveText("1");
  await expect(page.getByRole("alert")).toHaveText("Page request failed. Accepted results are unchanged.");
  await expect(status).toHaveText("Page 1 of 10");
  await expect(next).toHaveAttribute("data-retained", "true");
  await page.getByRole("button", { name: "Toggle page rejection", exact: true }).click();
  await page.getByRole("button", { name: "Retry page", exact: true }).click();
  await expect(status).toHaveText("Page 2 of 10");
  await expect(nav.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page");
  const last = nav.getByRole("button", { name: "Last page", exact: true });
  await last.press("Enter");
  await expect(status).toHaveText("Page 10 of 10");
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-disabled", "true");
  await last.press("Enter");
  await expect(page.getByRole("status", { name: "Pagination requests" })).toHaveText("3");
});

test("pagination bounds large datasets and handles empty and RTL locale states", async ({ page }) => {
  await page.goto("/pagination");
  await page.getByRole("button", { name: "Many pages", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Pagination", exact: true });
  await expect(nav.getByRole("status")).toHaveText("Page 99,996 of 100,000");
  await expect(nav.getByRole("button")).toHaveCount(9);
  await page.getByRole("button", { name: "Toggle page locale", exact: true }).click();
  await expect(nav).toHaveCSS("direction", "rtl");
  const expected = await page.evaluate(() => `Page ${new Intl.NumberFormat("ar-EG").format(99996)} of ${new Intl.NumberFormat("ar-EG").format(100000)}`);
  await expect(nav.getByRole("status")).toHaveText(expected);
  await page.getByRole("button", { name: "Empty pages", exact: true }).click();
  await expect(nav.getByRole("button")).toHaveCount(4);
  await expect(nav.locator("[aria-current]")).toHaveCount(0);
  for (const button of await nav.getByRole("button").all()) {
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await button.press("Space");
  }
  await expect(page.getByRole("status", { name: "Pagination requests" })).toHaveText("0");
});

test("pagination hydrates existing controls and replays one page request", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/pagination", { waitUntil: "commit" });
    const nav = page.getByRole("navigation", { name: "Pagination", exact: true });
    await nav.evaluate(element => element.setAttribute("data-server", "retained"));
    await nav.getByRole("button", { name: "Next page", exact: true }).click();
    release();
    await expect(nav.getByRole("status")).toHaveText("Page 2 of 10");
    await expect(nav).toHaveAttribute("data-server", "retained");
    await expect(page.getByRole("status", { name: "Pagination requests" })).toHaveText("1");
  } finally { release(); }
});
