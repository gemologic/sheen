import { expect, test } from "@playwright/test";

for (const scenario of ["hidden-growth", "visible-growth", "short", "interrupted", "superseded"]) {
  test(`detached sidebar restoration waits for ${scenario} data`, async ({ page }) => {
    let release: () => void = () => {};
    const barrier = new Promise<void>(resolve => { release = resolve; });
    // Delay a real request rather than substituting a response or a timer assertion.
    await page.route("**/api/optimistic", async route => { await barrier; await route.continue(); });
    try {
      await page.goto("/pane-restoration?page=a");
      await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
      await expect(page.getByRole("region", { name: "Restored content", exact: true })).toContainText("revision 1");
      const pane = page.getByRole("region", { name: "Restored sidebar", exact: true });
      await pane.evaluate(element => element.setAttribute("data-retained", "true"));
      await pane.hover();
      await page.mouse.wheel(150, 350);
      const position = () => pane.evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop }));
      await expect.poll(position).toEqual({ left: 150, top: 350 });
      await expect(pane).not.toHaveAttribute("data-scrolling");
      await page.setViewportSize({ width: 600, height: 800 });
      await page.getByRole("link", { name: "Page B", exact: true }).click();
      await expect(page).toHaveURL(/\?page=b$/);
      await page.getByRole("button", { name: scenario === "short" ? "Load short Page A" : "Load Page A slowly", exact: true }).click();
      await expect(page).toHaveURL(/\?page=a$/);
      const loading = page.getByRole("status", { name: "Rows loading", exact: true, includeHidden: true });
      await expect(loading).toHaveText("true");
      const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
      const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
      if (scenario === "hidden-growth") {
        release();
        await expect(loading).toHaveText("false");
        await expect(drawer).toHaveCount(0);
        await toggle.click();
      } else {
        await toggle.click();
        await expect(drawer).toBeVisible();
        await expect(pane).toContainText("Sidebar 2");
        await expect(pane).not.toContainText("Sidebar 100");
        await expect.poll(position).toEqual({ left: 0, top: 0 });
        if (scenario === "interrupted") {
          await pane.focus();
          await pane.press("PageDown");
        }
        if (scenario === "superseded") {
          await page.keyboard.press("Escape");
          await expect(toggle).toBeFocused();
          await page.goForward();
          await expect(page).toHaveURL(/\?page=b$/);
          await toggle.click();
          await expect(drawer).toBeVisible();
        }
        release();
        await expect(loading).toHaveText("false");
      }
      await expect(drawer).toBeVisible();
      await expect(pane).toHaveAttribute("data-retained", "true");
      if (scenario !== "short") await expect(pane).toContainText("Sidebar 100");
      const expected = scenario === "short" || scenario === "interrupted" || scenario === "superseded" ? { left: 0, top: 0 } : { left: 150, top: 350 };
      await expect.poll(position).toEqual(expected);
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      if (scenario === "short") {
        await expect(page.getByRole("tooltip")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        await page.getByRole("button", { name: "Expand rows", exact: true }).click();
      }
      await toggle.click();
      await expect(drawer).toBeVisible();
      await expect(pane).toContainText("Sidebar 100");
      await expect.poll(position).toEqual(expected);
    } finally { release(); }
  });
}

test("route restoration wins over sidebar projection while its pane is detached", async ({ page }) => {
  await page.goto("/pane-restoration?page=a");
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(page.getByRole("region", { name: "Restored content", exact: true })).toContainText("revision 1");
  const pane = page.getByRole("region", { name: "Restored sidebar", exact: true });
  await pane.evaluate(element => element.setAttribute("data-retained", "true"));
  await pane.hover();
  await page.mouse.wheel(150, 350);
  const position = () => pane.evaluate(element => ({ left: element.scrollLeft, top: element.scrollTop }));
  await expect.poll(position).toEqual({ left: 150, top: 350 });
  await expect(pane).not.toHaveAttribute("data-scrolling");
  await page.setViewportSize({ width: 600, height: 800 });
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(drawer).toHaveCount(0);
  await toggle.click();
  await expect(drawer).toBeVisible();
  await expect.poll(position).toEqual({ left: 150, top: 350 });
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await page.getByRole("link", { name: "Page B", exact: true }).click();
  await expect(page).toHaveURL(/\?page=b$/);
  await toggle.click();
  await expect(drawer).toBeVisible();
  await expect(pane).toHaveAttribute("data-retained", "true");
  await expect.poll(position).toEqual({ left: 0, top: 0 });
  await pane.hover();
  await page.mouse.wheel(100, 200);
  await expect.poll(position).toEqual({ left: 100, top: 200 });
  await expect(pane).not.toHaveAttribute("data-scrolling");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\?page=a$/);
  await toggle.click();
  await expect(drawer).toBeVisible();
  await expect.poll(position).toEqual({ left: 150, top: 350 });
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(drawer).toHaveCount(0);
  await expect(pane).toHaveAttribute("data-retained", "true");
  await expect.poll(position).toEqual({ left: 150, top: 350 });
  await page.goForward();
  await expect(page).toHaveURL(/\?page=b$/);
  await expect.poll(position).toEqual({ left: 100, top: 200 });
});
