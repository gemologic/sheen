import assert from "node:assert/strict";
import { cp, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { build } from "vite";
import solid from "vite-plugin-solid";

export async function checkConsumerBrowser(temporary: string, ui: string, condition: string): Promise<void> {
  const entry = join(temporary, "ui-browser.mjs");
  await cp(new URL("../tests/consumers/ui-browser.mjs", import.meta.url), entry);
  let verified = false;
  const result = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: { write: false, rolldownOptions: { input: entry } },
    plugins: [condition === "solid" ? solid() : undefined, {
      name: "verify-runtime-package-entry",
      generateBundle(_options, bundle) {
        const modules = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.keys(output.modules) : []);
        for (const component of ["Button", "Link"]) {
          const suffix = condition === "solid" ? `/src/primitives/${component}.tsx` : `/dist/primitives/${component}.js`;
          assert.ok(modules.some(id => id.startsWith(ui) && id.endsWith(suffix)), `Browser must execute copied ${condition} ${component}`);
        }
        verified = true;
      },
    }],
  });
  assert.ok(verified, "Runtime entry verification must run");
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(value => "output" in value ? value.output : []);
  const entryChunk = outputs.find(output => output.type === "chunk" && output.isEntry);
  assert.ok(entryChunk, "Browser build needs an entry chunk");
  const assets = new Map<string, { body: string | Uint8Array; type: string }>();
  for (const output of outputs) assets.set(`/${output.fileName}`, {
    body: output.type === "chunk" ? output.code : output.source,
    type: output.fileName.endsWith(".css") ? "text/css" : "text/javascript",
  });
  const styles = outputs.filter(output => output.fileName.endsWith(".css")).map(output => `<link rel="stylesheet" href="/${output.fileName}">`).join("");
  assets.set("/", { type: "text/html", body: `<!doctype html><html lang="en" data-sheen-theme="obsidian" data-sheen-mode="dark"><head><meta charset="utf-8">${styles}</head><body><main id="consumer-root"></main><script type="module" src="/${entryChunk.fileName}"></script></body></html>` });
  const server = createServer((request, response) => {
    const asset = assets.get(request.url ?? "/");
    if (!asset) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "content-type": asset.type, "cache-control": "no-store" });
    response.end(asset.body);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${address.port}/`);
        const action = page.getByRole("button", { name: "Consumer action", exact: true });
        await expect(action).toHaveText("Count 0");
        await expect(action).toHaveCSS("min-height", "30px");
        await action.evaluate(element => element.setAttribute("data-retained", "true"));
        await action.press("Enter");
        await expect(action).toHaveText("Count 1");
        await action.press("Space");
        await expect(action).toHaveText("Count 2");
        await expect(action).toBeFocused();
        await page.getByRole("button", { name: "Toggle pending", exact: true }).click();
        await expect(action).toBeDisabled();
        await expect(action).toHaveAttribute("aria-busy", "true");
        await action.evaluate(element => { if (element instanceof HTMLButtonElement) element.click(); });
        await expect(action).toHaveText("Count 2");
        await page.getByRole("button", { name: "Toggle pending", exact: true }).click();
        await expect(action).toBeEnabled();
        await expect(action).toHaveAttribute("data-retained", "true");
        const link = page.getByRole("link", { name: "Consumer destination", exact: true });
        await expect(link).toHaveCSS("display", "inline-flex");
        await link.press("Space");
        await expect(page).not.toHaveURL(/#consumer-target$/);
        await link.press("Enter");
        await expect(page).toHaveURL(/#consumer-target$/);
        assert.deepEqual(errors, [], "Consumer must not produce browser exceptions");
        await context.tracing.stop();
      } catch (error) {
        const artifacts = fileURLToPath(new URL("../test-results/consumers/", import.meta.url));
        await mkdir(artifacts, { recursive: true });
        await context.tracing.stop({ path: join(artifacts, `${condition}.zip`) });
        throw error;
      } finally { await context.close(); }
    } finally { await browser.close(); }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  process.stdout.write(`Isolated ${condition} client bundle passed native Chromium interaction checks\n`);
}
