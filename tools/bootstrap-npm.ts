import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

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
  readonly publicationMode: "bootstrap";
  readonly artifacts: readonly ReleaseArtifact[];
}

const run = promisify(execFile);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function artifact(value: unknown): value is ReleaseArtifact {
  return record(value) && nonempty(value.name) && nonempty(value.version)
    && typeof value.filename === "string" && /^[a-z0-9][a-z0-9._-]*\.tgz$/u.test(value.filename)
    && typeof value.sha512 === "string" && /^[a-f0-9]{128}$/u.test(value.sha512);
}

function manifest(value: unknown): value is ReleaseArtifactManifest {
  return record(value) && value.schemaVersion === 1 && nonempty(value.version)
    && (value.distributionTag === "latest" || value.distributionTag === "next")
    && value.publicationMode === "bootstrap"
    && Array.isArray(value.artifacts) && value.artifacts.every(artifact);
}

function errorOutput(value: unknown): string {
  if (!record(value)) return "";
  if (typeof value.stderr === "string") return value.stderr;
  if (Buffer.isBuffer(value.stderr)) return value.stderr.toString("utf8");
  return "";
}

async function publishedIntegrity(name: string, version: string): Promise<string | undefined> {
  try {
    const result = await run("npm", ["view", `${name}@${version}`, "dist.integrity", "--json"], { timeout: 30_000 });
    const parsed: unknown = JSON.parse(result.stdout);
    assert.ok(nonempty(parsed), `npm returned no integrity for existing ${name}@${version}`);
    return parsed;
  } catch (error: unknown) {
    if (errorOutput(error).includes("E404")) return undefined;
    throw error;
  }
}

const [directoryArgument, expectedVersion, expectedTag] = process.argv.slice(2);
assert.ok(nonempty(directoryArgument), "usage: bootstrap-npm.ts <artifact-directory> <version> <next|latest>");
assert.ok(nonempty(expectedVersion), "bootstrap release version is required");
assert.ok(expectedTag === "next" || expectedTag === "latest", "bootstrap distribution tag must be next or latest");
const directory = resolve(directoryArgument);
const parsed: unknown = JSON.parse(await readFile(join(directory, "release-artifacts.json"), "utf8"));
assert.ok(manifest(parsed), "release artifact manifest is not approved for bootstrap publication");
assert.equal(parsed.version, expectedVersion, "bootstrap version differs from the approved artifact manifest");
assert.equal(parsed.distributionTag, expectedTag, "bootstrap tag differs from the approved artifact manifest");

for (const releaseArtifact of parsed.artifacts) {
  assert.equal(basename(releaseArtifact.filename), releaseArtifact.filename, `${releaseArtifact.name} has an unsafe artifact filename`);
  const existingIntegrity = await publishedIntegrity(releaseArtifact.name, releaseArtifact.version);
  if (existingIntegrity !== undefined) {
    const expectedIntegrity = `sha512-${Buffer.from(releaseArtifact.sha512, "hex").toString("base64")}`;
    assert.equal(existingIntegrity, expectedIntegrity, `${releaseArtifact.name}@${releaseArtifact.version} already exists with different bytes`);
    process.stdout.write(`${releaseArtifact.name}@${releaseArtifact.version} is already published with the approved digest; skipping it.\n`);
    continue;
  }

  const result = await run("npm", [
    "publish",
    join(directory, releaseArtifact.filename),
    "--tag",
    expectedTag,
    "--access",
    "public",
    "--provenance",
  ], { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  process.stdout.write(result.stdout);
}
