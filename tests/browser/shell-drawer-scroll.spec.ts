import { expect, test } from "@playwright/test";

for (const direction of ["ltr", "rtl"]) {
  test(`sidebar retains both scroll axes through scoped ${direction} drawer projection`, async ({ page }) => {
    await page.goto("/shell-scroll-wide");
    await page.getByRole("button", { name: "Refresh sidebar", exact: true }).click();
    await expect(page.getByText("Record 1, revision 1", { exact: true })).toBeVisible();
    if (direction === "rtl") await page.getByRole("button", { name: "Toggle direction", exact: true }).click();
    const pane = page.getByRole("region", { name: "Wide sidebar data", exact: true });
    await expect(pane).toHaveCSS("direction", direction);
    await pane.evaluate(element => element.setAttribute("data-retained", "true"));
    const sign = direction === "rtl" ? -1 : 1;
    await pane.hover();
    await page.mouse.wheel(sign * 250, 300);
    const position = () => pane.evaluate(element => ({ top: element.scrollTop, left: element.scrollLeft }));
    await expect.poll(position).toEqual({ top: 300, left: sign * 250 });
    await expect(pane).not.toHaveAttribute("data-scrolling");
    await page.setViewportSize({ width: 600, height: 800 });
    const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
    await toggle.click();
    const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS("direction", direction);
    await expect(pane).toHaveAttribute("data-retained", "true");
    await expect.poll(position).toEqual({ top: 300, left: sign * 250 });
    await pane.hover();
    await page.mouse.wheel(sign * 150, 200);
    await expect.poll(position).toEqual({ top: 500, left: sign * 400 });
    await expect(pane).not.toHaveAttribute("data-scrolling");
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect.poll(position).toEqual({ top: 500, left: sign * 400 });
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(drawer).toHaveCount(0);
    // The restored trigger's hoverable tooltip can cover the neighboring action.
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.getByRole("button", { name: "Shrink sidebar data", exact: true }).click();
    await toggle.click();
    await expect(drawer).toBeVisible();
    const clamped = await pane.evaluate((element, directionSign) => ({
      top: Math.min(500, element.scrollHeight - element.clientHeight),
      left: directionSign * Math.min(400, element.scrollWidth - element.clientWidth),
    }), sign);
    expect(clamped.top).toBeLessThan(500);
    expect(Math.abs(clamped.left)).toBeLessThan(400);
    await expect.poll(position).toEqual(clamped);
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await page.getByRole("button", { name: "Restore sidebar data", exact: true }).click();
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect.poll(position).toEqual(clamped);
    await page.setViewportSize({ width: 1100, height: 800 });
    await expect(drawer).toHaveCount(0);
    await expect(pane).toHaveAttribute("data-retained", "true");
    await expect.poll(position).toEqual(clamped);
  });
}

test("sidebar pane retains scroll through responsive projection and drawer reopening", async ({ page }) => {
  await page.goto("/shell");
  await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
  await expect(page.getByText("Row 1: refreshed", { exact: true })).toBeVisible();
  const pane = page.getByRole("region", { name: "Sidebar navigation", exact: true });
  await pane.evaluate(element => element.setAttribute("data-retained", "true"));
  await pane.hover();
  await page.mouse.wheel(0, 350);
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBeGreaterThan(200);
  await expect(pane).not.toHaveAttribute("data-scrolling");
  const desktopScroll = await pane.evaluate(element => element.scrollTop);
  await page.setViewportSize({ width: 600, height: 800 });
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(drawer).toBeVisible();
  await expect(pane).toHaveAttribute("data-retained", "true");
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(desktopScroll);
  await pane.hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBeGreaterThan(desktopScroll);
  await expect(pane).not.toHaveAttribute("data-scrolling");
  const phoneScroll = await pane.evaluate(element => element.scrollTop);
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(drawer).toBeVisible();
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(phoneScroll);
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(drawer).toHaveCount(0);
  await expect(pane).toHaveAttribute("data-retained", "true");
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(phoneScroll);
  // Returning to the top is a new accepted position, not a missing cache entry.
  await pane.hover();
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(0);
  await expect(pane).not.toHaveAttribute("data-scrolling");
  await page.setViewportSize({ width: 600, height: 800 });
  await toggle.click();
  await expect(drawer).toBeVisible();
  await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(0);
});

test("sidebar adopts pre-hydration scrolling before its first drawer projection", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/shell", { waitUntil: "commit" });
    const pane = page.getByRole("region", { name: "Sidebar navigation", exact: true });
    await pane.evaluate(element => element.setAttribute("data-server", "retained"));
    await pane.hover();
    await page.mouse.wheel(0, 350);
    await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(350);
    release();
    await page.getByRole("button", { name: "Refresh workspace", exact: true }).click();
    await expect(page.getByText("Row 1: refreshed", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 600, height: 800 });
    await page.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Sidebar", exact: true })).toBeVisible();
    await expect(pane).toHaveAttribute("data-server", "retained");
    await expect.poll(() => pane.evaluate(element => element.scrollTop)).toBe(350);
  } finally { release(); }
});
