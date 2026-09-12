import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

function hashes(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.entries(value).every(([path, hash]) => !path.startsWith("/") && !path.split("/").includes("..")
      && typeof hash === "string" && /^[a-f0-9]{128}$/u.test(hash));
}

async function files(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async entry => {
    assert.ok(!entry.isSymbolicLink(), "Vendored files must not escape their package through symlinks");
    return entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)];
  }))).flat();
}

export async function verifyVendorIntegrity(root: string): Promise<void> {
  const vendor = join(root, "packages/ui/vendor");
  const expected: unknown = JSON.parse(await readFile(join(vendor, "integrity.json"), "utf8"));
  assert.ok(hashes(expected) && Object.keys(expected).length > 0, "Vendor integrity must contain safe paths and SHA-512 hashes");
  const actual = (await files(vendor)).map(path => relative(vendor, path)).filter(path => path !== "integrity.json").sort();
  const outputs = Object.keys(expected).filter(path => !path.startsWith("patches/")).sort();
  assert.deepEqual(actual, outputs, "Vendored runtime has missing or unrecorded files; regenerate with pnpm vendor:runtime");
  for (const [path, hash] of Object.entries(expected)) {
    const location = path.startsWith("patches/") ? join(root, path) : join(vendor, path);
    assert.equal(createHash("sha512").update(await readFile(location)).digest("hex"), hash,
      `Vendored runtime input/output changed: ${path}; regenerate with pnpm vendor:runtime`);
  }
}
