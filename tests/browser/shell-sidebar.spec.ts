import { expect, test } from "@playwright/test";

test("controlled sidebar proposals can be rejected without moving focus or hiding drafts", async ({ page }) => {
  await page.goto("/shell-sidebar-controlled");
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.click();
  const proposals = page.getByRole("status", { name: "Sidebar proposals", exact: true });
  await expect(proposals).toHaveText("1");
  const draft = page.getByRole("textbox", { name: "Sidebar draft", exact: true });
  await draft.fill("Retained sidebar draft");
  await draft.evaluate(element => element.setAttribute("data-retained", "true"));
  const mod = await page.evaluate(() => /^(Mac|iPhone|iPad|iPod)/.test(navigator.platform) ? "Meta" : "Control");
  await page.keyboard.press(`${mod}+/`);
  await expect(proposals).toHaveText("2");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(draft).toBeFocused();
  await page.getByRole("button", { name: "Accept sidebar changes", exact: true }).click();
  await draft.focus();
  await page.keyboard.press(`${mod}+/`);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(draft).toHaveAttribute("data-retained", "true");
  await expect(draft).toHaveValue("Retained sidebar draft");
  await expect(proposals).toHaveText("4");
});

test("sidebar toggle retains its pane and recovers focused navigation", async ({ page }) => {
  await page.goto("/shell");
  const help = page.getByRole("button", { name: "Keyboard shortcuts", exact: true });
  await help.click();
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await expect(sheet.getByText("Toggle sidebar", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(help).toBeFocused();
  const pane = page.getByRole("region", { name: "Sidebar navigation", exact: true });
  await pane.evaluate(element => element.setAttribute("data-retained", "true"));
  const link = page.getByRole("link", { name: "Section 20", exact: true });
  await link.focus();
  const scroll = await pane.evaluate(element => element.scrollTop);
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  const mod = await page.evaluate(() => /^(Mac|iPhone|iPad|iPod)/.test(navigator.platform) ? "Meta" : "Control");
  await page.keyboard.press(`${mod}+/`);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(page.locator(".sheen-app-shell")).toHaveAttribute("data-sidebar", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(pane).toHaveAttribute("data-retained", "true");
  expect(await pane.evaluate(element => element.scrollTop)).toBe(scroll);
  await expect(link).toBeVisible();
  await expect(toggle).toBeFocused();
});

test("sidebar toggle replays an early click without removing server navigation", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/shell", { waitUntil: "commit" });
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    await page.locator(".sheen-shell-sidebar").evaluate(element => element.setAttribute("data-server", "retained"));
    await toggle.click();
    release();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(page.locator(".sheen-shell-sidebar")).toHaveAttribute("data-server", "retained");
    await toggle.click();
    await expect(page.getByRole("link", { name: "Section 1", exact: true })).toBeVisible();
    await expect(page.locator(".sheen-shell-sidebar")).toHaveAttribute("data-server", "retained");
  } finally { release(); }
});
