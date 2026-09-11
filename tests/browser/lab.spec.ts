import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const fullState = "theme=paper&mode=light&accent=rose&density=compact&radius=round&motion=reduced&direction=ltr&locale=de-DE&width=900&height=620&baselineGrid=true&spacingOutlines=true&focusRings=true&forceState=focus&colorVision=protanopia&visionBlur=1.5&performanceMeter=true";

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function toggle(page: Page, label: string): Promise<void> {
  const control = page.getByRole("switch", { name: label, exact: true });
  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).toBeChecked();
}

test("laboratory axes update retained iframe content without a blank frame and persist root preferences", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/lab");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");

  const frame = page.frameLocator('iframe[title="Full layout preview"]');
  const scope = frame.locator(".loupe-lab-preview-scope");
  const preview = frame.locator("[data-lab-preview]");
  const draft = frame.getByRole("textbox", { name: "Retained draft", exact: true });
  await expect(preview).toBeVisible();
  await draft.fill("Keep this draft");
  await preview.evaluate(element => {
    element.setAttribute("data-lab-identity", "retained");
    let count = 0;
    let stable = true;
    const inspect = (): void => {
      const bounds = element.getBoundingClientRect();
      const background = getComputedStyle(element).backgroundColor;
      stable = stable && element.isConnected && element.getAttribute("data-lab-identity") === "retained"
        && bounds.width > 0 && bounds.height > 0 && background !== "transparent" && background !== "rgba(0, 0, 0, 0)";
      count += 1;
      if (count === 20) element.setAttribute("data-frame-samples", stable ? "stable" : "blank");
      else requestAnimationFrame(inspect);
    };
    requestAnimationFrame(inspect);
  });

  await choose(page, "Theme", "Paper");
  await choose(page, "Accent", "rose");
  await choose(page, "Mode", "Light");
  await choose(page, "Density", "Compact");
  await choose(page, "Radius", "Round");
  await choose(page, "Motion", "Reduced");
  await choose(page, "Direction", "Right to left");
  await choose(page, "Locale", "Deutsch");

  await expect(page.locator("html")).toHaveAttribute("data-sheen-theme", "paper");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "rose");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
  await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
  await expect(scope).toHaveAttribute("data-sheen-accent", "rose");
  await expect(scope).toHaveAttribute("data-sheen-mode", "light");
  await expect(scope).toHaveAttribute("data-sheen-density", "compact");
  await expect(scope).toHaveAttribute("data-sheen-radius", "round");
  await expect(scope).toHaveAttribute("data-sheen-motion", "reduced");
  await expect(scope).toHaveAttribute("data-sheen-direction", "rtl");
  await expect(scope).toHaveAttribute("data-sheen-locale", "de-DE");
  await expect(frame.getByRole("status", { name: "Locale sample" })).toContainText("123.456,78");
  await expect(preview).toHaveAttribute("data-lab-identity", "retained");
  await expect(preview).toHaveAttribute("data-frame-samples", "stable");
  await expect(draft).toHaveValue("Keep this draft");
  await expect.poll(() => new URL(page.url()).searchParams.get("theme")).toBe("paper");
  await expect.poll(() => new URL(page.url()).searchParams.get("locale")).toBe("de-DE");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sheen") ?? "null"))).toMatchObject({
    theme: "paper", accent: "rose", mode: "light", density: "compact", radius: "round", motion: "reduced", locale: "de-DE",
  });

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-sheen-theme", "paper");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-accent", "rose");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "light");
  await expect(frame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-locale", "de-DE");
  expect(errors).toEqual([]);
});

test("laboratory viewport dimensions are URL-backed without reloading the iframe", async ({ page }) => {
  await page.goto("/lab");
  const frameElement = page.locator('iframe[title="Full layout preview"]');
  const frame = page.frameLocator('iframe[title="Full layout preview"]');
  const preview = frame.locator("[data-lab-preview]");
  await expect(preview).toBeVisible();
  await preview.evaluate(element => element.setAttribute("data-resize-identity", "retained"));

  await page.getByRole("spinbutton", { name: "Viewport width", exact: true }).fill("900");
  await page.getByRole("spinbutton", { name: "Viewport height", exact: true }).fill("620");
  await expect.poll(() => new URL(page.url()).searchParams.get("width")).toBe("900");
  await expect.poll(() => new URL(page.url()).searchParams.get("height")).toBe("620");
  await expect.poll(async () => (await frameElement.boundingBox())?.width).toBe(900);
  await expect.poll(async () => (await frameElement.boundingBox())?.height).toBe(620);
  await expect(preview).toHaveAttribute("data-resize-identity", "retained");
});

