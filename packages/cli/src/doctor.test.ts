import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./cli.js";
import { doctor, formatDoctorResult } from "./doctor.js";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function appFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sheen-doctor-"));
  temporary.push(root);
  const dependencies = {
    "@gemologic/sheen": "1.0.0",
    "@gemologic/sheen-patterns": "1.0.0",
    "@gemologic/sheen-tokens": "1.0.0",
  };
  await writeFile(join(root, "package.json"), `${JSON.stringify({ name: "doctor-fixture", dependencies }, null, 2)}\n`);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/app.tsx"), "ThemeProvider createThemeScript createKeyboardHydrationScript\n");
  await writeFile(join(root, "src/app.css"), '@import "@gemologic/sheen-tokens/preset.css";\n@import "@gemologic/sheen/styles.css";\n@import "@gemologic/sheen-patterns/styles.css";\n');
  for (const name of Object.keys(dependencies)) {
    const target = join(root, "node_modules", ...name.split("/"));
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "package.json"), `${JSON.stringify({ name, version: "1.0.0" })}\n`);
  }
  await writeFile(join(root, "shortcuts.json"), `${JSON.stringify({ bindings: [{ id: 1, scope: "global", keys: "mod+k", displayKeys: "Ctrl+K", label: "Open commands", group: "Application", characterOnly: false, shadowed: false }] }, null, 2)}\n`);
  return root;
}

async function snapshot(root: string, current = root): Promise<ReadonlyMap<string, string>> {
  const result = new Map<string, string>();
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) for (const [name, content] of await snapshot(root, path)) result.set(name, content);
    else if (entry.isFile()) result.set(relative(root, path), await readFile(path, "utf8"));
  }
  return result;
}

describe("sheen doctor", () => {
  it("reports aligned configuration and a typed runtime binding table without writing", async () => {
    const root = await appFixture();
    const before = await snapshot(root);
    const result = await doctor({ root, shortcutSnapshot: "shortcuts.json" });
    expect(result.diagnostics).toEqual([]);
    expect(result.shortcuts).toHaveLength(1);
    expect(result.suppressions).toEqual([]);
    expect(formatDoctorResult(result)).toContain("global  mod+k  Ctrl+K");
    expect(await snapshot(root)).toEqual(before);
  });

  it("returns an actionable nonzero CLI status for drift, bootstrap gaps, and suppression excess", async () => {
    const root = await appFixture();
    await writeFile(join(root, "package.json"), `${JSON.stringify({
      name: "doctor-fixture",
      dependencies: {
        "@gemologic/sheen": "1.0.0",
        "@gemologic/sheen-patterns": "2.0.0",
        "@gemologic/sheen-tokens": "1.0.0",
      },
    }, null, 2)}\n`);
    await writeFile(join(root, "src/app.tsx"), Array.from({ length: 11 }, () => "// eslint-disable-next-line sheen/no-raw-color -- fixture reason\nvalue();").join("\n"));
    await writeFile(join(root, "shortcuts.json"), "{}\n");
    const output: string[] = [];
    const errors: string[] = [];
    const status = await runCli(["doctor", "--root", root, "--shortcut-snapshot", "shortcuts.json"], root, {
      out: value => { output.push(value); },
      error: value => { errors.push(value); },
    });
    expect(status).toBe(1);
    expect(errors).toEqual([]);
    expect(output.join("\n")).toMatch(/declared-version-drift|theme-provider|suppression-ceiling|shortcut-snapshot/);
    expect(output.join("\n")).toContain("src/app.tsx=11");
  });
});
