import { expect, test } from "@playwright/test";

for (const delayed of [false, true]) {
  test(`automatic shortcut platform with delayed hydration ${delayed}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "warning" && message.text().includes("computations created outside")) errors.push(message.text()); });
    const platform = await page.evaluate(() => navigator.platform);
    const mac = platform.startsWith("Mac") || ["iPhone", "iPad", "iPod"].includes(platform);
    const chord = mac ? "Meta+j" : "Control+j";
    let release: () => void = () => {};
    const barrier = new Promise<void>(resolve => { release = resolve; });
    if (delayed) await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
    try {
      await page.goto("/shortcuts-auto", { waitUntil: delayed ? "commit" : "load" });
      const binding = page.getByRole("status", { name: "Automatic binding", exact: true });
      const draft = page.getByRole("textbox", { name: "Automatic draft", exact: true });
      if (delayed) await expect(binding).toBeEmpty();
      await draft.fill("Retained automatic draft");
      await draft.evaluate(element => element.setAttribute("data-retained", "yes"));
      release();
      await expect(binding).toHaveText(mac ? "⌘+J" : "Ctrl+J");
      await expect(draft).toBeFocused();
      await expect(draft).toHaveValue("Retained automatic draft");
      await expect(draft).toHaveAttribute("data-retained", "yes");
      await page.keyboard.press(chord);
      const count = page.getByRole("status", { name: "Automatic count", exact: true });
      await expect(count).toHaveText("1");
      const toggle = page.getByRole("button", { name: "Toggle automatic provider", exact: true });
      await toggle.click();
      await expect(binding).toHaveCount(0);
      await toggle.click();
      await expect(binding).toHaveText(mac ? "⌘+J" : "Ctrl+J");
      await draft.focus();
      await page.keyboard.press(chord);
      await expect(count).toHaveText("2");
      await expect(draft).toHaveValue("Retained automatic draft");
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}
