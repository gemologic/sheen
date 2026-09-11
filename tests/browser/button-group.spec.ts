import { expect, test } from "@playwright/test";

for (const direction of ["ltr", "rtl"]) {
  test(`button group wraps within a narrow ${direction} container without reordering keyboard actions`, async ({ page }) => {
    await page.goto("/button-group");
    const group = page.getByRole("group", { name: "Editing actions", exact: true });
    const save = group.getByRole("button", { name: "Save action", exact: true });
    const discard = group.getByRole("button", { name: "Discard action", exact: true });
    await save.click();
    await expect(page.getByRole("status", { name: "Action count", exact: true })).toHaveText("1");
    await save.evaluate(element => element.setAttribute("data-retained", "true"));
    if (direction === "rtl") await page.getByRole("button", { name: "Toggle group direction", exact: true }).click();
    await expect(group).toHaveCSS("direction", direction);
    const initial = await group.evaluate(element => [...element.children].map(child => child.getBoundingClientRect().y));
    expect(new Set(initial).size).toBe(1);
    await page.getByRole("button", { name: "Toggle group width", exact: true }).click();
    const boxes = await group.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.children].map(child => {
        const box = child.getBoundingClientRect();
        return { y: box.y, inside: box.left >= bounds.left && box.right <= bounds.right };
      });
    });
    expect(boxes.every(box => box.inside)).toBe(true);
    expect(new Set(boxes.map(box => box.y)).size).toBeGreaterThan(1);
    await save.focus();
    await page.keyboard.press("Tab");
    await expect(discard).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(save).toBeFocused();
    await expect(save).toHaveAttribute("data-retained", "true");
    await page.getByRole("button", { name: "Toggle group layout", exact: true }).click();
    await expect(group).toHaveCSS("flex-direction", "column");
    const vertical = await group.evaluate(element => [...element.children].map(child => child.getBoundingClientRect().y));
    expect(new Set(vertical).size).toBe(3);
    await expect(save).toHaveAttribute("data-retained", "true");
  });
}

test("button groups preserve native tab order, activation, and nodes through layout updates", async ({ page }) => {
  await page.goto("/button-group");
  const group = page.getByRole("group", { name: "Editing actions", exact: true });
  const save = group.getByRole("button", { name: "Save action", exact: true });
  await save.click();
  await expect(page.getByRole("status", { name: "Action count", exact: true })).toHaveText("1");
  await save.evaluate(element => element.setAttribute("data-retained", "true"));
  await page.getByRole("button", { name: "Before group", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(save).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status", { name: "Action count", exact: true })).toHaveText("2");
  await page.keyboard.press("Tab");
  await expect(group.getByRole("button", { name: "Discard action", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  const layout = page.getByRole("button", { name: "Toggle group layout", exact: true });
  await expect(layout).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(group).toHaveCSS("flex-direction", "column");
  await expect(save).toHaveAttribute("data-retained", "true");
  await expect(group).not.toHaveAttribute("tabindex");
});

test("button group hydrates server controls and replays one activation", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/button-group", { waitUntil: "commit" });
    const save = page.getByRole("button", { name: "Save action", exact: true });
    await save.evaluate(element => element.setAttribute("data-server", "retained"));
    await save.click();
    release();
    await expect(page.getByRole("status", { name: "Action count", exact: true })).toHaveText("1");
    await expect(save).toHaveAttribute("data-server", "retained");
    await save.press("Enter");
    await expect(page.getByRole("status", { name: "Action count", exact: true })).toHaveText("2");
  } finally { release(); }
});
