import { expect, test } from "@playwright/test";

for (const phone of [false, true]) {
test(`sidebar Select dismisses and reopens across a breakpoint from phone ${phone}`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: phone ? 600 : 1100, height: 800 });
  await page.goto("/shell-sidebar-controlled");
  const toggle = page.getByRole("button", { name: "Toggle sidebar", exact: true });
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Sidebar", exact: true });
  if (phone) await expect(drawer).toBeVisible();
  else await expect(page.getByRole("status", { name: "Sidebar proposals", exact: true })).toHaveText("1");
  const trigger = page.getByRole("button", { name: "Sidebar cadence Live", exact: true });
  await trigger.evaluate(element => element.setAttribute("data-retained", "true"));
  await trigger.click();
  const listbox = page.getByRole("listbox", { name: "Sidebar cadence", exact: true });
  await expect(page.getByRole("option", { name: "Live", exact: true })).toBeFocused();
  await page.setViewportSize({ width: phone ? 1100 : 600, height: 800 });
  await expect(drawer).toHaveCount(0);
  await expect(listbox).toHaveCount(0);
  if (!phone) { await toggle.click(); await expect(drawer).toBeVisible(); }
  await expect(trigger).toHaveAttribute("data-retained", "true");
  await trigger.click();
  await expect(page.getByRole("option", { name: "Live", exact: true })).toBeFocused();
  if (!phone) {
    const order = await listbox.evaluate(element => {
      const content = element.closest(".sheen-select-content");
      const dialog = element.ownerDocument.querySelector(".sheen-shell-drawer");
      return { select: content ? getComputedStyle(content).zIndex : "missing", pointer: content ? getComputedStyle(content).pointerEvents : "missing", positioner: content?.parentElement ? getComputedStyle(content.parentElement).zIndex : "missing", drawer: dialog ? getComputedStyle(dialog).zIndex : "missing" };
    });
    expect(Number(order.select), JSON.stringify(order)).toBeGreaterThan(Number(order.drawer));
    expect(Number(order.positioner), JSON.stringify(order)).toBeGreaterThan(Number(order.drawer));
    expect(order.pointer, JSON.stringify(order)).toBe("auto");
  }
  await page.getByRole("option", { name: "Manual", exact: true }).click();
  const selected = page.getByRole("button", { name: "Sidebar cadence Manual", exact: true });
  await expect(selected).toBeFocused();
  await expect(listbox).toHaveCount(0);
  await selected.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Manual", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(selected).toBeFocused();
  if (!phone) {
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Close", exact: true }).click();
    await expect(toggle).toBeFocused();
    await expect(drawer).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
}
