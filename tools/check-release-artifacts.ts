import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { releaseStage } from "./release-version.ts";

const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "sheen-release-artifacts-"));

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function execute(command: string, arguments_: readonly string[]): Promise<void> {
  await run(command, arguments_, { cwd: temporary, maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
}

async function packageVersion(): Promise<string> {
  const parsed: unknown = JSON.parse(await readFile(join(temporary, "packages", "tokens", "package.json"), "utf8"));
  assert.ok(record(parsed) && typeof parsed.version === "string", "Changesets did not generate a public package version");
  return parsed.version;
}

async function qualifyArtifacts(version: string, artifacts: string): Promise<void> {
  const stage = releaseStage(version);
  assert.notEqual(stage, "development", "release-artifact fixture must generate a publishable version");
  const tag = stage === "stable" ? "latest" : "next";
  const wrongTag = tag === "latest" ? "next" : "latest";
  const tool = join(temporary, "tools", "release-artifacts.ts");
  const verify = (): Promise<void> => execute(process.execPath, [tool, "verify", artifacts, version, tag, "publish"]);
  await mkdir(artifacts);
  await execute(process.execPath, [tool, "pack", artifacts, version, tag, "publish"]);
  await verify();
  await assert.rejects(execute(process.execPath, [tool, "verify", artifacts, version, tag, "bootstrap"]), /artifact publication mode differs/u);
  await assert.rejects(execute(process.execPath, [tool, "pack", join(temporary, "wrong-tag"), version, wrongTag, "publish"]), /must use the (?:next|latest) distribution tag/u);
  await assert.rejects(execute(process.execPath, [tool, "pack", join(temporary, "stage-mode"), version, tag, "stage"]), /publication mode must be bootstrap or publish/u);

  const manifest: unknown = JSON.parse(await readFile(join(artifacts, "release-artifacts.json"), "utf8"));
  assert.ok(record(manifest) && Array.isArray(manifest.artifacts));
  const artifact: unknown = manifest.artifacts[0];
  assert.ok(record(artifact) && typeof artifact.filename === "string");
  const tarball = join(artifacts, artifact.filename);
  const original = await readFile(tarball);
  await writeFile(tarball, Buffer.concat([original, Buffer.from("tampered")]));
  await assert.rejects(verify(), /artifact digest changed/u);
  await writeFile(tarball, original);
  const unreviewed = join(artifacts, "unreviewed.txt");
  await writeFile(unreviewed, "not part of the approved release\n", { flag: "wx" });
  await assert.rejects(verify(), /release artifact directory contains unreviewed files/u);
  await unlink(unreviewed);
  await verify();
  process.stdout.write(`Real Changesets ${stage} artifacts passed direct-publish pack, digest, tag, mode, and tamper gates at ${version}. Nothing was published.\n`);
}

try {
  for (const directory of [".changeset", "packages", "patches", "tools"]) {
    await cp(join(root, directory), join(temporary, directory), { recursive: true });
  }
  for (const filename of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    await cp(join(root, filename), join(temporary, filename));
  }
  await symlink(join(root, "node_modules"), join(temporary, "node_modules"), "dir");

  if ((await readdir(join(temporary, ".changeset"))).includes("pre.json")) {
    const pre: unknown = JSON.parse(await readFile(join(temporary, ".changeset", "pre.json"), "utf8"));
    assert.ok(record(pre) && (pre.mode === "pre" || pre.mode === "exit"));
    if (pre.mode === "pre") await execute("pnpm", ["changeset", "pre", "exit"]);
  }
  await execute("pnpm", ["version-packages"]);
  const stableVersion = await packageVersion();
  assert.equal(releaseStage(stableVersion), "stable", "prerelease exit must generate a stable version");
  await qualifyArtifacts(stableVersion, join(temporary, "stable-artifacts"));

  await writeFile(join(temporary, ".changeset", "artifact-prerelease-fixture.md"), '---\n"@gemologic/sheen": patch\n---\n\nExercise the next prerelease with real Changesets.\n', { flag: "wx" });
  await execute("pnpm", ["changeset", "pre", "enter", "rc"]);
  await execute("pnpm", ["version-packages"]);
  const prereleaseVersion = await packageVersion();
  assert.equal(releaseStage(prereleaseVersion), "prerelease", "prerelease entry must generate a prerelease version");
  await qualifyArtifacts(prereleaseVersion, join(temporary, "prerelease-artifacts"));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
