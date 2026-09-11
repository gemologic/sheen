import { expect, test } from "@playwright/test";

for (const direction of ["ltr", "rtl"]) {
  test(`icon sizes and focused theme changes respect ${direction} scopes at every density`, async ({ page }) => {
    await page.goto("/icon-button");
    const action = page.getByRole("button", { name: "More actions", exact: true });
    await action.click();
    await expect(page.getByRole("status", { name: "Icon activation count", exact: true })).toHaveText("1");
    if (direction === "rtl") await page.getByRole("button", { name: "Toggle icon direction", exact: true }).click();
    await action.evaluate(element => element.setAttribute("data-retained", "true"));
    for (const density of ["Compact", "Comfortable", "Spacious"]) {
      await page.getByRole("button", { name: `${density} icons`, exact: true }).click();
      for (const name of ["More actions", "Extra small action", "Small action", "Large action"]) {
        const button = page.getByRole("button", { name, exact: true });
        await expect(button).toHaveCSS("direction", direction);
        const geometry = await button.evaluate(element => {
          const style = getComputedStyle(element);
          const size = element.getAttribute("data-size") ?? "md";
          const bounds = element.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height, expected: Number.parseFloat(style.getPropertyValue(`--sheen-control-h-${size}`)) };
        });
        expect(geometry.width).toBe(geometry.expected);
        expect(geometry.height).toBe(geometry.expected);
      }
      await action.focus();
      await expect(page.getByRole("tooltip", { name: "More actions", exact: true })).toBeVisible();
      const initialColor = await action.evaluate(element => getComputedStyle(element).color);
      await action.press("Alt+t");
      await expect(action).toBeFocused();
      await expect(action).toHaveAttribute("data-retained", "true");
      await expect(action).not.toHaveCSS("color", initialColor);
      const tooltip = page.getByRole("tooltip", { name: "More actions", exact: true });
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveCSS("direction", direction);
      const expectedTheme = density === "Comfortable" ? "obsidian" : "paper";
      expect(await action.evaluate(element => element.closest("[data-sheen-theme]")?.getAttribute("data-sheen-theme"))).toBe(expectedTheme);
      expect(await tooltip.evaluate(element => element.closest("[data-sheen-portal]")?.getAttribute("data-sheen-theme"))).toBe(expectedTheme);
      await action.press("Escape");
      await expect(tooltip).toHaveCount(0);
    }
    await expect(page.getByRole("status", { name: "Icon activation count", exact: true })).toHaveText("1");
  });
}

test("icon actions preserve native form submitters, reset, and loading exclusion", async ({ page }) => {
  await page.goto("/icon-button");
  await page.getByRole("button", { name: "More actions", exact: true }).click();
  await expect(page.getByRole("status", { name: "Icon activation count", exact: true })).toHaveText("1");
  const form = page.getByRole("form", { name: "Icon actions form", exact: true });
  const draft = form.getByRole("textbox", { name: "Icon form draft", exact: true });
  const submit = form.getByRole("button", { name: "Submit icon form", exact: true });
  const result = page.getByRole("status", { name: "Icon form submission", exact: true });
  await draft.fill("Submitted value");
  await submit.focus();
  await submit.press("Enter");
  await expect(result).toHaveText('[["draft","Submitted value"],["operation","save"]]');
  await page.getByRole("button", { name: "Toggle icon loading", exact: true }).click();
  await expect(submit).toBeDisabled();
  await draft.fill("Must not submit");
  await submit.evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
  await draft.press("Enter");
  await expect(result).toHaveText('[["draft","Submitted value"],["operation","save"]]');
  await form.getByRole("button", { name: "Reset icon form", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(draft).toHaveValue("Initial value");
  await page.getByRole("button", { name: "Toggle icon loading", exact: true }).click();
  await submit.press("Space");
  await expect(result).toHaveText('[["draft","Initial value"],["operation","save"]]');
});

test("icon buttons have matching tooltip names, square sizes, and native loading guards", async ({ page }) => {
  await page.goto("/icon-button");
  const action = page.getByRole("button", { name: "More actions", exact: true });
  await action.click();
  const count = page.getByRole("status", { name: "Icon activation count", exact: true });
  await expect(count).toHaveText("1");
  await action.evaluate(element => element.setAttribute("data-retained", "true"));
  await action.focus();
  await expect(page.getByRole("tooltip", { name: "More actions", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  for (const name of ["More actions", "Extra small action", "Small action", "Large action"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBe(box?.height);
  }
  const svg = await page.getByRole("button", { name: "Extra small action", exact: true }).locator("svg").boundingBox();
  expect(svg?.width).toBeLessThanOrEqual(16);
  expect(svg?.height).toBeLessThanOrEqual(16);
  await page.getByRole("button", { name: "Toggle icon loading", exact: true }).click();
  await expect(action).toBeDisabled();
  await expect(action).toHaveAttribute("aria-busy", "true");
  await action.evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
  await expect(count).toHaveText("1");
  await page.getByRole("button", { name: "Toggle icon loading", exact: true }).click();
  await page.getByRole("button", { name: "Rename action", exact: true }).click();
  const renamed = page.getByRole("button", { name: "Additional actions", exact: true });
  await expect(renamed).toHaveAttribute("data-retained", "true");
  await renamed.focus();
  await expect(page.getByRole("tooltip", { name: "Additional actions", exact: true })).toBeVisible();
  await renamed.press("Space");
  await expect(count).toHaveText("2");
});

test("icon button hydrates its named server control and replays activation once", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/icon-button", { waitUntil: "commit" });
    const action = page.getByRole("button", { name: "More actions", exact: true });
    await action.evaluate(element => element.setAttribute("data-server", "retained"));
    await action.click();
    release();
    await expect(page.getByRole("status", { name: "Icon activation count", exact: true })).toHaveText("1");
    await expect(action).toHaveAttribute("data-server", "retained");
    await action.press("Enter");
    await expect(page.getByRole("status", { name: "Icon activation count", exact: true })).toHaveText("2");
  } finally { release(); }
});
