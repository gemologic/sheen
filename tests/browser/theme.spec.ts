import { test, expect } from "@playwright/test";
import { createThemeScript } from "../../packages/ui/src/theme/script";

test("clicks on server-rendered buttons replay once hydration attaches handlers", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await page.locator('.preview[data-sheen-theme="paper"]').getByRole("button", { name: "Open settings" }).click();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(page.getByText("Saved 1")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Workspace settings", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Saved 2")).toBeVisible();
  } finally { release(); }
});

test("dark default, live controls, and scoped dialog hydration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-theme", "obsidian");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "jade");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-icon-set", "radix");
  await expect(page.getByLabel("Theme", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Theme", { exact: true }).first().locator("option")).toHaveCount(6);
  await expect(page.getByLabel("Accent", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Accent", { exact: true }).first().locator("option")).toHaveCount(12);
  await expect(page.locator('.preview[data-sheen-accent="jade"]')).toHaveCount(1);
  await expect(page.locator('.preview[data-sheen-accent="indigo"]')).toHaveCount(1);
  await expect(page.locator('.preview[data-sheen-accent="amber"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.getByText("Saved 1")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).first().press("Enter");
  await expect(page.getByText("Saved 2")).toBeVisible();
  const paper = page.locator('.preview[data-sheen-theme="paper"]');
  await paper.getByRole("button", { name: "Open settings" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(paper.getByRole("dialog")).toBeVisible();
  const pixel = await dialog.evaluate(element => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable");
    context.fillStyle = getComputedStyle(element).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  });
  expect(pixel).toEqual([255, 255, 255, 255]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(paper.getByRole("button", { name: "Open settings" })).toBeFocused();
  expect(errors).toEqual([]);
});

test("persisted preferences survive hydration and refresh without losing edits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ mode: "light", theme: "slate", accent: "rose" })));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "rose");
  const input = page.getByLabel("Workspace name").first();
  await input.fill("Unsaved draft");
  await input.evaluate(element => element.setAttribute("data-identity", "original"));
  await page.getByLabel("Accent", { exact: true }).selectOption("cyan");
  await expect(input).toHaveValue("Unsaved draft");
  await expect(input).toHaveAttribute("data-identity", "original");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "cyan");
});

test("saved light mode reaches inherited scopes before delayed hydration", async ({ page }) => {
  let releaseScripts: () => void = () => {};
  const scriptsReleased = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ mode: "light", theme: "slate", accent: "rose" })));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await scriptsReleased;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "commit" });
    const inherited = page.locator('.preview[data-sheen-theme="graphite"]');
    await expect(inherited).toHaveAttribute("data-sheen-mode", "light");
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
    const beforeHydration = await inherited.evaluate(element => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("Canvas context unavailable");
      context.fillStyle = getComputedStyle(element).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    });
    expect(beforeHydration).toEqual([250, 250, 250, 255]);
    const input = inherited.getByLabel("Workspace name");
    await input.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    releaseScripts();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await inherited.getByRole("button", { name: "Save changes" }).click();
    await expect(inherited.getByText("Saved 1")).toBeVisible();
    await expect(input).toHaveAttribute("data-server-identity", "retained");
  } finally { releaseScripts(); }
});

test("cookie state hydrates and persists without replacing the document", async ({ page, context }) => {
  await context.addCookies([{ name: "sheen", value: encodeURIComponent(JSON.stringify({ mode: "light", theme: "vellum", accent: "violet" })), domain: "127.0.0.1", path: "/" }]);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/cookie");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-icon-set", "phosphor");
  await page.getByLabel("Cookie draft").fill("Preserve me");
  await page.getByRole("button", { name: "Persist mode" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.getByLabel("Cookie draft")).toHaveValue("Preserve me");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Persist mode" }).click();
  await expect(page.locator("output")).toHaveText(/(?:fetch|load failed)/iu);
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("nested scoped dialogs unwind one layer and restore focus", async ({ page }) => {
  await page.goto("/");
  const paper = page.locator('.preview[data-sheen-theme="paper"]');
  await paper.getByRole("button", { name: "Open settings", exact: true }).click();
  await page.getByRole("button", { name: "Open nested settings" }).click();
  await expect(page.getByRole("dialog", { name: "Nested settings", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Nested settings", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Workspace settings", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open nested settings" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(paper.getByRole("button", { name: "Open settings", exact: true })).toBeFocused();
});

test("scope setters preserve root persistence, inherit omitted axes, and reset null", async ({ page }) => {
  await page.goto("/scopes");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  await page.getByRole("button", { name: "Change read only" }).click();
  await expect(page.getByRole("group", { name: "read only" }).locator("output")).toContainText("controllable=true");
  await page.getByRole("button", { name: "Change local" }).click();
  await expect(page.locator(".controllable-scope")).toHaveAttribute("data-sheen-accent", "violet");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "jade");
  expect(await page.evaluate(() => localStorage.getItem("sheen"))).toBeNull();
  await expect(page.locator(".reset-scope")).toHaveAttribute("data-sheen-accent", "jade");
  await expect(page.locator(".reset-scope")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(page.locator(".reset-scope")).toHaveAttribute("data-sheen-density", "compact");
  await page.getByRole("button", { name: "Change root", exact: true }).click();
  await expect(page.locator(".read-only-scope")).toHaveAttribute("data-sheen-density", "compact");
  await expect(page.locator(".read-only-scope")).toHaveAttribute("data-sheen-mode", "light");
  await expect(page.locator(".read-only-scope")).toHaveAttribute("data-sheen-theme", "paper");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sheen") ?? "null"))).toMatchObject({ accent: "violet", density: "compact", mode: "light" });
});

test("prepaint bootstrap works with denied storage and nonce-only CSP", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(script => {
    const frame = document.createElement("iframe");
    frame.id = "isolated-theme";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.srcdoc = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-sheen-test'"><script nonce="sheen-test">${script}</script></head><body>Isolated theme</body></html>`;
    document.body.append(frame);
  }, createThemeScript());
  const frame = page.frameLocator("#isolated-theme");
  await expect(frame.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
  await expect(frame.locator("html")).toHaveAttribute("data-sheen-accent", "jade");
  expect(await frame.locator("body").evaluate(() => {
    try { localStorage.getItem("sheen"); return false; }
    catch (error) { return error instanceof DOMException && error.name === "SecurityError"; }
  })).toBe(true);
});
