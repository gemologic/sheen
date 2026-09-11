import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

test("cold and refresh indicators respect native-clock thresholds and reset on phase changes", async ({ page }) => {
  await page.goto("/loading-state");
  const region = page.getByRole("region", { name: "Orders", exact: true });
  await region.evaluate(element => {
    let started = 0;
    let expected = "";
    document.addEventListener("click", event => {
      if (!(event.target instanceof Element)) return;
      const label = event.target.closest("button")?.textContent;
      if (label !== "Hold cold" && label !== "Hold refresh") return;
      expected = label === "Hold cold" ? "cold" : "refresh";
      started = performance.now();
      element.removeAttribute(`data-first-${expected}`);
    }, true);
    const observer = new MutationObserver(() => {
      if (!started || element.getAttribute("data-phase") !== expected || element.hasAttribute(`data-first-${expected}`)) return;
      const target = element.querySelector(expected === "cold" ? ".sheen-loading-fallback" : ".sheen-loading-progress");
      if (!target) return;
      const style = getComputedStyle(target);
      if (style.display !== "none" && style.visibility !== "hidden") element.setAttribute(`data-first-${expected}`, String(performance.now() - started));
    });
    observer.observe(element, { subtree: true, attributes: true, attributeFilter: ["data-phase", "hidden", "style"] });
  });
  await page.getByRole("button", { name: "Hold cold", exact: true }).click();
  await expect(region).toHaveAttribute("data-first-cold", /\d/);
  expect(Number(await region.getAttribute("data-first-cold"))).toBeGreaterThanOrEqual(200);
  await page.getByRole("button", { name: "Hold refresh", exact: true }).click();
  await expect(region).toHaveAttribute("data-first-refresh", /\d/);
  expect(Number(await region.getAttribute("data-first-refresh"))).toBeGreaterThanOrEqual(500);
  await page.getByRole("button", { name: "Finish loading", exact: true }).click();
  await expect(region.locator(".sheen-loading-progress")).toBeHidden();
  await page.getByRole("button", { name: "Hold cold", exact: true }).click();
  await page.getByRole("button", { name: "Hold refresh", exact: true }).click();
  await expect(region).toHaveAttribute("data-first-refresh", /\d/);
  expect(Number(await region.getAttribute("data-first-refresh"))).toBeGreaterThanOrEqual(500);
});

test("disposing before the cold timer expires leaves detached markup unchanged and remounts cleanly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/loading-state");
  const region = page.getByRole("region", { name: "Orders", exact: true });
  const fallback = await region.locator(".sheen-loading-fallback").elementHandle();
  if (!fallback) throw new Error("Missing original fallback");
  await page.getByRole("button", { name: "Hold cold", exact: true }).click();
  await page.getByRole("button", { name: "Toggle loading region", exact: true }).click();
  await expect(region).toHaveCount(0);
  expect(await fallback.evaluate(element => element.getAttribute("style"))).toMatch(/visibility:\s*hidden/);
  await page.evaluate(async () => {
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
    if (!response.ok) throw new Error("Disposal observation request failed");
  });
  expect(await fallback.evaluate(element => element.getAttribute("style"))).toMatch(/visibility:\s*hidden/);
  await page.getByRole("button", { name: "Toggle loading region", exact: true }).click();
  await expect(region.locator(".sheen-loading-fallback")).toHaveCSS("visibility", "visible");
  await page.getByRole("button", { name: "Finish loading", exact: true }).click();
  await expect(region.getByRole("textbox")).toBeVisible();
  expect(errors).toEqual([]);
  await fallback.dispose();
});

