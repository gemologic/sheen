import { expect, test } from "@playwright/test";

test("forced colors keep both overlay thumbs distinct and keyboard scrolling available", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/scroll-geometry");
  const viewport = page.getByRole("region", { name: "Bounded canvas", exact: true });
  await viewport.focus();
  const tracks = viewport.locator("..").locator(".sheen-scroll-track");
  await expect(tracks).toHaveCount(2);
  const schemes: ("light" | "dark")[] = ["light", "dark"];
  for (const colorScheme of schemes) {
    await page.emulateMedia({ forcedColors: "active", colorScheme });
    const foreground = await viewport.evaluate(element => getComputedStyle(element).color);
    for (const track of await tracks.all()) {
      await expect(track).toHaveCSS("opacity", "1");
      await expect(track.locator(".sheen-scroll-thumb")).toHaveCSS("background-color", foreground);
      await expect(track).not.toHaveCSS("background-color", foreground);
      await expect(track.locator(".sheen-scroll-thumb")).toHaveCSS("forced-color-adjust", "auto");
    }
  }
  await page.keyboard.press("PageDown");
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  await expect(viewport).toBeFocused();
  await expect(viewport).toHaveCSS("outline-style", "solid");
  await expect(viewport).toHaveCSS("outline-width", "2px");
});

test("disposing a captured viewport releases the pointer and a fresh instance remains draggable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/scroll-geometry");
  const viewport = page.getByRole("region", { name: "Bounded canvas", exact: true });
  const track = viewport.locator("..").locator('.sheen-scroll-track[data-axis="y"]');
  const original = await track.elementHandle();
  if (!original) throw new Error("Missing original track");
  await original.evaluate(element => element.addEventListener("gotpointercapture", event => {
    if (event instanceof PointerEvent) element.setAttribute("data-captured-pointer", String(event.pointerId));
  }));
  await page.getByRole("button", { name: "Remove viewport after request", exact: true }).click();
  await viewport.hover();
  const thumb = await track.locator(".sheen-scroll-thumb").boundingBox();
  if (!thumb) throw new Error("Missing thumb before disposal");
  await page.mouse.move(thumb.x + 4, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumb.x + 4, thumb.y + thumb.height / 2 + 10);
  await expect(track).toHaveAttribute("data-captured-pointer", /\d+/);
  await expect(viewport).toHaveCount(0);
  expect(await original.evaluate(element => element.hasPointerCapture(Number(element.getAttribute("data-captured-pointer"))))).toBe(false);
  await page.mouse.up();
  await page.getByRole("button", { name: "Restore viewport", exact: true }).click();
  await viewport.hover();
  const restored = await track.locator(".sheen-scroll-thumb").boundingBox();
  if (!restored) throw new Error("Missing fresh thumb");
  await page.mouse.move(restored.x + 4, restored.y + restored.height / 2);
  await page.mouse.down();
  await page.mouse.move(restored.x + 4, restored.y + restored.height / 2 + 80, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  expect(errors).toEqual([]);
  await original.dispose();
});

