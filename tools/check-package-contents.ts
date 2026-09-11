import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { publicPackageDirectories } from "./public-packages.ts";
import { patchedDependencyReleaseError, workspacePatchedDependencies } from "./release-version.ts";

interface PackageRepository {
  readonly type: "git";
  readonly url: string;
  readonly directory: string;
}

interface PackagePublishConfig {
  readonly access: "public";
  readonly provenance: true;
}

interface PackageBugs {
  readonly url: string;
}

interface PublicPackageManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly license: "MIT";
  readonly homepage: string;
  readonly bugs: PackageBugs;
  readonly files: readonly string[];
  readonly repository: PackageRepository;
  readonly publishConfig: PackagePublishConfig;
  readonly exports: Readonly<Record<string, unknown>>;
  readonly bin?: string | Readonly<Record<string, string>>;
}

interface PackFile {
  readonly path: string;
}

interface PackResult {
  readonly name: string;
  readonly version: string;
  readonly files: readonly PackFile[];
}

interface InspectedPackage {
  readonly name: string;
  readonly version: string;
  readonly files: number;
}

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const expectedRepository = "git+https://github.com/gemologic/sheen.git";
const forbiddenFiles = [
  /\.(?:test|demo|meta)(?:\.d)?\.[cm]?[jt]sx?$/u,
  /(?:^|\/)__snapshots__(?:\/|$)/u,
  /(?:^|\/)(?:tsconfig|vite\.config|vitest\.config|playwright\.config)(?:\.|$)/u,
  /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|\.env(?:\.|$))/u,
];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(nonempty);
}

function stringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return record(value) && Object.values(value).every(nonempty);
}

function repository(value: unknown): value is PackageRepository {
  return record(value) && value.type === "git" && nonempty(value.url) && nonempty(value.directory);
}

function publishConfig(value: unknown): value is PackagePublishConfig {
  return record(value) && value.access === "public" && value.provenance === true;
}

function bugs(value: unknown): value is PackageBugs {
  return record(value) && nonempty(value.url);
}

function manifest(value: unknown): value is PublicPackageManifest {
  return record(value) && nonempty(value.name) && nonempty(value.version) && nonempty(value.description)
    && value.license === "MIT" && value.homepage === "https://sheen.gemologic.dev" && bugs(value.bugs)
    && value.bugs.url === "https://github.com/gemologic/sheen/issues"
    && stringArray(value.files) && repository(value.repository)
    && publishConfig(value.publishConfig) && record(value.exports)
    && (value.bin === undefined || nonempty(value.bin) || stringRecord(value.bin));
}

function packFile(value: unknown): value is PackFile {
  return record(value) && nonempty(value.path);
}

function packResult(value: unknown): value is PackResult {
  return record(value) && nonempty(value.name) && nonempty(value.version)
    && Array.isArray(value.files) && value.files.every(packFile);
}

async function readJson(path: string): Promise<unknown> {
  const source = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(source);
  return parsed;
}

function collectExportTargets(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (!record(value)) return [];
  return Object.values(value).flatMap(collectExportTargets);
}

function patternExpression(pattern: string): RegExp {
  let source = "^";
  for (const character of pattern) {
    if (character === "*") source += "[^/]+";
    else source += character.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  }
  return new RegExp(`${source}$`, "u");
}

function assertTargetIncluded(target: string, included: ReadonlySet<string>, packageName: string): void {
  assert.ok(target.startsWith("./"), `${packageName} export target ${target} must be package-relative`);
  assert.ok(!target.includes(".."), `${packageName} export target ${target} must not traverse outside the package`);
  const path = target.slice(2);
  if (path.includes("*")) {
    const expression = patternExpression(path);
    assert.ok([...included].some(file => expression.test(file)), `${packageName} export target ${target} matches no packed file`);
    return;
  }
  assert.ok(included.has(path), `${packageName} export target ${target} is absent from the packed files`);
}

function binTargets(value: PublicPackageManifest["bin"]): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  return Object.values(value);
}