test("debug overlays and performance metrics update the retained preview subtree", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/lab");
  const frame = page.frameLocator('iframe[title="Full layout preview"]');
  const preview = frame.locator("[data-lab-preview]");
  const draft = frame.getByRole("textbox", { name: "Retained draft", exact: true });
  await expect(preview).toBeVisible();
  await preview.evaluate(element => element.setAttribute("data-debug-identity", "retained"));
  await draft.fill("Debug draft");

  await toggle(page, "Baseline grid");
  await toggle(page, "Spacing outlines");
  await toggle(page, "Always show focus rings");
  await choose(page, "Force state", "Hover");
  await choose(page, "Color vision", "Achromatopsia");
  await choose(page, "Reduced-vision blur", "Strong");
  await toggle(page, "Performance meter");

  await expect(preview).toHaveAttribute("data-loupe-baseline-grid", "true");
  await expect(preview).toHaveAttribute("data-loupe-spacing-outlines", "true");
  await expect(preview).toHaveAttribute("data-loupe-focus-rings", "true");
  await expect(preview).toHaveAttribute("data-loupe-force-state", "hover");
  await expect(preview).toHaveAttribute("data-loupe-color-vision", "achromatopsia");
  const visualState = await preview.evaluate(element => {
    const grid = getComputedStyle(element, "::after").backgroundImage;
    const filter = getComputedStyle(element).filter;
    return { grid, filter };
  });
  const inputStyle = await draft.evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, background: getComputedStyle(element).backgroundColor }));
  const cardOutline = await frame.locator(".sheen-card").first().evaluate(element => getComputedStyle(element).outlineStyle);
  expect(visualState.grid).toContain("repeating-linear-gradient");
  expect(visualState.filter).toContain("loupe-achromatopsia");
  expect(visualState.filter).toContain("blur(3px)");
  expect(inputStyle.outline).toBe("solid");
  expect(inputStyle.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(cardOutline).toBe("solid");
  const meter = frame.getByRole("status", { name: "Preview performance meter", exact: true });
  await expect(meter).toBeVisible();
  await expect.poll(async () => Number(await meter.getAttribute("data-fps"))).toBeGreaterThan(0);
  await expect.poll(() => new URL(page.url()).searchParams.get("colorVision")).toBe("achromatopsia");
  await expect.poll(() => new URL(page.url()).searchParams.get("visionBlur")).toBe("3");
  await expect(preview).toHaveAttribute("data-debug-identity", "retained");
  await expect(draft).toHaveValue("Debug draft");
  expect(errors).toEqual([]);
});

test("direct laboratory preview renders selected axes and retains server content through delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto(`/lab-preview?${fullState}`, { waitUntil: "commit" });
    const scope = page.locator(".loupe-lab-preview-scope");
    const preview = page.locator("[data-lab-preview]");
    const draft = page.getByRole("textbox", { name: "Retained draft", exact: true });
    await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
    await expect(scope).toHaveAttribute("data-sheen-mode", "light");
    await expect(scope).toHaveAttribute("data-sheen-accent", "rose");
    await expect(scope).toHaveAttribute("data-sheen-density", "compact");
    await expect(scope).toHaveAttribute("data-sheen-radius", "round");
    await expect(scope).toHaveAttribute("data-sheen-motion", "reduced");
    await expect(scope).toHaveAttribute("data-sheen-locale", "de-DE");
    await expect(preview).toHaveAttribute("data-loupe-baseline-grid", "true");
    await expect(preview).toHaveAttribute("data-loupe-spacing-outlines", "true");
    await expect(preview).toHaveAttribute("data-loupe-focus-rings", "true");
    await expect(preview).toHaveAttribute("data-loupe-force-state", "focus");
    await expect(preview).toHaveAttribute("data-loupe-color-vision", "protanopia");
    await expect(page.getByRole("status", { name: "Preview performance meter", exact: true })).toBeVisible();
    expect(await preview.evaluate(element => getComputedStyle(element).filter)).toContain("blur(1.5px)");
    await expect(page.getByRole("status", { name: "Locale sample" })).toContainText("123.456,78");
    await preview.evaluate(element => element.setAttribute("data-server-preview", "retained"));
    await draft.evaluate(element => element.setAttribute("data-server-input", "retained"));
    await draft.fill("Typed before hydration");
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(preview).toHaveAttribute("data-server-preview", "retained");
    await expect(draft).toHaveAttribute("data-server-input", "retained");
    await expect(draft).toHaveValue("Typed before hydration");
    await expect(scope).toHaveAttribute("data-sheen-theme", "paper");
    await expect(scope).toHaveAttribute("data-sheen-mode", "light");
    await expect(preview).toHaveAttribute("data-loupe-color-vision", "protanopia");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
