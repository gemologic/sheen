import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./cli.js";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe("manifest command", () => {
  it("runs the repository's real pnpm manifest script and forwards output", async () => {
    const root = await mkdtemp(join(tmpdir(), "sheen-manifest-"));
    temporary.push(root);
    await writeFile(join(root, "package.json"), `${JSON.stringify({ private: true, scripts: { manifest: "node -e \"process.stdout.write('fixture manifest passed')\"" } }, null, 2)}\n`);
    const output: string[] = [];
    const errors: string[] = [];
    const status = await runCli(["manifest", "--root", root], root, {
      out: value => { output.push(value); },
      error: value => { errors.push(value); },
    });
    expect(status).toBe(0);
    expect(errors).toEqual([]);
    expect(output.join("")).toContain("fixture manifest passed");
  });
});
