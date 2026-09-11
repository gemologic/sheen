import { expect, test } from "@playwright/test";

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
  await main.evaluate(element => { element.scrollTop = 700; });
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole("link", { name: "Page A", exact: true }).click();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
  await main.evaluate(element => { element.scrollTop = 200; });
  await page.goBack(); await page.goBack();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(700);
  await page.goForward(); await page.goForward();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(200);
  await page.goBack();
  await page.getByRole("link", { name: "Page A", exact: true }).click();
  await expect.poll(() => main.evaluate(element => element.scrollTop)).toBe(0);
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
