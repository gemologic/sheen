import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { publicPackageDirectories } from "./public-packages.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function json(path: string): Promise<unknown> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  return parsed;
}

describe("release configuration", () => {
  it("builds public package entries before generators import them", async () => {
    const rootManifest = await json(join(root, "package.json"));
    assert.ok(record(rootManifest) && record(rootManifest.scripts));
    const manifest = rootManifest.scripts.manifest;
    const pages = rootManifest.scripts["build:pages"];
    const check = rootManifest.scripts.check;
    assert.equal(manifest, "pnpm build:runtime-packages && pnpm manifest:generate");
    assert.ok(typeof pages === "string" && pages.startsWith("pnpm manifest && "));
    assert.ok(typeof check === "string" && check.startsWith("pnpm manifest && "));
  });

  it("keeps every public package on one fixed public version line", async () => {
    const config = await json(join(root, ".changeset", "config.json"));
    assert.ok(record(config));
    assert.equal(config.access, "public");
    assert.equal(config.baseBranch, "main");
    assert.deepEqual(config.privatePackages, { version: false, tag: false });
    assert.ok(Array.isArray(config.fixed));
    assert.equal(config.fixed.length, 1);
    const fixed = config.fixed[0];
    assert.ok(Array.isArray(fixed) && fixed.every(item => typeof item === "string"));

    const names: string[] = [];
    const versions: string[] = [];
    for (const directory of publicPackageDirectories) {
      const manifest = await json(join(root, "packages", directory, "package.json"));
      assert.ok(record(manifest) && typeof manifest.name === "string" && typeof manifest.version === "string");
      names.push(manifest.name);
      versions.push(manifest.version);
    }
    assert.deepEqual([...fixed].sort(), names.sort());
    assert.equal(new Set(versions).size, 1);
  });

  it("creates version pull requests without any publish path", async () => {
    const release = await readFile(join(root, ".github", "workflows", "release.yml"), "utf8");
    assert.match(release, /uses: changesets\/action@[a-f0-9]{40} # v2\.1\.1/u);
    assert.match(release, /version-script: pnpm version-packages/u);
    assert.match(release, /create-github-releases: false/u);
    assert.match(release, /push-git-tags: false/u);
    assert.doesNotMatch(release, /publish-script|NODE_AUTH_TOKEN|NPM_TOKEN|changeset publish|npm publish|pnpm publish/u);

    const check = await readFile(join(root, ".github", "workflows", "check.yml"), "utf8");
    assert.match(check, /fetch-depth: 0/u);
    assert.match(check, /changeset status --since="origin\/\$\{\{ github\.base_ref \}\}"/u);
  });

  it("collects every benchmark result before failing the combined gate", async () => {
    const check = await readFile(join(root, ".github", "workflows", "check.yml"), "utf8");
    const benchmark = check.slice(check.indexOf("  benchmark:\n"));
    assert.match(benchmark, /^  benchmark:\n    runs-on: ubuntu-24\.04\n/u);
    assert.match(benchmark, /^    env:\n      SHEEN_BENCHMARK_RUNNER_CLASS: ubuntu-24\.04$/mu);
    const profiles = ["table", "admin", "date", "chart", "composer"];
    for (const profile of profiles) {
      assert.ok(check.includes(`id: benchmark_${profile}\n        continue-on-error: true`));
      assert.ok(check.includes(`steps.benchmark_${profile}.outcome != 'success'`));
    }
    assert.ok(check.indexOf("name: application-benchmarks-") < check.indexOf("name: Require every benchmark gate"));
  });

  it("keeps npm publication manual, artifact-bound, and separately approved", async () => {
    const publish = await readFile(join(root, ".github", "workflows", "publish.yml"), "utf8");
    assert.match(publish, /^  workflow_dispatch:$/mu);
    assert.doesNotMatch(publish, /^  (?:push|pull_request|schedule):/mu);
    assert.match(publish, /if: github\.ref == 'refs\/heads\/main'/u);
    assert.match(publish, /persist-credentials: false/u);
    assert.match(publish, /pnpm test:npm-consumer/u);
    assert.match(publish, /release-artifacts\.ts pack/u);
    assert.equal((publish.match(/release-artifacts\.ts verify/gu) ?? []).length, 2);
    assert.match(publish, /needs: prepare/u);
    assert.match(publish, /environment:\n      name: npm/u);
    assert.match(publish, /id-token: write/u);
    assert.match(publish, /npm stage publish/u);
    assert.match(publish, /bootstrap-npm\.ts/u);
    assert.match(publish, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/u);
    assert.match(publish, /if: inputs\.publication_mode == 'bootstrap'/u);
  });

  it("pins every GitHub Action to an immutable commit", async () => {
    for (const filename of ["check.yml", "pages.yml", "publish.yml", "release.yml"]) {
      const workflow = await readFile(join(root, ".github", "workflows", filename), "utf8");
      const actions = workflow.split("\n").filter(line => line.includes("uses:"));
      assert.ok(actions.length > 0, `${filename} must use at least one action`);
      for (const action of actions) {
        assert.match(action, /uses: [^@\s]+@[a-f0-9]{40} # v\d+(?:\.\d+)*$/u, `${filename} has an unpinned action: ${action.trim()}`);
      }
    }
  });
});
