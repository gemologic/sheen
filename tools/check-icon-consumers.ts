import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import type { Plugin } from "vite";
import solid from "vite-plugin-solid";
import type { SheenIconsOptions } from "../packages/icons/src/vite.ts";

interface IconPluginModule {
  readonly sheenIcons: (options?: SheenIconsOptions) => Plugin;
}

function isIconPluginModule(value: unknown): value is IconPluginModule {
  return typeof value === "object" && value !== null && "sheenIcons" in value && typeof value.sheenIcons === "function";
}

const root = new URL("../", import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "sheen-icon-consumer-"));
const originalWorkingDirectory = process.cwd();

try {
  const installed = join(temporary, "node_modules", "@gemologic", "sheen-icons");
  await mkdir(installed, { recursive: true });
  await cp(new URL("packages/icons/package.json", root), join(installed, "package.json"));
  await cp(new URL("packages/icons/dist", root), join(installed, "dist"), { recursive: true });
  for (const dependency of ["solid-js"]) {
    const target = join(temporary, "node_modules", dependency);
    await mkdir(join(target, ".."), { recursive: true });
    await symlink(await realpath(new URL(`packages/icons/node_modules/${dependency}`, root)), target, "dir");
  }
  process.chdir(temporary);

  const importedPlugin: unknown = await import(pathToFileURL(join(installed, "dist", "vite.js")).href);
  if (!isIconPluginModule(importedPlugin)) throw new Error("installed icon package does not export sheenIcons");
  const pluginModule = importedPlugin;
  const searchBody = "m229.66 218.34l-50.07-50.06";
  const settingsBody = "M128 80a48 48 0 1 0 48 48";

  async function buildFixture(name: "icon-literal" | "icon-static" | "icon-dynamic" | "icon-lazy", plugin = false): Promise<{ readonly code: string; readonly entry: string; readonly chunks: number; readonly retained: readonly string[] }> {
    const entry = join(temporary, `${name}.tsx`);
    await cp(new URL(`tests/consumers/${name}.tsx`, root), entry);
    const output = await build({
      configFile: false,
      root: temporary,
      logLevel: "silent",
      resolve: { conditions: ["browser", "module", "production"] },
      build: { write: false, minify: true, lib: { entry, formats: ["es"], fileName: name }, rolldownOptions: { external: [/^solid-js(?:\/|$)/] } },
      plugins: [plugin ? pluginModule.sheenIcons({ sets: ["radix", "phosphor"] }) : undefined, solid()],
    });
    const outputChunks = (Array.isArray(output) ? output : [output]).flatMap(result => "output" in result ? result.output : []).filter(item => item.type === "chunk");
    return {
      code: outputChunks.map(chunk => chunk.code).join("\n"),
      entry: outputChunks.filter(chunk => chunk.isEntry).map(chunk => chunk.code).join("\n"),
      chunks: outputChunks.length,
      retained: outputChunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, details]) => details.renderedLength > 0).map(([id]) => id)),
    };
  }

  const literal = await buildFixture("icon-literal", true);
  assert.match(literal.code, /data-sheen-icon-set-value/);
  assert.ok(literal.code.includes(searchBody), "literal icon must include both selected search glyphs");
  assert.ok(!literal.code.includes(settingsBody), "literal icon must not retain an unrelated glyph");
  assert.ok(!literal.retained.some(id => id.endsWith("/generated/catalog.js")), "literal icon must not retain the full generated catalog");

  const staticIcon = await buildFixture("icon-static");
  assert.ok(staticIcon.code.includes(searchBody), "per-icon export must include both selected search glyphs");
  assert.ok(!staticIcon.code.includes(settingsBody), "per-icon export must tree-shake unrelated glyphs");

  const dynamic = await buildFixture("icon-dynamic");
  assert.ok(dynamic.code.includes(searchBody) && dynamic.code.includes(settingsBody), "DynamicIcon must make its full-registry cost explicit");
  assert.ok(dynamic.code.length > literal.code.length * 5, "dynamic registry should be materially larger than one literal icon");

  // LazyIcon keeps every glyph behind its own dynamic import; only the loader map and runtime reach the entry chunk.
  const lazy = await buildFixture("icon-lazy");
  assert.ok(!lazy.entry.includes(searchBody) && !lazy.entry.includes(settingsBody), "LazyIcon entry must not inline glyph data");
  assert.ok(lazy.code.includes(searchBody) && lazy.code.includes(settingsBody), "LazyIcon must emit a split chunk per glyph");
  assert.ok(lazy.chunks > 257, "LazyIcon must split one chunk per semantic name");
  assert.ok(!lazy.retained.some(id => /\/generated\/catalog\.js$|\/registry\.js$/.test(id)), "LazyIcon must not retain the generated catalog or registry");

  const invalid = join(temporary, "icon-unknown.tsx");
  await cp(new URL("tests/consumers/icon-unknown.tsx", root), invalid);
  await assert.rejects(() => build({
    configFile: false,
    root: temporary,
    logLevel: "silent",
    build: { write: false, lib: { entry: invalid, formats: ["es"] }, rolldownOptions: { external: [/^solid-js(?:\/|$)/] } },
    plugins: [pluginModule.sheenIcons({ sets: ["radix", "phosphor"] }), solid()],
  }), /Unknown semantic icon/);

  const gzip = (code: string): number => gzipSync(code).byteLength;
  const sizes = { literal: gzip(literal.code), static: gzip(staticIcon.code), dynamic: gzip(dynamic.code), lazy: gzip(lazy.entry) };
  assert.ok(sizes.literal < 1_500 && sizes.static < 1_500, "a single icon import must stay under 1,500 bytes gzip");
  assert.ok(sizes.dynamic < 65_000, "DynamicIcon with the complete registry must stay under 65,000 bytes gzip");
  assert.ok(sizes.lazy < 9_000, "LazyIcon entry with the loader map and lucide aliases must stay under 9,000 bytes gzip");

  process.stdout.write(`Icon consumers passed (gzip): literal=${sizes.literal}B, static=${sizes.static}B, dynamic=${sizes.dynamic}B, lazy entry=${sizes.lazy}B\n`);
} finally {
  process.chdir(originalWorkingDirectory);
  await rm(temporary, { recursive: true, force: true });
}
