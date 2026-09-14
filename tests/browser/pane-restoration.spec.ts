import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function independentEntries(page: Page) {
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  const current = page.getByRole("status", { name: "Current page", exact: true });
  const entry = page.getByRole("status", { name: "History entry", exact: true });
  await expect(entry).not.toHaveText("server");
  const first = await entry.innerText();
  await main.hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect(current).toHaveText("?page=b");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  const middle = await entry.innerText();
  await page.getByRole("link", { name: "Page A", exact: true }).click();
  await expect(current).toHaveText("?page=a");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await main.hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(200);
  const last = await entry.innerText();
  expect(new Set([first, middle, last]).size).toBe(3);
  await page.goBack();
  await expect(current).toHaveText("?page=b");
  await expect(entry).toHaveText(middle);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.goBack();
  await expect(current).toHaveText("?page=a");
  await expect(entry).toHaveText(first);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.goForward();
  await expect(current).toHaveText("?page=b");
  await expect(entry).toHaveText(middle);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.goForward();
  await expect(current).toHaveText("?page=a");
  await expect(entry).toHaveText(last);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(200);
  await page.goBack();
  await expect(current).toHaveText("?page=b");
  await page.getByRole("link", { name: "Page A", exact: true }).click();
  await expect(current).toHaveText("?page=a");
  await expect(entry).not.toHaveText(last);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
}

test("remounting a shell after pending restoration starts with fresh offsets", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/pane-restoration?page=a");
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(main).toContainText("revision 1");
  await main.evaluate(element => { element.scrollTop = 700; element.setAttribute("data-old-shell", "yes"); });
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Load Page A slowly", exact: true }).click();
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("true");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Remove shell", exact: true }).click();
  await expect(main).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("false");
  await page.getByRole("button", { name: "Restore shell", exact: true }).click();
  await expect(main).toContainText("Content 100");
  await expect(main).not.toHaveAttribute("data-old-shell", "yes");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await main.evaluate(element => { element.scrollTop = 200; });
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await page.goBack();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(200);
  expect(errors).toEqual([]);
});

test("same-URL history entries keep independent offsets and replaced forward entries start fresh", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(main).toContainText("revision 1");
  await independentEntries(page);
});

test("history entries remain independent after a long bounded browser session", async ({ page, browserName }) => {
  await page.goto("/pane-restoration?page=a");
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  await expect(main).toContainText("revision 1");
  for (let index = 0; index < 60; index++) {
    const next = index % 2 === 0 ? "B" : "A";
    await page.getByRole("link", { name: `Page ${next}`, exact: true }).click();
    await expect(page.getByRole("status", { name: "Current page", exact: true })).toHaveText(`?page=${next.toLowerCase()}`);
  }
  if (browserName === "chromium") expect(await page.evaluate(() => history.length)).toBeLessThan(61);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await independentEntries(page);
  const accepted = await page.getByRole("status", { name: "History entry", exact: true }).innerText();
  await main.hover();
  // Change scroll after this frame's scroll events, then traverse before the next frame can emit them.
  await main.evaluate(element => new Promise<void>(resolve => requestAnimationFrame(() => {
    element.scrollTop = 123;
    history.back();
    resolve();
  })));
  await expect(page.getByRole("status", { name: "Current page", exact: true })).toHaveText("?page=b");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.goForward();
  await expect(page.getByRole("status", { name: "History entry", exact: true })).toHaveText(accepted);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(123);
  await page.getByRole("button", { name: "Toggle history editor dirty", exact: true }).click();
  await expect(page.getByRole("status", { name: "History editor dirty", exact: true })).toHaveText("true");
  await main.evaluate(element => { element.focus({ preventScroll: true }); element.scrollTop = 123; });
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(123);
  await page.evaluate(() => history.back());
  const prompt = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await expect(prompt).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(prompt).toBeHidden();
  await expect(page.getByRole("status", { name: "History editor dirty", exact: true })).toHaveText("true");
  await expect(page.getByRole("status", { name: "History entry", exact: true })).toHaveText(accepted);
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(123);
  await page.getByRole("button", { name: "Toggle history editor dirty", exact: true }).click();
});

