import { expect, test } from "@playwright/test";

test("link help inherits its scope and retains native navigation when help is disabled", async ({ page }) => {
  await page.goto("/link-tooltip");
  const link = page.getByRole("link", { name: "Report", exact: true });
  await link.focus();
  const tip = page.getByRole("tooltip");
  await expect(tip).toHaveText("Read the full report");
  await expect(tip).toHaveCSS("direction", "rtl");
  await expect(link).toHaveAttribute("type", "text/html");
  await expect(link).not.toHaveAttribute("role", "button");
  await link.evaluate(element => element.setAttribute("data-retained", "yes"));
  await page.keyboard.press("Escape");
  await expect(tip).toHaveCount(0);
  await expect(link).toBeFocused();
  await page.getByRole("button", { name: "Toggle help", exact: true }).click();
  await link.focus();
  await expect(link).toHaveAttribute("data-retained", "yes");
  await expect(tip).toHaveCount(0);
  const popup = page.waitForEvent("popup");
  await page.keyboard.press("Enter");
  const opened = await popup;
  await expect(opened).toHaveURL(/\/link-tooltip#report$/);
  await opened.close();
});

test("link help hydrates a focused server anchor without replacing it", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/link-tooltip", { waitUntil: "commit" });
    const link = page.getByRole("link", { name: "Report", exact: true });
    await link.focus();
    await link.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(page.getByRole("tooltip")).toHaveText("Read the full report");
    await expect(link).toHaveAttribute("data-server", "retained");
    await expect(link).toBeFocused();
  } finally { release(); }
});
