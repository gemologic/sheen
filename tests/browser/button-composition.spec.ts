import { expect, test } from "@playwright/test";

test("public class recipes style native controls without private data attributes", async ({ page }) => {
  await page.goto("/button-composition");
  const wrapped = page.getByRole("button", { name: "Wrapped action", exact: true });
  const composed = page.getByRole("button", { name: "Composed action", exact: true });
  for (const property of ["background-color", "color", "border-radius", "min-height", "padding-inline-start", "padding-inline-end"]) {
    const expected = await wrapped.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
    await expect(composed).toHaveCSS(property, expected);
  }
  await expect(composed).not.toHaveAttribute("data-variant");
  await expect(composed).not.toHaveAttribute("data-tone");
  await expect(composed).not.toHaveAttribute("data-size");
  const overridden = page.getByRole("button", { name: "Overridden action", exact: true });
  await expect(overridden).toHaveCSS("min-height", "0px");
  await expect(overridden).toHaveCSS("padding-inline-start", "0px");
  await expect(overridden).toHaveCSS("padding-inline-end", "0px");
  const outline = page.getByRole("button", { name: "Outlined action", exact: true });
  const trigger = page.getByRole("button", { name: "Open composed dialog", exact: true });
  const border = await outline.evaluate(element => getComputedStyle(element).borderColor);
  await expect(trigger).toHaveCSS("border-color", border);
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Composed dialog", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