test("replacement, copied route state and remounted adapter owners preserve entry identity", async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.set(history, Symbol.for("sheen-test-native-push"), history.pushState);
    Reflect.set(history, Symbol.for("sheen-test-native-replace"), history.replaceState);
  });
  await page.goto("/pane-restoration?page=a");
  const entry = page.getByRole("status", { name: "History entry", exact: true });
  await expect(entry).not.toHaveText("server");
  const initial = await entry.innerText();
  expect(await page.evaluate(() => history.pushState === Reflect.get(history, Symbol.for("sheen-test-native-push")))).toBe(false);
  await page.evaluate(() => Reflect.set(history, Symbol.for("sheen-test-owned-push"), history.pushState));
  const toggle = page.getByRole("button", { name: "Toggle entry observer", exact: true });
  const observer = page.getByRole("status", { name: "Observer history entry", exact: true });
  await toggle.click();
  await expect(observer).toHaveText(initial);
  expect(await page.evaluate(() => history.pushState === Reflect.get(history, Symbol.for("sheen-test-owned-push")))).toBe(true);
  await page.getByRole("button", { name: "Replace with Page B", exact: true }).click();
  await expect(page.getByRole("status", { name: "Current page", exact: true })).toHaveText("?page=b");
  await expect(entry).toHaveText(initial);
  await expect(observer).toHaveText(initial);
  await expect(page.getByRole("status", { name: "Application route state", exact: true })).toContainText("Aperture");
  expect(await page.evaluate(() => history.state)).toMatchObject({ workspace: "Aperture", account: { id: "account-42" } });
  await page.getByRole("button", { name: "Push Page B with copied state", exact: true }).click();
  await expect(entry).not.toHaveText(initial);
  const pushed = await entry.innerText();
  await expect(observer).toHaveText(pushed);
  expect(await page.evaluate(() => history.state)).toMatchObject({ workspace: "Aperture", account: { id: "account-42" } });
  await page.goBack();
  await expect(entry).toHaveText(initial);
  await expect(observer).toHaveText(initial);
  await toggle.click();
  await expect(observer).toHaveCount(0);
  await toggle.click();
  await expect(observer).toHaveText(initial);
  await page.goForward();
  await expect(entry).toHaveText(pushed);
  await expect(observer).toHaveText(pushed);
  await page.getByRole("link", { name: "Leave fixture", exact: true }).click();
  await expect(page).toHaveURL(/\/browser-status$/);
  expect(await page.evaluate(() => history.pushState === Reflect.get(history, Symbol.for("sheen-test-native-push")))).toBe(true);
  expect(await page.evaluate(() => history.replaceState === Reflect.get(history, Symbol.for("sheen-test-native-replace")))).toBe(true);
  await page.goBack();
  await expect(entry).toHaveText(pushed);
  expect(await page.evaluate(() => history.pushState === Reflect.get(history, Symbol.for("sheen-test-owned-push")))).toBe(false);
});

test("ready short results settle at the boundary and later growth cannot revive an obsolete target", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  await expect(main).toContainText("revision 1");
  await main.evaluate(element => { element.scrollTop = 700; });
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Load short Page A", exact: true }).click();
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("true");
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("false");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Expand rows", exact: true }).click();
  await expect(main).toContainText("Content 100");
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await page.goBack();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
});

test("RTL panes restore negative horizontal offsets independently of vertical position", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  await page.getByRole("button", { name: "Toggle pane direction", exact: true }).click();
  const sidebar = page.getByRole("region", { name: "Restored sidebar", exact: true });
  await expect.poll(() => sidebar.evaluate(element => element.matches(":dir(rtl)"))).toBe(true);
  await sidebar.evaluate(element => { element.scrollLeft = -200; element.scrollTop = 350; });
  await expect.poll(() => sidebar.evaluate(element => [element.scrollLeft, element.scrollTop])).toEqual([-200, 350]);
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect.poll(() => sidebar.evaluate(element => [element.scrollLeft, element.scrollTop])).toEqual([0, 0]);
  await sidebar.evaluate(element => { element.scrollLeft = -100; element.scrollTop = 150; });
  await page.goBack();
  await expect.poll(() => sidebar.evaluate(element => [element.scrollLeft, element.scrollTop])).toEqual([-200, 350]);
  await page.goForward();
  await expect.poll(() => sidebar.evaluate(element => [element.scrollLeft, element.scrollTop])).toEqual([-100, 150]);
  await page.getByRole("button", { name: "Load Page A slowly", exact: true }).click();
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("true");
  await expect.poll(() => sidebar.evaluate(element => [element.scrollLeft, element.scrollTop])).toEqual([0, 0]);
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("false");
  await expect.poll(() => sidebar.evaluate(element => [element.scrollLeft, element.scrollTop])).toEqual([-200, 350]);
});