test("removing overflow during pointer capture releases drag activity and permits another drag", async ({ page }) => {
  await page.goto("/scroll-geometry");
  await page.getByRole("button", { name: "Shrink content after request", exact: true }).click();
  const viewport = page.getByRole("region", { name: "Bounded canvas", exact: true });
  const frame = viewport.locator("..");
  const vertical = frame.locator('.sheen-scroll-track[data-axis="y"]');
  await viewport.hover();
  const thumb = await vertical.locator(".sheen-scroll-thumb").boundingBox();
  if (!thumb) throw new Error("Missing thumb before shrink");
  await page.mouse.move(thumb.x + 4, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await expect(frame).toHaveAttribute("data-scrolling", "true");
  await expect(vertical).toHaveCount(0);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await expect(frame).not.toHaveAttribute("data-scrolling");
  await page.getByRole("button", { name: "Restore content height", exact: true }).click();
  await viewport.hover();
  await expect(vertical).toHaveCount(1);
  const restored = await vertical.locator(".sheen-scroll-thumb").boundingBox();
  if (!restored) throw new Error("Missing restored thumb");
  await page.mouse.move(restored.x + 4, restored.y + restored.height / 2);
  await page.mouse.down();
  await page.mouse.move(restored.x + 4, restored.y + restored.height / 2 + 80, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
});

test("overlay dragging normalizes coordinates under an ancestor scale", async ({ page }) => {
  await page.goto("/scroll-geometry");
  await page.getByRole("button", { name: "Toggle scale", exact: true }).click();
  const viewport = page.getByRole("region", { name: "Bounded canvas", exact: true });
  await viewport.hover();
  const track = viewport.locator("..").locator('.sheen-scroll-track[data-axis="y"]');
  const bounds = await track.boundingBox();
  const thumb = await track.locator(".sheen-scroll-thumb").boundingBox();
  if (!bounds || !thumb) throw new Error("Missing scaled track");
  const x = thumb.x + thumb.width / 2;
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + (bounds.height - thumb.height) / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate(element => element.scrollTop / (element.scrollHeight - element.clientHeight))).toBeCloseTo(0.5, 1);
});

test("two-axis tracks stay inside a bordered narrow viewport and move their corner in RTL", async ({ page }) => {
  await page.goto("/scroll-geometry");
  const viewport = page.getByRole("region", { name: "Bounded canvas", exact: true });
  const frame = viewport.locator("..");
  const vertical = frame.locator('.sheen-scroll-track[data-axis="y"]');
  const horizontal = frame.locator('.sheen-scroll-track[data-axis="x"]');
  await expect(vertical).toHaveCount(1);
  await expect(horizontal).toHaveCount(1);
  const geometry = async () => {
    const box = await viewport.boundingBox();
    const y = await vertical.boundingBox();
    const x = await horizontal.boundingBox();
    if (!box || !x || !y) throw new Error("Missing scroll geometry");
    return { box, x, y };
  };
  await expect.poll(async () => { const { box, y } = await geometry(); return y.x + y.width - (box.x + box.width - 6); }).toBe(0);
  const ltr = await geometry();
  expect(ltr.y.y).toBe(ltr.box.y + 6);
  expect(ltr.x.x + ltr.x.width).toBe(ltr.y.x);
  expect(ltr.y.y + ltr.y.height).toBe(ltr.x.y);
  await page.getByRole("button", { name: "Toggle viewport direction", exact: true }).click();
  await expect.poll(async () => { const { box, y } = await geometry(); return y.x - (box.x + 6); }).toBe(0);
  const rtl = await geometry();
  expect(rtl.x.x).toBe(rtl.y.x + 8);
  expect(rtl.x.x + rtl.x.width).toBe(rtl.box.x + rtl.box.width - 6);
  await viewport.hover();
  await horizontal.click({ position: { x: 15, y: 4 } });
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeLessThan(-500);
  await expect(horizontal).toHaveCSS("opacity", "1");
  await expect(vertical).toHaveCSS("opacity", "1");
  await expect(viewport).toHaveScreenshot("scroll-area-two-axis-rtl.png");
});

test("overlay tracks jump to pointer position and resize without reserving a gutter", async ({ page }) => {
  await page.goto("/scroll-area");
  const viewport = page.getByRole("region", { name: "Activity", exact: true });
  const track = viewport.locator("..").locator('.sheen-scroll-track[data-axis="y"]');
  await viewport.hover();
  const before = await track.locator(".sheen-scroll-thumb").boundingBox();
  if (!before) throw new Error("Missing thumb");
  const bounds = await track.boundingBox();
  if (!bounds) throw new Error("Missing track");
  await page.mouse.click(bounds.x + 4, bounds.y + bounds.height * 0.75);
  await expect.poll(() => viewport.evaluate(element => element.scrollTop / (element.scrollHeight - element.clientHeight))).toBeGreaterThan(0.65);
  await page.getByRole("button", { name: "Resize viewport", exact: true }).click();
  await expect(viewport).toHaveCSS("height", "360px");
  await expect.poll(async () => (await track.locator(".sheen-scroll-thumb").boundingBox())?.height ?? 0).toBeGreaterThan(before.height);
  await expect(track).toHaveCSS("width", "8px");
});

test("overlay thumbs are eight pixels, draggable, and fade after scroll idle", async ({ page }) => {
  await page.goto("/scroll-area");
  const viewport = page.getByRole("region", { name: "Activity", exact: true });
  const track = viewport.locator("..").locator('.sheen-scroll-track[data-axis="y"]');
  await viewport.hover();
  await expect(track).toHaveCSS("width", "8px");
  await expect(track).toHaveCSS("opacity", "1");
  const thumb = track.locator(".sheen-scroll-thumb");
  const bounds = await thumb.boundingBox();
  if (!bounds) throw new Error("Missing vertical thumb");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 90, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(500);
  await page.mouse.move(0, 0);
  await expect(viewport).not.toHaveAttribute("data-scrolling");
  await expect(track).toHaveCSS("opacity", "0");
  expect(await viewport.evaluate(element => {
    if (!(element instanceof HTMLElement)) throw new Error("Expected HTML viewport");
    return element.offsetWidth - element.clientWidth;
  })).toBe(0);
});

test("horizontal overlay dragging uses native RTL scroll direction", async ({ page }) => {
  await page.goto("/scroll-area");
  const viewport = page.getByRole("region", { name: "Horizontal timeline", exact: true });
  const track = viewport.locator("..").locator('.sheen-scroll-track[data-axis="x"]');
  await viewport.hover();
  await expect(track).toHaveCSS("height", "8px");
  const thumb = await track.locator(".sheen-scroll-thumb").boundingBox();
  if (!thumb) throw new Error("Missing horizontal thumb");
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumb.x + thumb.width / 2 - 140, thumb.y + thumb.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeLessThan(-100);
});

test("scroll viewports support native keyboard and wheel scrolling without refreshing away state", async ({ page }) => {
  await page.goto("/scroll-area");
  const viewport = page.getByRole("region", { name: "Activity", exact: true });
  await viewport.getByRole("textbox", { name: "Activity draft", exact: true }).fill("Retained draft");
  await viewport.evaluate(element => element.setAttribute("data-retained", "yes"));
  await viewport.focus();
  await page.keyboard.press("PageDown");
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  await expect(viewport).toHaveCSS("outline-style", "solid");
  await expect(viewport).not.toHaveAttribute("data-scrolling");
  const before = await viewport.evaluate(element => element.scrollTop);
  await page.getByRole("button", { name: "Refresh content", exact: true }).click();
  await expect(viewport).toHaveAttribute("data-retained", "yes");
  await expect(viewport).toContainText("Activity 1: refreshed");
  expect(await viewport.evaluate(element => element.scrollTop)).toBe(before);
  await viewport.hover();
  await page.mouse.wheel(0, 450);
  await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(before);
  await expect(viewport).toHaveAttribute("data-scrolling", "true");
  await page.mouse.move(0, 0);
  await expect(viewport).not.toHaveAttribute("data-scrolling");
  expect(await viewport.getByRole("textbox", { name: "Activity draft", exact: true }).inputValue()).toBe("Retained draft");
});

test("horizontal scroll follows native RTL coordinates and constrains the document", async ({ page }) => {
  await page.goto("/scroll-area");
  const viewport = page.getByRole("region", { name: "Horizontal timeline", exact: true });
  await expect(viewport).toHaveCSS("direction", "rtl");
  await viewport.hover();
  await page.mouse.wheel(-300, 0);
  await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeLessThan(-100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(viewport).toHaveCSS("overflow-y", "hidden");
});

test("scroll viewport hydrates without replacing drafts or resetting a pre-hydration scroll", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/scroll-area", { waitUntil: "commit" });
    const viewport = page.getByRole("region", { name: "Activity", exact: true });
    await viewport.getByRole("textbox", { name: "Activity draft", exact: true }).fill("Before hydration");
    await viewport.evaluate(element => element.setAttribute("data-server", "retained"));
    await viewport.hover();
    await page.mouse.wheel(0, 400);
    await expect.poll(() => viewport.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
    const before = await viewport.evaluate(element => element.scrollTop);
    await page.getByRole("button", { name: "Refresh content", exact: true }).click();
    release();
    await expect(viewport).toContainText("Activity 1: refreshed");
    await expect(viewport).toHaveAttribute("data-server", "retained");
    expect(await viewport.evaluate(element => element.scrollTop)).toBe(before);
    expect(await viewport.getByRole("textbox", { name: "Activity draft", exact: true }).inputValue()).toBe("Before hydration");
    expect(errors).toEqual([]);
  } finally { release(); }
});
