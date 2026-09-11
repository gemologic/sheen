import { expect, test } from "@playwright/test";

for (const key of ["ArrowDown", "Enter", "Space", "m"]) {
  test(`Select preserves pre-hydration ${key} without duplicate activation`, async ({ page }) => {
    let release: () => void = () => {};
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
    try {
      await page.goto("/select", { waitUntil: "commit" });
      const trigger = page.getByRole("button", { name: "Cadence Live", exact: true });
      await trigger.focus();
      await page.keyboard.press(key);
      release();
      if (key === "m") {
        await expect(page.getByRole("button", { name: "Cadence Manual", exact: true })).toBeFocused();
        await expect(page.getByRole("listbox")).toHaveCount(0);
      } else {
        await expect(page.getByRole("listbox", { name: "Cadence", exact: true })).toBeVisible();
        await expect(page.getByRole("option", { name: "Live", exact: true })).toBeFocused();
      }
      expect(errors).toEqual([]);
    } finally { release(); }
  });
}

test("Select keyboard, disabled/read-only ownership, native forms, and reset", async ({ page }) => {
  await page.goto("/select");
  const cadence = page.getByRole("button", { name: "Cadence Live", exact: true });
  await cadence.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Live", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Manual", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Cadence Manual", exact: true })).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Controlled Select an option", exact: true }).click();
  await page.getByRole("option", { name: "Manual", exact: true }).click();
  for (const label of ["Rejected", "Readonly"]) {
    await page.getByRole("button", { name: `${label} Live`, exact: true }).click();
    await page.getByRole("option", { name: "Manual", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: `${label} Live`, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Disabled Live", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Inspect values" }).click();
  await expect(page.getByLabel("Form values")).toHaveText('[["cadence","manual"],["controlled","manual"],["rejected","live"],["readonly","live"],["external","manual"]]');
  await page.getByRole("button", { name: "External Manual", exact: true }).click();
  await page.getByRole("option", { name: "Live", exact: true }).click();
  await page.getByRole("button", { name: "Reset selects" }).click();
  await expect(cadence).toBeVisible();
  await expect(page.getByRole("button", { name: "Controlled Manual", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "External Manual", exact: true })).toBeVisible();
  await cadence.click();
  await page.getByRole("option", { name: "Manual", exact: true }).click();
  await page.getByRole("button", { name: "Cancel reset: false" }).click();
  await page.getByRole("button", { name: "Reset selects" }).click();
  await expect(page.getByRole("button", { name: "Cadence Manual", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Validate required" }).click();
  await expect(page.getByRole("button", { name: "Required Select an option", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await page.getByRole("option", { name: "Live", exact: true }).click();
  await page.getByRole("button", { name: "Validate required" }).click();
  await expect(page.getByLabel("Form values")).toHaveText("required accepted");
});

test("Select popup inherits scoped theme and only the inner layer closes on Escape", async ({ page }) => {
  await page.goto("/select");
  await page.getByRole("button", { name: "Open scoped dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Scoped dialog" });
  const trigger = dialog.getByRole("button", { name: "Scoped cadence Live", exact: true });
  await trigger.click();
  const listbox = page.getByRole("listbox", { name: "Scoped cadence", exact: true });
  await expect(listbox).toBeVisible();
  expect(await listbox.evaluate(element => {
    const scope = element.closest("[data-sheen-portal]");
    return { theme: scope?.getAttribute("data-sheen-theme"), mode: scope?.getAttribute("data-sheen-mode"), direction: getComputedStyle(element).direction };
  })).toEqual({ theme: "paper", mode: "light", direction: "rtl" });
  await page.keyboard.press("Escape");
  await expect(listbox).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("Select supports typeahead, Home/End, repeated selection, and transient motion", async ({ page }) => {
  await page.goto("/select");
  const trigger = page.locator(".sheen-select-trigger").first();
  await trigger.focus();
  await page.keyboard.press("m");
  await expect(trigger).toHaveText("Manual▾");
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("option", { name: "Manual", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("option", { name: "Live", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "Manual", exact: true })).toBeFocused();
  await expect(page.locator(".sheen-select-content")).toHaveCSS("animation-name", "sheen-select-enter");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();
  await expect(page.locator(".sheen-select-content")).toHaveCSS("animation-duration", "0s");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("Select replays a pre-hydration click and preserves option identity during refresh", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/select", { waitUntil: "commit" });
    const trigger = page.getByRole("button", { name: "Cadence Live", exact: true });
    await expect(trigger).toHaveAccessibleDescription("Choose update frequency");
    await trigger.evaluate(element => element.setAttribute("data-server-control", "retained"));
    await trigger.click();
    release();
    await expect(page.getByRole("listbox", { name: "Cadence", exact: true })).toBeVisible();
    await expect(trigger).toHaveAttribute("data-server-control", "retained");
    const live = page.getByRole("option", { name: "Live", exact: true });
    await expect(live).toBeFocused();
    await live.evaluate(element => element.setAttribute("data-original-option", "retained"));
    await page.getByRole("button", { name: "Refresh options" }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
    await expect(live).toHaveAttribute("data-original-option", "retained");
    await expect(live).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.getByRole("button", { name: "Toggle error" }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleDescription("Choose update frequency Choose another cadence");
    await trigger.click();
    await page.getByRole("button", { name: "Remove live" }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
    await expect(page.getByRole("option", { name: "Live", exact: true })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Manual", exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Cadence Select an option", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear options" }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
    await expect(page.getByText("No results", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Cadence Select an option", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Restore options" }).evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("data-server-control", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});
