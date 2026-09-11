import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export interface DoctorDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ShortcutSnapshotEntry {
  readonly id: number;
  readonly scope: string;
  readonly keys: string;
  readonly displayKeys: string;
  readonly label: string;
  readonly group: string;
  readonly characterOnly: boolean;
  readonly shadowed: boolean;
}

export interface DoctorOptions {
  readonly root: string;
  readonly shortcutSnapshot?: string;
}

export interface DoctorResult {
  readonly diagnostics: readonly DoctorDiagnostic[];
  readonly shortcuts: readonly ShortcutSnapshotEntry[];
  readonly suppressionCount: number;
  readonly suppressions: readonly { readonly path: string; readonly count: number }[];
}

const requiredRuntimePackages: readonly string[] = ["@gemologic/sheen", "@gemologic/sheen-patterns", "@gemologic/sheen-tokens"];
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return record(value) && Object.values(value).every(item => typeof item === "string");
}

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function packageManifest(path: string): Promise<Readonly<Record<string, unknown>>> {
  const value = await json(path);
  if (!record(value)) throw new Error(`Invalid package manifest: ${path}`);
  return value;
}

async function files(root: string, current = root): Promise<readonly string[]> {
  const result: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) result.push(...await files(root, path));
    else if (entry.isFile() && sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) result.push(path);
  }
  return result;
}

function containedPath(root: string, path: string): string {
  const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path);
  const fromRoot = relative(resolve(root), absolute);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) throw new Error(`Doctor input escapes the application root: ${path}`);
  return absolute;
}

function shortcutEntry(value: unknown): value is ShortcutSnapshotEntry {
  return record(value)
    && typeof value.id === "number" && Number.isSafeInteger(value.id) && value.id > 0
    && typeof value.scope === "string" && Boolean(value.scope.trim())
    && typeof value.keys === "string" && Boolean(value.keys.trim())
    && typeof value.displayKeys === "string" && Boolean(value.displayKeys.trim())
    && typeof value.label === "string" && Boolean(value.label.trim())
    && typeof value.group === "string" && Boolean(value.group.trim())
    && typeof value.characterOnly === "boolean"
    && typeof value.shadowed === "boolean";
}

