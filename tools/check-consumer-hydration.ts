import assert from "node:assert/strict";
import { cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build, createServer } from "vite";
import solid from "vite-plugin-solid";

export async function checkConsumerHydration(root: string, ui: string): Promise<void> {
  const { sheenRuntime } = await import(pathToFileURL(join(ui, "dist/vite.js")).href);
  for (const name of ["app", "route", "client", "server"]) {
    await cp(new URL(`../tests/consumers/ui-hydration-${name}.tsx`, import.meta.url), join(root, `ui-hydration-${name}.tsx`));
  }
  await build({
    root, configFile: false, logLevel: "warn", plugins: [sheenRuntime(), solid({ ssr: true })],
    build: {
      ssr: true, outDir: join(root, "hydration-ssr"),
      rolldownOptions: { input: join(root, "ui-hydration-server.tsx"), output: { entryFileNames: "server.mjs" } },
    },
  });
  const { renderDocument } = await import(pathToFileURL(join(root, "hydration-ssr/server.mjs")).href);
  await writeFile(join(root, "index.html"), await renderDocument());
  const server = await createServer({
    root, configFile: false, logLevel: "warn", plugins: [sheenRuntime(), solid({ ssr: true })],
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  try {
    const url = server.resolvedUrls?.local[0];
    assert.ok(url, "Hydration server must expose its actual address");
    const browser = await chromium.launch();
    try {
      for (const interval of ["all-scripts", "lazy-route"]) {
        const page = await browser.newPage();
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        let release: () => void = () => {};
        const barrier = new Promise<void>(resolve => { release = resolve; });
        await page.route("**/*", async route => {
          const request = route.request();
          if (interval === "all-scripts" ? request.resourceType() === "script" : request.url().includes("/ui-hydration-route.tsx")) await barrier;
          await route.continue();
        });
        try {
          await page.goto(url, { waitUntil: "commit" });
          if (interval === "lazy-route") await expect.poll(() => page.evaluate(() => "_$DX_DELEGATE" in document)).toBe(true);
          const draft = page.getByRole("textbox", { name: "Hydration draft", exact: true });
          const save = page.getByRole("button", { name: "Save draft", exact: true });
          await draft.evaluate(element => element.setAttribute("data-server-identity", "retained"));
          await save.evaluate(element => {
            element.setAttribute("data-server-identity", "retained");
            const section = element.closest("section");
            if (!section) throw new Error("Missing hydration region");
            let frames = 0;
            let failures = 0;
            const sample = () => {
              frames += 1;
              if (!element.isConnected || !section.isConnected || getComputedStyle(section).display === "none") failures += 1;
              document.documentElement.dataset.hydrationFrames = String(frames);
              document.documentElement.dataset.hydrationFailures = String(failures);
              if (!document.documentElement.hasAttribute("data-stop-hydration")) requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          });
          await draft.hover();
          await draft.fill("Typed before the route hydrated");
          await save.click();
          await expect.poll(async () => Number(await page.locator("html").getAttribute("data-hydration-frames"))).toBeGreaterThan(3);
          release();
          await expect(page.getByLabel("Save count", { exact: true })).toHaveText("1");
          await expect(draft).toHaveValue("Typed before the route hydrated");
          await expect(draft).toHaveAttribute("data-server-identity", "retained");
          await expect(save).toHaveAttribute("data-server-identity", "retained");
          await expect(save).toBeFocused();
          await save.click();
          await expect(page.getByLabel("Save count", { exact: true })).toHaveText("2");
          await page.locator("html").evaluate(element => element.setAttribute("data-stop-hydration", "true"));
          await expect(page.locator("html")).toHaveAttribute("data-hydration-failures", "0");
          assert.deepEqual(errors, [], "Clean npm hydration must not raise browser exceptions");
          const modulePaths = [...server.environments.client.moduleGraph.idToModuleMap.keys()].map(path => path.split("?")[0] ?? path);
          assert.ok(modulePaths.some(path => path.startsWith(ui) && path.endsWith("/vendor/solid-web/dev.js")), `Development must use the owned DOM renderer; loaded modules:\n${modulePaths.filter(path => /solid|sheen/u.test(path)).join("\n")}`);
          assert.ok(!modulePaths.some(path => /\/solid-js\/web\/dist\//u.test(path)), "Development must not load the original DOM renderer");
          assert.equal(modulePaths.filter(path => /\/(?:\.vite\/deps\/solid-js\.js|solid-js\/dist\/dev\.js)$/u.test(path)).length, 1, "Development must share one reactive core");
        } finally { release(); await page.close(); }
      }
    } finally { await browser.close(); }
  } finally { await server.close(); }
  process.stdout.write("Clean npm development SSR/lazy hydration retained drafts, focus, DOM identity and exactly-once event replay\n");
}
