import { expect, test } from "@playwright/test";

test("skeletons reserve token geometry without animation or keyboard stops", async ({ page }) => {
  await page.goto("/loading");
  await expect(page.getByTestId("text")).toHaveCSS("height", "20px");
  await expect(page.getByTestId("rectangle")).toHaveCSS("height", "36px");
  await expect(page.getByTestId("circle")).toHaveCSS("width", "36px");
  await expect(page.getByTestId("circle")).toHaveCSS("border-radius", "50%");
  await expect(page.getByTestId("hidden")).toBeHidden();
  for (const element of await page.locator(".sheen-skeleton").all()) {
    await expect(element).toHaveAttribute("aria-hidden", "true");
    await expect(element).toHaveAttribute("inert", "");
    await expect(element).toHaveCSS("animation-name", "none");
  }
  await page.getByRole("button", { name: "Toggle theme" }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Following action" })).toBeFocused();
  const placeholder = page.getByTestId("text");
  await placeholder.evaluate(element => element.setAttribute("data-identity", "retained"));
  const dark = await placeholder.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(placeholder).toHaveAttribute("data-identity", "retained");
  await expect(placeholder).not.toHaveCSS("background-color", dark);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(placeholder).toHaveCSS("animation-name", "none");
});

test("skeleton hydration retains server DOM and geometry", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/loading", { waitUntil: "commit" });
    const placeholder = page.getByTestId("text");
    await expect(placeholder).toBeVisible();
    const empty = page.getByTestId("empty-state");
    await expect(empty).toBeVisible();
    const headingId = await empty.getAttribute("aria-labelledby");
    const spinner = page.getByTestId("spinner");
    await expect(spinner).toBeVisible();
    await spinner.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await empty.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await placeholder.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    const bounds = await placeholder.boundingBox();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(placeholder).toHaveAttribute("data-server-identity", "retained");
    expect(await placeholder.boundingBox()).toEqual(bounds);
    await expect(empty).toHaveAttribute("data-server-identity", "retained");
    await expect(empty).toHaveAttribute("aria-labelledby", headingId ?? "");
    await expect(spinner).toHaveAttribute("data-server-identity", "retained");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("spinners expose localized status content and honor scoped and OS reduced motion", async ({ page }) => {
  await page.goto("/loading");
  const spinner = page.getByTestId("spinner");
  await expect(spinner).toHaveAttribute("role", "status");
  await expect(spinner).toContainText("Loading orders");
  await expect(spinner).toHaveCSS("width", "16px");
  await expect(page.getByTestId("decorative-spinner")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByTestId("decorative-spinner")).not.toHaveAttribute("role");
  await expect(page.getByTestId("decorative-spinner")).toHaveCSS("width", "14px");
  await expect(page.getByTestId("reduced-spinner")).toHaveCSS("width", "20px");
  const mark = spinner.locator(".sheen-spinner-mark");
  await expect(mark).toHaveCSS("animation-duration", "0.25s");
  await expect(page.getByTestId("reduced-spinner").locator(".sheen-spinner-mark")).toHaveCSS("animation-duration", "0s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(mark).toHaveCSS("animation-duration", "0s");
  const transforms = await mark.evaluate(async element => {
    const before = getComputedStyle(element).transform;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return [before, getComputedStyle(element).transform];
  });
  expect(transforms[0]).toEqual(transforms[1]);
});

test("empty outcomes retain region identity and focused recovery actions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/loading");
  const region = page.getByRole("region", { name: "No results", exact: true });
  await expect(region).toBeVisible();
  const id = await region.getAttribute("aria-labelledby");
  expect(id).toBeTruthy();
  await expect(region).not.toHaveAttribute("aria-live");
  await region.evaluate(element => element.setAttribute("data-identity", "retained"));
  const action = page.getByRole("button", { name: "Clear filters" });
  await action.focus();
  await page.keyboard.press("Enter");
  const empty = page.getByRole("region", { name: "Nothing here yet", exact: true });
  await expect(empty).toHaveAttribute("data-kind", "empty");
  await expect(empty).toHaveAttribute("data-identity", "retained");
  await expect(empty).toHaveAttribute("aria-labelledby", id ?? "");
  await expect(action).toBeFocused();
  await expect(empty).toContainText("Try another symbol");
  expect(errors).toEqual([]);
});
