import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}

async function observeNativeScrollSubscriptions(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.documentElement;
    root.setAttribute("data-scroll-listener-registrations", "0");
    const register = EventTarget.prototype.addEventListener;
    // Observe real positioning subscriptions without replacing native behavior.
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
      if (type === "scroll") root.setAttribute("data-scroll-listener-registrations", String(Number(root.getAttribute("data-scroll-listener-registrations")) + 1));
      register.call(this, type, listener, options);
    };
  });
}

for (const label of ["Root", "Scoped"]) {
  test(`${label} color-only changes retain the focused form without rebuilding positioning subscriptions`, async ({ page }) => {
    await page.goto("/theme-reactivity");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await page.getByRole("button", { name: `Open ${label} theme form`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `${label} theme form`, exact: true });
    const draft = dialog.getByRole("textbox", { name: `${label} draft`, exact: true });
    await draft.fill("Retained themed draft");
    await draft.focus();
    await dialog.evaluate(element => element.setAttribute("data-theme-retained", "true"));
    await draft.evaluate(element => element.setAttribute("data-theme-retained", "true"));
    await settle(page);
    await observeNativeScrollSubscriptions(page);
    const target = label === "Root" ? page.locator("html") : page.locator(".loupe-theme-reactivity-scope");
    for (const axis of ["theme", "accent", "mode"]) {
      const before = await target.getAttribute(`data-sheen-${axis}`);
      await dialog.getByRole("button", { name: `${label} ${axis}`, exact: true }).evaluate(element => {
        if (!(element instanceof HTMLButtonElement)) throw new Error("Expected a theme control button");
        element.click();
      });
      await expect(target).not.toHaveAttribute(`data-sheen-${axis}`, before ?? "");
      await settle(page);
      await expect(page.locator("html"), `${axis} must not restart floating-layer positioning`).toHaveAttribute("data-scroll-listener-registrations", "0");
      await expect(dialog).toHaveAttribute("data-theme-retained", "true");
      await expect(draft).toHaveAttribute("data-theme-retained", "true");
      await expect(draft).toHaveValue("Retained themed draft");
      await expect(draft).toBeFocused();
    }
  });

  test(`${label} locale and direction changes still update the retained floating form`, async ({ page }) => {
    await page.goto("/theme-reactivity");
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await page.getByRole("button", { name: `Open ${label} theme form`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `${label} theme form`, exact: true });
    await dialog.evaluate(element => element.setAttribute("data-theme-retained", "true"));
    await settle(page);
    await observeNativeScrollSubscriptions(page);
    await dialog.getByRole("button", { name: `${label} locale`, exact: true }).click();
    await expect(dialog.getByLabel(`${label} number`, { exact: true })).toHaveText("12.345,5");
    await settle(page);
    await expect(page.locator("html")).toHaveAttribute("data-scroll-listener-registrations", "0");
    await dialog.getByRole("button", { name: `${label} direction`, exact: true }).click();
    await expect.poll(() => dialog.evaluate(element => getComputedStyle(element).direction)).toBe("rtl");
    await settle(page);
    expect(Number(await page.locator("html").getAttribute("data-scroll-listener-registrations"))).toBeGreaterThan(0);
    await expect(dialog).toHaveAttribute("data-theme-retained", "true");
    await dialog.getByRole("button", { name: `${label} selection First option`, exact: true }).click();
    await page.getByRole("option", { name: "Second option", exact: true }).click();
    await expect(dialog.getByRole("button", { name: `${label} selection Second option`, exact: true })).toBeVisible();
  });
}