async function inspectPackage(directoryName: string, rootLicense: string): Promise<InspectedPackage> {
  const directory = join(root, "packages", directoryName);
  const parsedManifest = await readJson(join(directory, "package.json"));
  assert.ok(manifest(parsedManifest), `${directoryName}/package.json does not satisfy the public package contract`);
  assert.equal(parsedManifest.repository.url, expectedRepository, `${parsedManifest.name} repository URL`);
  assert.equal(parsedManifest.repository.directory, `packages/${directoryName}`, `${parsedManifest.name} repository directory`);
  assert.ok(parsedManifest.files.some(item => item.startsWith("!")), `${parsedManifest.name} must explicitly exclude non-runtime files`);

  const packed = await run("pnpm", ["--dir", directory, "pack", "--dry-run", "--json"], { maxBuffer: 16 * 1024 * 1024 });
  const parsedPack: unknown = JSON.parse(packed.stdout);
  assert.ok(packResult(parsedPack), `${parsedManifest.name} returned an invalid pnpm pack inventory`);
  assert.equal(parsedPack.name, parsedManifest.name);
  assert.equal(parsedPack.version, parsedManifest.version);
  const included = new Set(parsedPack.files.map(file => file.path));

  for (const required of ["package.json", "README.md", "LICENSE"]) {
    assert.ok(included.has(required), `${parsedManifest.name} package is missing ${required}`);
  }
  const packageLicense = await readFile(join(directory, "LICENSE"), "utf8");
  assert.equal(packageLicense, rootLicense, `${parsedManifest.name} LICENSE differs from the repository MIT license`);
  const readme = await readFile(join(directory, "README.md"), "utf8");
  assert.match(readme, /^## Install$/mu, `${parsedManifest.name} README must document installation`);
  assert.match(readme, /^## Use$/mu, `${parsedManifest.name} README must document its public entry points`);
  for (const path of included) {
    assert.ok(!forbiddenFiles.some(expression => expression.test(path)), `${parsedManifest.name} includes forbidden publication file ${path}`);
  }
  for (const target of collectExportTargets(parsedManifest.exports)) assertTargetIncluded(target, included, parsedManifest.name);
  for (const target of binTargets(parsedManifest.bin)) assertTargetIncluded(target, included, parsedManifest.name);

  if (parsedManifest.name === "@gemologic/sheen-tokens") {
    for (const required of ["dist/fonts/LICENSE.txt", "dist/fonts/SOURCE.md", "dist/fonts/IBMPlexSans-Regular.woff2", "dist/fonts/IBMPlexSans-SemiBold.woff2", "dist/fonts/IBMPlexMono-Regular.woff2"]) {
      assert.ok(included.has(required), `${parsedManifest.name} package is missing font artifact ${required}`);
    }
  }
  if (parsedManifest.name === "@gemologic/sheen-icons") {
    assert.ok(included.has("THIRD_PARTY_NOTICES.md"), `${parsedManifest.name} package is missing third-party icon notices`);
  }
  if (parsedManifest.name === "@gemologic/sheen-cli") {
    for (const required of ["dist/skill/SKILL.md", "dist/skill/llms.txt", "dist/app-patches/solid-js@1.9.15.patch", "dist/app-patches/@kobalte__core@0.13.13.patch", "dist/app-patches/@kobalte__utils@0.9.2.patch"]) {
      assert.ok(included.has(required), `${parsedManifest.name} package is missing generated app artifact ${required}`);
    }
  }

  process.stdout.write(`${parsedManifest.name}@${parsedManifest.version}: ${included.size} reviewed files\n`);
  return { name: parsedManifest.name, version: parsedManifest.version, files: included.size };
}

const rootLicense = await readFile(join(root, "LICENSE"), "utf8");
const inspected: InspectedPackage[] = [];
for (const directory of publicPackageDirectories) inspected.push(await inspectPackage(directory, rootLicense));
assert.equal(new Set(inspected.map(item => item.name)).size, publicPackageDirectories.length, "public package names must be unique");
assert.equal(new Set(inspected.map(item => item.version)).size, 1, "fixed public packages must share one version");
const publicVersion = inspected[0]?.version;
assert.ok(publicVersion, "at least one public package must be inspected");
const expectedReleaseVersion = process.env.SHEEN_EXPECTED_RELEASE_VERSION;
if (expectedReleaseVersion !== undefined) {
  assert.notEqual(expectedReleaseVersion, "0.0.0", "a publication workflow cannot use the development version");
  assert.equal(publicVersion, expectedReleaseVersion, "public package version differs from the requested release version");
}
const workspaceSource = await readFile(join(root, "pnpm-workspace.yaml"), "utf8");
const dependencyPatchError = patchedDependencyReleaseError(publicVersion, workspacePatchedDependencies(workspaceSource));
assert.equal(dependencyPatchError, undefined, dependencyPatchError);
process.stdout.write(`Public package gate passed for ${inspected.length} packages and ${inspected.reduce((sum, item) => sum + item.files, 0)} files. No package was published.\n`);
