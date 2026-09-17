import { expect, test } from "@playwright/test";

for (const density of ["compact", "comfortable"]) {
  for (const width of [375, 768, 1440]) {
    test(`German Studio ${density} controls fit at ${width}px`, async ({ page }) => {
      await page.addInitScript(density => localStorage.setItem("sheen", JSON.stringify({ density })), density);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/style-localization");
      await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
      await expect(page.getByRole("heading", { name: "Kontenübersicht" })).toBeVisible();
      const field = page.getByRole("textbox", { name: "Vollständiger Name der verantwortlichen Organisation" });
      const label = page.getByText("Vollständiger Name der verantwortlichen Organisation", { exact: true });
      expect(await label.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `/tmp/sheen-studio-german-form-${density}-${width}.png` });
      await field.fill("Internationale Forschung");
      const next = page.getByRole("button", { name: "Nächste Seite", exact: true }).filter({ visible: true });
      await next.click();
      await expect(page.getByText("Internationale Forschungsabteilung 11", { exact: true }).filter({ visible: true })).toBeVisible();
      const checkbox = page.getByRole("checkbox", { name: "Zeile konto-10 auswählen", exact: true }).filter({ visible: true });
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();
      await expect(field).toHaveValue("Internationale Forschung");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const clipped = await page.locator("main button:visible").evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent));
      expect(clipped).toEqual([]);
      await page.screenshot({ path: `/tmp/sheen-studio-german-${density}-${width}.png` });
    });
  }
}
