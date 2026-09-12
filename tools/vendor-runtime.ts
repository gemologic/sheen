import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

interface Origin {
  readonly name: string;
  readonly version: string;
  readonly directory: string;
  readonly tarball: string;
  readonly integrity: string;
  readonly patch?: string;
}

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const vendor = join(root, "packages/ui/vendor");

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function origin(value: unknown): value is Origin {
  return record(value) && typeof value.name === "string" && typeof value.version === "string"
    && typeof value.directory === "string" && /^[a-z-]+$/u.test(value.directory)
    && typeof value.tarball === "string" && new URL(value.tarball).origin === "https://registry.npmjs.org"
    && typeof value.integrity === "string" && /^sha512-[A-Za-z0-9+/]+=*$/u.test(value.integrity)
    && (value.patch === undefined || typeof value.patch === "string" && /^patches\/[^/]+\.patch$/u.test(value.patch));
}

function internalSpecifier(value: string): string {
  if (value === "@kobalte/utils") return "#sheen-kobalte-utils";
  if (value === "@kobalte/core") return "#sheen-kobalte";
  if (value.startsWith("@kobalte/core/")) return value.replace("@kobalte/core/", "#sheen-kobalte/");
  return value;
}

function rewriteImports(filename: string, source: string, solidWebTypes = false): string {
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const edits: { start: number; end: number; replacement: string }[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node)) {
      const parent = node.parent;
      const moduleSpecifier = (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node
        || ts.isCallExpression(parent) && parent.arguments[0] === node
          && (parent.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(parent.expression) && parent.expression.text === "require")
        || ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent);
      const next = solidWebTypes && node.text === "../../types/jsx.js" ? "solid-js" : internalSpecifier(node.text);
      if (moduleSpecifier && next !== node.text) edits.push({ start: node.getStart(parsed), end: node.end, replacement: JSON.stringify(next) });
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  for (const edit of edits.toReversed()) source = source.slice(0, edit.start) + edit.replacement + source.slice(edit.end);
  return source;
}

async function files(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => entry.isDirectory()
    ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat().sort();
}

const parsed: unknown = JSON.parse(await readFile(join(vendor, "origins.json"), "utf8"));
assert.ok(Array.isArray(parsed) && parsed.every(origin), "vendor origins must identify pinned, integrity-checked npm artifacts");
assert.equal(new Set(parsed.map(item => item.directory)).size, parsed.length, "vendor directories must be unique");
const temporary = await mkdtemp(join(tmpdir(), "sheen-vendor-"));
const hashes: Record<string, string> = {};
try {
  for (const item of parsed) {
    const archive = join(temporary, `${item.directory}.tgz`);
    const response = await fetch(item.tarball, { signal: AbortSignal.timeout(60_000) });
    assert.ok(response.ok, `download failed for ${item.name}: ${response.status}`);
    const content = Buffer.from(await response.arrayBuffer());
    assert.equal(`sha512-${createHash("sha512").update(content).digest("base64")}`, item.integrity, `${item.name} upstream artifact changed`);
    await writeFile(archive, content);
    const extracted = join(temporary, item.directory);
    await mkdir(extracted);
    const listing = await run("tar", ["-tzf", archive]);
    assert.ok(listing.stdout.split("\n").filter(Boolean).every(path => path.startsWith("package/") && !path.split("/").includes("..")), "archive paths must remain in package/");
    await run("tar", ["-xzf", archive, "--strip-components=1", "-C", extracted]);
    const identity: unknown = JSON.parse(await readFile(join(extracted, "package.json"), "utf8"));
    assert.ok(record(identity) && identity.name === item.name && identity.version === item.version, "upstream package identity changed");
    if (item.patch) {
      const patch = join(root, item.patch);
      await run("patch", ["--batch", "--forward", "--no-backup-if-mismatch", "-p1", "-i", patch], { cwd: extracted });
      hashes[item.patch] = createHash("sha512").update(await readFile(patch)).digest("hex");
    }
    const output = join(vendor, item.directory);
    await rm(output, { recursive: true, force: true });
    await mkdir(output);
    const runtime = item.directory === "solid-web" ? join(extracted, "web") : extracted;
    for (const path of await files(join(runtime, "dist"))) {
      if (!/\.(?:js|jsx|cjs|d\.ts|d\.cts)$/u.test(path)) continue;
      const runtimePath = relative(join(runtime, "dist"), path);
      const target = join(output, runtimePath);
      await mkdir(dirname(target), { recursive: true });
      // Server patches are unnecessary; a copied renderer splits SolidStart's request context.
      const source = item.directory === "solid-web" && runtimePath === "server.js" ? 'export * from "solid-js/web";'
        : item.directory === "solid-web" && runtimePath === "server.cjs" ? 'module.exports = require("solid-js/web");'
        : (await readFile(path, "utf8")).replace(/^\/\/# sourceMappingURL=.*(?:\r?\n|$)/gmu, "");
      const notice = `// Vendored and modified by Gemologic Sheen from ${item.name}@${item.version}; see package THIRD_PARTY_NOTICES.md.\n`;
      await writeFile(target, `${(notice + rewriteImports(path, source)).trimEnd()}\n`);
    }
    if (item.directory === "solid-web") {
      for (const path of await files(join(runtime, "types"))) {
        const target = join(output, "types", relative(join(runtime, "types"), path));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, `${rewriteImports(path, await readFile(path, "utf8"), true).trimEnd()}\n`);
      }
    }
    const licenses = (await readdir(extracted)).filter(name => /^(?:LICENSE|NOTICE)(?:\.|$)/u.test(name));
    if (item.directory === "kobalte-utils" && licenses.length === 0) {
      await cp(join(vendor, "kobalte-core/LICENSE.md"), join(output, "LICENSE.md"));
      await cp(join(vendor, "kobalte-core/NOTICE.txt"), join(output, "NOTICE.txt"));
    } else {
      assert.ok(licenses.some(name => name.startsWith("LICENSE")), `${item.name} must retain its upstream license`);
      for (const name of licenses) await cp(join(extracted, name), join(output, name));
    }
    if (item.directory === "kobalte-utils" && !licenses.includes("NOTICE.txt")) {
      await cp(join(vendor, "kobalte-core/NOTICE.txt"), join(output, "NOTICE.txt"));
    }
    for (const path of await files(output)) hashes[relative(vendor, path)] = createHash("sha512").update(await readFile(path)).digest("hex");
    process.stdout.write(`Vendored ${item.name}@${item.version} with upstream integrity and license records\n`);
  }
  hashes["origins.json"] = createHash("sha512").update(await readFile(join(vendor, "origins.json"))).digest("hex");
  await writeFile(join(vendor, "integrity.json"), `${JSON.stringify(hashes, null, 2)}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
