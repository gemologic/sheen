import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { verifyVendorIntegrity } from "./vendor-integrity.ts";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

async function copyRuntime(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sheen-vendor-integrity-"));
  temporary.push(root);
  await mkdir(join(root, "packages/ui"), { recursive: true });
  await cp(join(workspace, "packages/ui/vendor"), join(root, "packages/ui/vendor"), { recursive: true });
  await cp(join(workspace, "patches"), join(root, "patches"), { recursive: true });
  return root;
}

describe("vendored runtime integrity", () => {
  it("qualifies the committed runtime and its generation inputs", async () => {
    await verifyVendorIntegrity(workspace);
  });
  it("ends generated code with exactly one newline, including source-map-only chunks", async () => {
    const entries = await readdir(join(workspace, "packages/ui/vendor"), { recursive: true, withFileTypes: true });
    const code = entries.filter(entry => entry.isFile() && /\.(?:js|jsx|cjs|d\.ts|d\.cts)$/u.test(entry.name));
    expect(code.length).toBeGreaterThan(0);
    for (const entry of code) {
      const path = join(entry.parentPath, entry.name);
      expect(await readFile(path, "utf8"), path).toMatch(/\S\n$/u);
    }
  });
  it("rejects changed runtime bytes", async () => {
    const root = await copyRuntime();
    const target = join(root, "packages/ui/vendor/solid-web/web.js");
    await writeFile(target, `${await readFile(target, "utf8")}\n// changed\n`);
    await expect(verifyVendorIntegrity(root)).rejects.toThrow("solid-web/web.js");
  });
  it("rejects unrecorded files", async () => {
    const root = await copyRuntime();
    await writeFile(join(root, "packages/ui/vendor/unrecorded.js"), "export {};\n");
    await expect(verifyVendorIntegrity(root)).rejects.toThrow("missing or unrecorded");
  });
  it("rejects changed patch inputs", async () => {
    const root = await copyRuntime();
    await writeFile(join(root, "patches/solid-js@1.9.15.patch"), "changed\n");
    await expect(verifyVendorIntegrity(root)).rejects.toThrow("patches/solid-js@1.9.15.patch");
  });
});
