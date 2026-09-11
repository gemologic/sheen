import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { publicPackageDirectories } from "./public-packages.ts";
import { releaseStage } from "./release-version.ts";

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

interface PackResult {
  readonly name: string;
  readonly version: string;
  readonly filename: string;
}

interface ReleaseArtifact {
  readonly name: string;
  readonly version: string;
  readonly filename: string;
  readonly sha512: string;
}

interface ReleaseArtifactManifest {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly distributionTag: "latest" | "next";
  readonly publicationMode: "bootstrap" | "stage";
  readonly artifacts: readonly ReleaseArtifact[];
}

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const artifactManifestFilename = "release-artifacts.json";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function packageManifest(value: unknown): value is PackageManifest {
  return record(value) && nonempty(value.name) && nonempty(value.version);
}

function packResult(value: unknown): value is PackResult {
  return record(value) && nonempty(value.name) && nonempty(value.version) && nonempty(value.filename);
}

function releaseArtifact(value: unknown): value is ReleaseArtifact {
  return record(value) && nonempty(value.name) && nonempty(value.version)
    && typeof value.filename === "string" && /^[a-z0-9][a-z0-9._-]*\.tgz$/u.test(value.filename)
    && typeof value.sha512 === "string" && /^[a-f0-9]{128}$/u.test(value.sha512);
}

function releaseArtifactManifest(value: unknown): value is ReleaseArtifactManifest {
  return record(value) && value.schemaVersion === 1 && nonempty(value.version)
    && (value.distributionTag === "latest" || value.distributionTag === "next")
    && (value.publicationMode === "bootstrap" || value.publicationMode === "stage")
    && Array.isArray(value.artifacts) && value.artifacts.every(releaseArtifact);
}

async function readJson(path: string): Promise<unknown> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  return parsed;
}

async function workspacePackages(expectedVersion: string): Promise<readonly PackageManifest[]> {
  const packages: PackageManifest[] = [];
  for (const directory of publicPackageDirectories) {
    const parsed = await readJson(join(root, "packages", directory, "package.json"));
    assert.ok(packageManifest(parsed), `${directory}/package.json has no package identity`);
    assert.equal(parsed.version, expectedVersion, `${parsed.name} does not use the requested release version`);
    packages.push(parsed);
  }
  assert.equal(new Set(packages.map(item => item.name)).size, packages.length, "public package names must be unique");
  return packages;
}

function validatePublication(version: string, distributionTag: "latest" | "next"): void {
  const stage = releaseStage(version);
  assert.notEqual(stage, "development", "release artifacts cannot use the development version");
  if (stage === "prerelease") assert.equal(distributionTag, "next", "prereleases must use the next distribution tag");
  else assert.equal(distributionTag, "latest", "stable releases must use the latest distribution tag");
}

async function digest(path: string): Promise<string> {
  return createHash("sha512").update(await readFile(path)).digest("hex");
}

async function packRelease(
  outputArgument: string,
  expectedVersion: string,
  distributionTag: "latest" | "next",
  publicationMode: "bootstrap" | "stage",
): Promise<void> {
  validatePublication(expectedVersion, distributionTag);
  const output = resolve(outputArgument);
  assert.ok(isAbsolute(output), "release artifact directory must resolve to an absolute path");
  await mkdir(output, { recursive: true });
  assert.deepEqual(await readdir(output), [], "release artifact directory must be empty");
  const packages = await workspacePackages(expectedVersion);
  const artifacts: ReleaseArtifact[] = [];

  for (const [index, directory] of publicPackageDirectories.entries()) {
    const expectedPackage = packages[index];
    assert.ok(expectedPackage, `missing package identity for ${directory}`);
    const packed = await run("pnpm", ["--dir", join(root, "packages", directory), "pack", "--pack-destination", output, "--json"], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120_000,
    });
    const parsed: unknown = JSON.parse(packed.stdout);
    assert.ok(packResult(parsed), `${expectedPackage.name} returned invalid pnpm pack output`);
    assert.equal(parsed.name, expectedPackage.name);
    assert.equal(parsed.version, expectedVersion);
    assert.ok(isAbsolute(parsed.filename), `${parsed.name} returned a relative tarball path`);
    assert.equal(dirname(parsed.filename), output, `${parsed.name} wrote outside the artifact directory`);
    const filename = basename(parsed.filename);
    assert.match(filename, /\.tgz$/u, `${parsed.name} did not create an npm tarball`);
    artifacts.push({ name: parsed.name, version: parsed.version, filename, sha512: await digest(parsed.filename) });
  }

  const manifest: ReleaseArtifactManifest = { schemaVersion: 1, version: expectedVersion, distributionTag, publicationMode, artifacts };
  await writeFile(join(output, artifactManifestFilename), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`Packed ${artifacts.length} reviewed release artifacts for ${expectedVersion}. Nothing was published.\n`);
}

async function verifyRelease(
  outputArgument: string,
  expectedVersion: string,
  distributionTag: "latest" | "next",
  publicationMode: "bootstrap" | "stage",
): Promise<void> {
  validatePublication(expectedVersion, distributionTag);
  const output = resolve(outputArgument);
  const packages = await workspacePackages(expectedVersion);
  const parsed = await readJson(join(output, artifactManifestFilename));
  assert.ok(releaseArtifactManifest(parsed), "release-artifacts.json does not satisfy the release artifact contract");
  assert.equal(parsed.version, expectedVersion, "artifact manifest version differs from the requested release version");
  assert.equal(parsed.distributionTag, distributionTag, "artifact distribution tag differs from the approved request");
  assert.equal(parsed.publicationMode, publicationMode, "artifact publication mode differs from the approved request");
  assert.equal(parsed.artifacts.length, packages.length, "artifact manifest does not contain every public package");

  const expectedFiles = new Set<string>([artifactManifestFilename]);
  for (const [index, artifact] of parsed.artifacts.entries()) {
    const expectedPackage = packages[index];
    assert.ok(expectedPackage, `unexpected release artifact ${artifact.name}`);
    assert.equal(artifact.name, expectedPackage.name, "release artifact package order or identity changed");
    assert.equal(artifact.version, expectedVersion, `${artifact.name} has the wrong release version`);
    assert.equal(basename(artifact.filename), artifact.filename, `${artifact.name} has an unsafe artifact filename`);
    assert.ok(!expectedFiles.has(artifact.filename), `duplicate release artifact filename ${artifact.filename}`);
    expectedFiles.add(artifact.filename);
    assert.equal(await digest(join(output, artifact.filename)), artifact.sha512, `${artifact.name} artifact digest changed`);
  }

  assert.deepEqual(new Set(await readdir(output)), expectedFiles, "release artifact directory contains unreviewed files");
  process.stdout.write(`Verified ${parsed.artifacts.length} unchanged release artifacts for ${expectedVersion}.\n`);
}

const [command, outputArgument, expectedVersion, distributionTag, publicationMode] = process.argv.slice(2);
assert.ok(command === "pack" || command === "verify", "usage: release-artifacts.ts <pack|verify> <directory> <version> <next|latest> <bootstrap|stage>");
assert.ok(nonempty(outputArgument), "release artifact directory is required");
assert.ok(nonempty(expectedVersion), "release version is required");
assert.ok(distributionTag === "latest" || distributionTag === "next", "release distribution tag must be next or latest");
assert.ok(publicationMode === "bootstrap" || publicationMode === "stage", "publication mode must be bootstrap or stage");
if (command === "pack") await packRelease(outputArgument, expectedVersion, distributionTag, publicationMode);
else await verifyRelease(outputArgument, expectedVersion, distributionTag, publicationMode);
