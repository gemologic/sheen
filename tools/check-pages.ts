import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pagesRoutes } from "../apps/loupe/src/pages-routes.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "apps", "loupe", ".output");
const publicDirectory = join(output, "public");

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function htmlPath(route: string): string {
  if (route === "/") return join(publicDirectory, "index.html");
  return join(publicDirectory, ...route.slice(1).split("/"), "index.html");
}

async function assertAbsent(path: string): Promise<void> {
  try {
    await access(path);
  } catch (error: unknown) {
    if (record(error) && error.code === "ENOENT") return;
    throw error;
  }
  assert.fail(`${path} must not exist in the static Pages artifact`);
}

for (const route of pagesRoutes) {
  const html = await readFile(htmlPath(route), "utf8");
  assert.match(html, /<div id="app">/u, `${route} is missing complete server markup`);
  assert.doesNotMatch(html, /src="\/api\//u, `${route} references a server API resource`);
}

const landing = await readFile(htmlPath("/"), "utf8");
assert.match(landing, /<h1 id="loupe-home-heading">Build the application, then inspect every seam\.<\/h1>/u);
assert.match(
  landing,
  /<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/sheen\.gemologic\.dev\/")[^>]*>/u,
);
assert.match(landing, /href="https:\/\/github\.com\/gemologic\/sheen"/u);
assert.doesNotMatch(landing, /href="\/gallery"/u, "The static landing page must not advertise server-backed gallery routes");
await access(join(publicDirectory, ".nojekyll"));
for (const name of ["llms.txt", "llms-full.txt"]) {
  const expected = await readFile(join(root, name));
  assert.ok(expected.length > 0, `${name} must contain generated agent guidance`);
  assert.deepEqual(await readFile(join(publicDirectory, name)), expected, `${name} is missing or stale in the static Pages artifact`);
}
await assertAbsent(join(output, "server"));
await assertAbsent(join(publicDirectory, "api"));

process.stdout.write(`GitHub Pages artifact contains ${pagesRoutes.length} static routes and current compact/full agent guidance with no server output.\n`);
