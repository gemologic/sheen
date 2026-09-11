import { expect, test } from "@playwright/test";

test("stored light prepaint survives delayed fonts, hydration, and refresh data without flashing", async ({ page }) => {
  let releaseScripts: () => void = () => {};
  let releaseFonts: () => void = () => {};
  let releaseData: () => void = () => {};
  let markFontRequested: () => void = () => {};
  let markDataRequested: () => void = () => {};
  const scriptsReleased = new Promise<void>(resolve => { releaseScripts = resolve; });
  const fontsReleased = new Promise<void>(resolve => { releaseFonts = resolve; });
  const dataReleased = new Promise<void>(resolve => { releaseData = resolve; });
  const fontRequested = new Promise<void>(resolve => { markFontRequested = resolve; });
  const dataRequested = new Promise<void>(resolve => { markDataRequested = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ mode: "light", theme: "slate", accent: "rose" })));
  await page.route("**/*", async route => {
    const request = route.request();
    if (request.resourceType() === "script") await scriptsReleased;
    else if (request.resourceType() === "font") {
      markFontRequested();
      await fontsReleased;
    } else if (request.url().includes("/api/optimistic")) {
      markDataRequested();
      await dataReleased;
    }
    await route.continue();
  });

  try {
    await page.goto("/loading-state", { waitUntil: "commit" });
    const html = page.locator("html");
    const region = page.getByRole("region", { name: "Orders", exact: true });
    const draft = region.getByRole("textbox", { name: "Order draft", exact: true });
    await expect(html).toHaveAttribute("data-sheen-mode", "light");
    await expect(html).toHaveAttribute("data-sheen-theme", "slate");
    await expect(html).toHaveAttribute("data-sheen-accent", "rose");
    await expect(region).toContainText("Initial orders");
    await draft.fill("Typed before hydration");
    await draft.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await region.evaluate(element => {
      const input = element.querySelector("input");
      if (!(input instanceof HTMLInputElement)) throw new Error("Missing order draft");
      let samples = 0;
      let failures = 0;
      const sample = () => {
        samples += 1;
        const content = element.querySelector(".sheen-loading-content");
        const style = content ? getComputedStyle(content) : undefined;
        const contentVisible = style !== undefined && style.display !== "none" && style.visibility !== "hidden";
        const root = document.documentElement;
        if (!element.isConnected || !input.isConnected || !contentVisible || root.dataset.sheenMode !== "light" || root.dataset.sheenTheme !== "slate" || root.dataset.sheenAccent !== "rose") failures += 1;
        root.dataset.hydrationRefreshSamples = String(samples);
        root.dataset.hydrationRefreshFailures = String(failures);
        if (!root.hasAttribute("data-stop-hydration-refresh")) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await page.getByRole("button", { name: "Refresh request", exact: true }).click({ force: true });
    releaseScripts();
    await dataRequested;
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(region).toHaveAttribute("aria-busy", "true");
    await expect(region).toContainText("Initial orders");
    await expect(draft).toHaveValue("Typed before hydration");
    await expect(draft).toHaveAttribute("data-server-identity", "retained");

    await fontRequested;
    releaseFonts();
    await page.evaluate(() => document.fonts.ready);
    await expect(draft).toHaveAttribute("data-server-identity", "retained");
    await expect(region).toContainText("Initial orders");

    releaseData();
    await expect(region).toHaveAttribute("aria-busy", "false");
    await expect(region).toContainText("Updated orders");
    await expect(draft).toHaveValue("Typed before hydration");
    await expect(draft).toHaveAttribute("data-server-identity", "retained");
    await html.evaluate(element => element.setAttribute("data-stop-hydration-refresh", "true"));
    await expect(html).toHaveAttribute("data-hydration-refresh-samples", /\d+/u);
    expect(Number(await html.getAttribute("data-hydration-refresh-samples"))).toBeGreaterThan(10);
    await expect(html).toHaveAttribute("data-hydration-refresh-failures", "0");
    expect(errors).toEqual([]);
  } finally {
    releaseScripts();
    releaseFonts();
    releaseData();
  }
});