async function observeFrames(region: Locator) {
  await region.evaluate(element => {
    const samples: { phase: string | undefined; fallback: boolean; content: boolean; progress: boolean; height: string | undefined; animation: string | undefined }[] = [];
    const visible = (selector: string) => {
      const child = element.querySelector(selector);
      if (!child) return false;
      const style = getComputedStyle(child);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    const sample = () => {
      const progress = element.querySelector(".sheen-loading-progress");
      const mark = progress?.querySelector("span");
      samples.push({ phase: element.getAttribute("data-phase") ?? undefined, fallback: visible(".sheen-loading-fallback"), content: visible(".sheen-loading-content"), progress: visible(".sheen-loading-progress"), height: progress ? getComputedStyle(progress).height : undefined, animation: mark ? getComputedStyle(mark).animationName : undefined });
      if (element.hasAttribute("data-stop-frames")) element.setAttribute("data-frames", JSON.stringify(samples));
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

test("cold loading reserves layout before its delayed skeleton and reveals accepted content", async ({ page }) => {
  await page.goto("/loading-state");
  const region = page.getByRole("region", { name: "Orders", exact: true });
  const before = await region.boundingBox();
  await page.getByRole("button", { name: "Cold request", exact: true }).click();
  await expect(region).toHaveAttribute("aria-busy", "true");
  await expect(region.locator(".sheen-loading-content")).toBeHidden();
  await expect(region.locator(".sheen-loading-fallback")).toHaveCSS("visibility", "visible");
  expect(await region.boundingBox()).toEqual(before);
  await expect(region).toHaveAttribute("aria-busy", "false");
  await expect(region).toContainText("Updated orders");
  await expect(region.locator(".sheen-loading-fallback")).toBeHidden();
  expect(await region.boundingBox()).toEqual(before);
});

test("refresh and failure never replace content with skeletons or blank frames", async ({ page }) => {
  await page.goto("/loading-state");
  const region = page.getByRole("region", { name: "Orders", exact: true });
  const draft = region.getByRole("textbox", { name: "Order draft", exact: true });
  await draft.fill("Retained draft");
  await draft.evaluate(element => element.setAttribute("data-original", "retained"));
  await observeFrames(region);
  await page.getByRole("button", { name: "Refresh request", exact: true }).click();
  await expect(region).toHaveAttribute("aria-busy", "false");
  await expect(region).toContainText("Updated orders");
  await page.getByRole("button", { name: "Toggle reduced motion", exact: true }).click();
  await page.getByRole("button", { name: "Fail refresh", exact: true }).click();
  await expect(region).toHaveAttribute("aria-busy", "false");
  await region.evaluate(element => element.setAttribute("data-stop-frames", "true"));
  await expect(region).toHaveAttribute("data-frames", /refresh/);
  const samples: unknown = JSON.parse(await region.getAttribute("data-frames") ?? "null");
  if (!Array.isArray(samples)) throw new Error("Missing frame samples");
  expect(samples.length).toBeGreaterThan(10);
  expect(samples).toEqual(expect.arrayContaining([
    expect.objectContaining({ progress: true, height: "2px", animation: "sheen-loading-progress" }),
    expect.objectContaining({ progress: true, height: "2px", animation: "none" }),
  ]));
  for (const sample of samples) {
    expect(sample).toMatchObject({ content: true, fallback: false });
  }
  await expect(draft).toHaveValue("Retained draft");
  await expect(draft).toHaveAttribute("data-original", "retained");
  await expect(region).toContainText("Updated orders");
});

test("immediate refresh cancels pending indicators and delayed hydration preserves the draft", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/loading-state", { waitUntil: "commit" });
    const region = page.getByRole("region", { name: "Orders", exact: true });
    const draft = region.getByRole("textbox", { name: "Order draft", exact: true });
    await draft.fill("Before hydration");
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    await page.getByRole("button", { name: "Refresh request", exact: true }).click();
    release();
    await expect(region).toContainText("Updated orders");
    await expect(draft).toHaveValue("Before hydration");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await observeFrames(region);
    await page.getByRole("button", { name: "Immediate refresh", exact: true }).click();
    await expect(region).toHaveAttribute("aria-busy", "false");
    await page.evaluate(async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (!response.ok) throw new Error("Observation request failed");
    });
    await region.evaluate(element => element.setAttribute("data-stop-frames", "true"));
    await expect(region).toHaveAttribute("data-frames", /idle/);
    const samples: unknown = JSON.parse(await region.getAttribute("data-frames") ?? "null");
    if (!Array.isArray(samples)) throw new Error("Missing immediate refresh samples");
    expect(samples.length).toBeGreaterThan(10);
    for (const sample of samples) expect(sample).toMatchObject({ content: true, fallback: false, progress: false });
    expect(errors).toEqual([]);
  } finally { release(); }
});