test("removing a pane during pending restoration permits clean registration of its replacement", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(page.getByRole("region", { name: "Restored content", exact: true })).toContainText("revision 1");
  const sidebar = page.getByRole("region", { name: "Restored sidebar", exact: true });
  await sidebar.evaluate(element => { element.scrollTop = 350; element.setAttribute("data-old-pane", "yes"); });
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Load Page A slowly", exact: true }).click();
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("true");
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Toggle restored sidebar", exact: true }).click();
  await expect(sidebar).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("false");
  await page.getByRole("button", { name: "Toggle restored sidebar", exact: true }).click();
  await expect(sidebar).not.toHaveAttribute("data-old-pane", "yes");
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(350);
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(0);
});

test("hydration preserves an existing server viewport and its scroll position", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/pane-restoration?page=a", { waitUntil: "commit" });
    const main = page.getByRole("region", { name: "Restored content", exact: true });
    await main.evaluate(element => { element.scrollTop = 700; element.setAttribute("data-server", "retained"); });
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
    release();
    await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
    await expect(main).toContainText("revision 1");
    await expect(main).toHaveAttribute("data-server", "retained");
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  } finally { release(); }
});

for (const interrupt of ["none", "pointer", "wheel", "keyboard"]) {
  test(`delayed row growth with ${interrupt} interruption`, async ({ page }) => {
    await page.goto("/pane-restoration?page=a");
    const main = page.getByRole("region", { name: "Restored content", exact: true });
    await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
    await main.evaluate(element => { element.scrollTop = 700; });
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
    await page.getByRole("link", { name: "Page B", exact: true }).click();
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
    await page.getByRole("button", { name: "Load Page A slowly", exact: true }).click();
    await expect(page.getByRole("status", { name: "Current page" })).toHaveText("?page=a");
    await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("true");
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
    if (interrupt === "pointer") await main.click({ position: { x: 100, y: 150 } });
    if (interrupt === "wheel") { await main.hover({ position: { x: 100, y: 150 } }); await page.mouse.wheel(0, 100); }
    if (interrupt === "keyboard") { await main.focus(); await main.press("PageDown"); }
    await expect(page.getByRole("status", { name: "Rows loading" })).toHaveText("false");
    await expect(main).toContainText("Content 100");
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(interrupt === "none" ? 700 : 0);
  });
}

test("persistent shell restores independent pane positions and refresh leaves them alone", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  const main = page.getByRole("region", { name: "Restored content", exact: true });
  const sidebar = page.getByRole("region", { name: "Restored sidebar", exact: true });
  await main.evaluate(element => { element.scrollTop = 700; element.setAttribute("data-retained", "yes"); });
  await sidebar.evaluate(element => { element.scrollTop = 350; });
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.getByRole("button", { name: "Refresh rows" }).click();
  await expect(main).toContainText("revision 1");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect(page.getByRole("status", { name: "Current page" })).toHaveText("?page=b");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(0);
  await main.evaluate(element => { element.scrollTop = 400; });
  await sidebar.evaluate(element => { element.scrollTop = 150; });
  await page.goBack();
  await expect(page.getByRole("status", { name: "Current page" })).toHaveText("?page=a");
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(350);
  await expect(main).toHaveAttribute("data-retained", "yes");
  await page.goForward();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(400);
  await expect.poll(() => sidebar.evaluate(element => element.scrollTop)).toBe(150);
});
