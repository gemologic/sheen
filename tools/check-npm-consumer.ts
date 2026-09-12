import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { publicPackageDirectories } from "./public-packages.ts";
import { checkConsumerBrowser } from "./check-consumer-browser.ts";
import { checkConsumerHydration } from "./check-consumer-hydration.ts";

interface PackResult {
  readonly name: string;
  readonly version: string;
  readonly filename: string;
}

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "sheen-npm-consumer-"));
const tarballDirectory = join(temporary, "tarballs");
const consumerDirectory = join(temporary, "consumer");

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function packResult(value: unknown): value is PackResult {
  return record(value) && typeof value.name === "string" && typeof value.version === "string" && typeof value.filename === "string";
}

async function execute(command: string, arguments_: readonly string[], cwd: string): Promise<string> {
  const result = await run(command, arguments_, { cwd, maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  return result.stdout;
}

const browserConsumer = `
export { Button, FileDropzone } from "@gemologic/sheen";
export { SearchIcon } from "@gemologic/sheen-icons/icons/search";
export { DatePicker } from "@gemologic/sheen-date";
export { DataTable } from "@gemologic/sheen-table";
export { AdminApp } from "@gemologic/sheen-patterns/admin";
export { LineChart } from "@gemologic/sheen-charts";
export { CodeBlock } from "@gemologic/sheen-code";
import "@gemologic/sheen-tokens/core.css";
import "@gemologic/sheen-tokens/themes/obsidian.css";
import "@gemologic/sheen-tokens/accents/jade.css";
import "@gemologic/sheen/styles.css";
import "@gemologic/sheen-icons/styles.css";
import "@gemologic/sheen-date/styles.css";
import "@gemologic/sheen-table/styles.css";
import "@gemologic/sheen-patterns/styles.css";
import "@gemologic/sheen-patterns/admin/styles.css";
import "@gemologic/sheen-charts/styles.css";
import "@gemologic/sheen-code/styles.css";
`;

function nodeConsumer(expectedVersion: string): string {
  return `
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildTheme } from "@gemologic/sheen-tokens";
import { appScaffold } from "@gemologic/sheen-cli";
import sheen from "eslint-plugin-sheen";
import * as ownedServer from "@gemologic/sheen/solid-web";
import * as peerServer from "solid-js/web";
import { provideRequestEvent } from "solid-js/web/storage";

assert.equal(ownedServer.RequestContext, peerServer.RequestContext);
assert.equal(ownedServer.renderToString, peerServer.renderToString);
const require = createRequire(import.meta.url);
const ownedCommonJS = require("@gemologic/sheen/solid-web");
const peerCommonJS = require("solid-js/web");
assert.equal(ownedCommonJS.RequestContext, peerCommonJS.RequestContext);
assert.equal(ownedCommonJS.renderToString, peerCommonJS.renderToString);
assert.equal(ownedServer.getRequestEvent(), undefined);
await Promise.all(["first", "second"].map(id => {
  const event = { request: new Request("https://consumer.example/" + id) };
  return provideRequestEvent(event, async () => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ownedServer.getRequestEvent(), event);
    assert.equal(peerServer.getRequestEvent(), event);
  });
}));
assert.equal(ownedServer.getRequestEvent(), undefined);

assert.equal(typeof buildTheme, "function");
assert.equal(typeof appScaffold, "function");
assert.equal(typeof sheen, "object");
assert.equal(sheen.meta?.version, ${JSON.stringify(expectedVersion)});
const plan = await appScaffold("packed-starter");
const appManifest = JSON.parse(plan.find(file => file.path.endsWith("/package.json")).content);
assert.equal(appManifest.dependencies["@gemologic/sheen"], ${JSON.stringify(`^${expectedVersion}`)});
assert.ok(plan.find(file => file.path.endsWith("/vite.config.ts")).content.includes("sheenRuntime()"));
assert.ok(!plan.some(file => file.path.includes("/patches/")));
console.log("Node package roots and shared SSR request context qualified from packed npm artifacts.");
`;
}

const viteProbe = `
import assert from "node:assert/strict";
import { build } from "vite";
import solid from "vite-plugin-solid";
import { sheenRuntime } from "@gemologic/sheen/vite";

async function buildConsumer(name, conditions, plugins) {
  const result = await build({
    configFile: false,
    root: process.cwd(),
    logLevel: "warn",
    resolve: { conditions },
    build: {
      write: false,
      minify: true,
      lib: { entry: "browser-consumer.tsx", formats: ["es"], fileName: name },
      rolldownOptions: { external: [/^solid-js(?:\\/|$)/] },
    },
    plugins: [sheenRuntime(), ...plugins],
  });
  const output = (Array.isArray(result) ? result : [result]).flatMap(item => "output" in item ? item.output : []);
  const exports = new Set(output.flatMap(item => item.type === "chunk" ? item.exports : []));
  for (const expected of ["Button", "FileDropzone", "SearchIcon", "DatePicker", "DataTable", "AdminApp", "LineChart", "CodeBlock"]) {
    assert.ok(exports.has(expected), name + " build is missing " + expected);
  }
}

await buildConsumer("compiled", ["browser", "module", "production"], []);
await buildConsumer("solid-source", ["solid", "browser", "module", "production"], [solid()]);
console.log("Compiled and Solid-source Vite builds passed from packed npm artifacts.");
`;

try {
  await mkdir(tarballDirectory);
  await mkdir(consumerDirectory);
  const tarballs: string[] = [];
  const versions = new Set<string>();
  for (const directory of publicPackageDirectories) {
    const stdout = await execute("pnpm", ["--dir", join(root, "packages", directory), "pack", "--pack-destination", tarballDirectory, "--json"], root);
    const parsed: unknown = JSON.parse(stdout);
    assert.ok(packResult(parsed), `${directory} returned invalid pnpm pack output`);
    assert.ok(isAbsolute(parsed.filename), `${parsed.name} tarball path must be absolute`);
    tarballs.push(parsed.filename);
    versions.add(parsed.version);
  }
  assert.equal(versions.size, 1, "packed public packages must share one version");
  const expectedVersion = [...versions][0];
  assert.ok(expectedVersion, "packed public packages must expose a version");

  await writeFile(join(consumerDirectory, "package.json"), `${JSON.stringify({ name: "sheen-packed-consumer", private: true, type: "module" }, null, 2)}\n`);
  await execute("npm", ["install", "--ignore-scripts", "--save-exact", "--no-fund", ...tarballs, "solid-js@1.9.15", "vite@8.2.2", "vite-plugin-solid@2.11.14", "typescript@6.0.3"], consumerDirectory);
  await execute("npm", ["ls", "--all"], consumerDirectory);
  await execute("npm", ["audit", "--audit-level=high"], consumerDirectory);

  await writeFile(join(consumerDirectory, "browser-consumer.tsx"), browserConsumer);
  await writeFile(join(consumerDirectory, "node-consumer.mjs"), nodeConsumer(expectedVersion));
  await writeFile(join(consumerDirectory, "vite-probe.mjs"), viteProbe);
  await execute(process.execPath, ["node-consumer.mjs"], consumerDirectory);
  await execute("npm", ["exec", "--", "tsc", "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2023", "--module", "ESNext", "--moduleResolution", "Bundler", "--jsx", "preserve", "--types", "vite/client", "browser-consumer.tsx"], consumerDirectory);
  await cp(join(root, "tests/consumers/ui-runtime-types.mts"), join(consumerDirectory, "runtime-types.mts"));
  await execute("npm", ["exec", "--", "tsc", "--noEmit", "--strict", "--target", "ES2023", "--module", "ESNext", "--moduleResolution", "Bundler", "--types", "vite/client", "runtime-types.mts"], consumerDirectory);
  await execute(process.execPath, ["vite-probe.mjs"], consumerDirectory);
  const ui = join(consumerDirectory, "node_modules/@gemologic/sheen");
  const originalRenderer = await readFile(join(consumerDirectory, "node_modules/solid-js/web/dist/web.js"), "utf8");
  assert.doesNotMatch(originalRenderer, /if \(!sharedConfig\.count\) sharedConfig\.done/u, "Clean npm must install unpatched Solid");
  const closure = await execute("npm", ["ls", "--all", "--json"], consumerDirectory);
  for (const dependency of ["@kobalte/core", "@kobalte/utils", "cmdk-solid"]) {
    assert.ok(!closure.includes(`\"${dependency}\"`), `Sheen must not depend on original ${dependency}`);
  }
  if (process.argv.includes("--browser")) {
    for (const condition of ["import", "solid"]) await checkConsumerBrowser(consumerDirectory, ui, condition);
    await checkConsumerHydration(consumerDirectory, ui);
  }

  const packageManifest = await readFile(join(consumerDirectory, "package.json"), "utf8");
  for (const packageDirectory of publicPackageDirectories) {
    const manifest: unknown = JSON.parse(await readFile(join(root, "packages", packageDirectory, "package.json"), "utf8"));
    assert.ok(record(manifest) && typeof manifest.name === "string");
    assert.match(packageManifest, new RegExp(manifest.name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  process.stdout.write(`Clean npm consumer passed for ${tarballs.length} packed packages at version ${expectedVersion}. No package was published.\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