async function readShortcuts(root: string, path: string | undefined, diagnostics: DoctorDiagnostic[]): Promise<readonly ShortcutSnapshotEntry[]> {
  if (!path) return [];
  const absolute = containedPath(root, path);
  try {
    const value = await json(absolute);
    const entries = Array.isArray(value) ? value : record(value) && Array.isArray(value.bindings) ? value.bindings : undefined;
    if (!entries || !entries.every(shortcutEntry)) throw new Error("expected an array of complete ShortcutBinding records");
    const active = new Set<string>();
    for (const entry of entries) {
      if (entry.shadowed) continue;
      const identity = JSON.stringify([entry.scope, entry.keys]);
      if (active.has(identity)) throw new Error(`multiple active bindings for ${entry.scope}/${entry.keys}`);
      active.add(identity);
    }
    return [...entries].sort((left, right) => `${left.scope}/${left.keys}/${left.id}`.localeCompare(`${right.scope}/${right.keys}/${right.id}`));
  } catch (error) {
    diagnostics.push({ code: "shortcut-snapshot", path, message: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export function formatShortcutTable(entries: readonly ShortcutSnapshotEntry[]): string {
  if (entries.length === 0) return "Runtime shortcuts: no snapshot supplied.\n";
  const headings = ["scope", "keys", "display", "label", "group", "state"];
  const rows = entries.map(entry => [entry.scope, entry.keys, entry.displayKeys, entry.label, entry.group, entry.shadowed ? "shadowed" : "active"]);
  const widths = headings.map((heading, index) => Math.max(heading.length, ...rows.map(row => row[index]?.length ?? 0)));
  const line = (cells: readonly string[]) => cells.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join("  ").trimEnd();
  return `Runtime shortcuts:\n${line(headings)}\n${line(widths.map(width => "-".repeat(width)))}\n${rows.map(line).join("\n")}\n`;
}

export async function doctor(options: DoctorOptions): Promise<DoctorResult> {
  const root = resolve(options.root);
  const diagnostics: DoctorDiagnostic[] = [];
  const manifestPath = join(root, "package.json");
  let manifest: Readonly<Record<string, unknown>>;
  try {
    manifest = await packageManifest(manifestPath);
  } catch (error) {
    return { diagnostics: [{ code: "package-json", path: "package.json", message: error instanceof Error ? error.message : String(error) }], shortcuts: [], suppressionCount: 0, suppressions: [] };
  }
  const dependencies = stringRecord(manifest.dependencies) ? manifest.dependencies : {};
  const development = stringRecord(manifest.devDependencies) ? manifest.devDependencies : {};
  for (const name of requiredRuntimePackages) {
    if (!(name in dependencies)) diagnostics.push({
      code: "runtime-dependency",
      path: "package.json",
      message: name in development ? `${name} must be a runtime dependency, not only a dev dependency` : `missing runtime dependency ${name}`,
    });
  }

  const declared = Object.entries(dependencies).filter(([name]) => name.startsWith("@gemologic/sheen") && name !== "@gemologic/sheen-cli");
  const specifications = new Set(declared.map(([, specification]) => specification));
  if (specifications.size > 1) diagnostics.push({ code: "declared-version-drift", path: "package.json", message: `Sheen package ranges differ: ${[...specifications].sort().join(", ")}` });
  const installedVersions = new Map<string, string>();
  for (const [name] of declared) {
    const installedPath = join(root, "node_modules", ...name.split("/"), "package.json");
    try {
      const installed = await packageManifest(installedPath);
      if (typeof installed.version !== "string" || !installed.version.trim()) throw new Error("missing version");
      installedVersions.set(name, installed.version);
    } catch (error) {
      diagnostics.push({ code: "installed-package", path: relative(root, installedPath), message: `${name} is not installed with a readable version: ${error instanceof Error ? error.message : String(error)}` });
    }
  }
  const installedUnique = new Set(installedVersions.values());
  if (installedUnique.size > 1) diagnostics.push({
    code: "installed-version-drift",
    path: "node_modules",
    message: [...installedVersions].map(([name, version]) => `${name}=${version}`).join(", "),
  });

  let source = "";
  let suppressionCount = 0;
  const suppressions: { path: string; count: number }[] = [];
  try {
    for (const path of await files(join(root, "src"))) {
      const content = await readFile(path, "utf8");
      source += `\n${content}`;
      const count = [...content.matchAll(/eslint-(?:disable|disable-next-line|disable-line)[^\n]*\bsheen\//gu)].length;
      suppressionCount += count;
      if (count > 0) suppressions.push({ path: relative(root, path), count });
    }
  } catch (error) {
    diagnostics.push({ code: "source-tree", path: "src", message: error instanceof Error ? error.message : String(error) });
  }
  const requiredSourceMarkers: readonly (readonly [string, string, string])[] = [
    ["theme-provider", "ThemeProvider", "missing ThemeProvider ownership"],
    ["theme-script", "createThemeScript", "missing prepaint createThemeScript bootstrap"],
    ["keyboard-hydration", "createKeyboardHydrationScript", "missing keyboard hydration bootstrap"],
    ["token-styles", "@gemologic/sheen-tokens/preset.css", "missing token preset stylesheet"],
    ["component-styles", "@gemologic/sheen/styles.css", "missing Sheen component stylesheet"],
    ["pattern-styles", "@gemologic/sheen-patterns/styles.css", "missing Sheen pattern stylesheet"],
  ];
  for (const [code, marker, message] of requiredSourceMarkers) if (!source.includes(marker)) diagnostics.push({ code, path: "src", message });
  if (suppressionCount > 10) diagnostics.push({ code: "suppression-ceiling", path: "src", message: `${suppressionCount} sheen lint suppressions exceed the application ceiling of 10: ${suppressions.map(item => `${item.path}=${item.count}`).join(", ")}` });

  const shortcuts = await readShortcuts(root, options.shortcutSnapshot, diagnostics);
  return { diagnostics, shortcuts, suppressionCount, suppressions: Object.freeze(suppressions) };
}

export function formatDoctorResult(result: DoctorResult): string {
  const diagnostics = result.diagnostics.length === 0
    ? "Doctor passed with no configuration errors."
    : result.diagnostics.map(item => `ERROR ${item.code} ${item.path}: ${item.message}`).join("\n");
  const suppressions = result.suppressions.length ? `Suppression paths:\n${result.suppressions.map(item => `${item.path}: ${item.count}`).join("\n")}\n` : "";
  return `${diagnostics}\nSheen lint suppressions: ${result.suppressionCount}/10\n${suppressions}${formatShortcutTable(result.shortcuts)}`;
}
