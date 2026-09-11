import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
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

try {
  for (const directory of [".changeset", "packages", "patches", "tools"]) {
    await cp(join(root, directory), join(temporary, directory), { recursive: true });
  }
  for (const filename of ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) {
    await cp(join(root, filename), join(temporary, filename));
  }
  await symlink(join(root, "node_modules"), join(temporary, "node_modules"), "dir");

  if (!(await readdir(join(temporary, ".changeset"))).includes("pre.json")) {
    await execute("pnpm", ["changeset", "pre", "enter", "rc"]);
  }
  await execute("pnpm", ["version-packages"]);
  const parsed: unknown = JSON.parse(await readFile(join(temporary, "packages", "tokens", "package.json"), "utf8"));
  assert.ok(record(parsed) && typeof parsed.version === "string", "Changesets did not generate a public package version");
  assert.equal(releaseStage(parsed.version), "prerelease", "release-artifact fixture must generate a prerelease");

  const artifacts = join(temporary, "release-artifacts");
  await mkdir(artifacts);
  await execute(process.execPath, [join(temporary, "tools", "release-artifacts.ts"), "pack", artifacts, parsed.version, "next", "bootstrap"]);
  await execute(process.execPath, [join(temporary, "tools", "release-artifacts.ts"), "verify", artifacts, parsed.version, "next", "bootstrap"]);
  process.stdout.write(`Real Changesets release artifacts passed pack and digest verification at ${parsed.version}. Nothing was published.\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
