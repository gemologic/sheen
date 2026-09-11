import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Project } from "ts-morph";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./cli.js";
import { applyPlan } from "./files.js";
import { componentScaffold, createAppScaffold, themeScaffold } from "./scaffolds.js";
import type { AppScaffoldAssets } from "./scaffolds.js";

const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sheen-cli-"));
  temporary.push(root);
  return root;
}

const workspace = new URL("../../../", import.meta.url);

async function appAssets(): Promise<AppScaffoldAssets> {
  const load = (path: string) => readFile(new URL(path, workspace), "utf8");
  const [skill, context, solidPatch, kobalteCorePatch, kobalteUtilsPatch] = await Promise.all([
    load("dist/skill/SKILL.md"),
    load("dist/skill/llms.txt"),
    load("patches/solid-js@1.9.15.patch"),
    load("patches/@kobalte__core@0.13.13.patch"),
    load("patches/@kobalte__utils@0.9.2.patch"),
  ]);
  return { skill, context, solidPatch, kobalteCorePatch, kobalteUtilsPatch };
}

async function linkBuildDependencies(appRoot: string): Promise<void> {
  const modules = join(appRoot, "node_modules");
  const dependencies: readonly (readonly [string, string])[] = [
    ["vite", "node_modules/vite"],
    ["tailwindcss", "apps/loupe/node_modules/tailwindcss"],
    ["solid-js", "apps/loupe/node_modules/solid-js"],
    ["@tailwindcss/vite", "apps/loupe/node_modules/@tailwindcss/vite"],
    ["@solidjs/start", "apps/loupe/node_modules/@solidjs/start"],
    ["@solidjs/router", "apps/loupe/node_modules/@solidjs/router"],
    ["@solidjs/meta", "apps/loupe/node_modules/@solidjs/meta"],
    ["@gemologic/sheen", "apps/loupe/node_modules/@gemologic/sheen"],
    ["@gemologic/sheen-icons", "apps/loupe/node_modules/@gemologic/sheen-icons"],
    ["@gemologic/sheen-patterns", "apps/loupe/node_modules/@gemologic/sheen-patterns"],
    ["@gemologic/sheen-tokens", "apps/loupe/node_modules/@gemologic/sheen-tokens"],
  ];
  for (const [name, source] of dependencies) {
    const destination = join(modules, name);
    await mkdir(dirname(destination), { recursive: true });
    await symlink(fileURLToPath(new URL(source, workspace)), destination, "dir");
  }
}

async function buildGeneratedApp(appRoot: string): Promise<void> {
  const vite = fileURLToPath(new URL("node_modules/vite/bin/vite.js", workspace));
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [vite, "build"], { cwd: appRoot, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { output += String(chunk); });
    child.stderr.on("data", chunk => { output += String(chunk); });
    child.once("error", reject);
    child.once("exit", code => {
      if (code === 0) resolve();
      else reject(new Error(`Generated application build failed with status ${String(code)}:\n${output}`));
    });
  });
}

describe("scaffold filesystem contract", () => {
  it("wires dry-run, refusal, and force-diff behavior through the real CLI command", async () => {
    const root = await temporaryRoot();
    const output: string[] = [];
    const errors: string[] = [];
    const streams = { out: (value: string): void => { output.push(value); }, error: (value: string): void => { errors.push(value); } };
    expect(await runCli(["new", "theme", "midnight-blue", "--root", root, "--dry-run"], root, streams)).toBe(0);
    const target = join(root, "src/themes/midnight-blue.ts");
    await expect(readFile(target, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(output.join("")).toContain("+++ b/src/themes/midnight-blue.ts");

    output.length = 0;
    expect(await runCli(["new", "theme", "midnight-blue", "--root", root], root, streams)).toBe(0);
    const generated = await readFile(target, "utf8");
    expect(await runCli(["new", "theme", "midnight-blue", "--root", root], root, streams)).toBe(1);
    expect(errors.join("")).toContain("Refusing to overwrite existing scaffold target");
    expect(await readFile(target, "utf8")).toBe(generated);

    errors.length = 0;
    output.length = 0;
    await writeFile(target, "local edit\n");
    expect(await runCli(["new", "theme", "midnight-blue", "--root", root, "--force"], root, streams)).toBe(0);
    expect(output.join("")).toContain("-local edit");
    expect(output.join("")).toContain('+import { currentSchemaVersion, defineTheme, obsidian } from "@gemologic/sheen-tokens";');
    expect(await readFile(target, "utf8")).toBe(generated);
    expect(errors).toEqual([]);
  });

  it("prints a dry run without writing and refuses an existing target", async () => {
    const root = await temporaryRoot();
    const output: string[] = [];
    const plan = themeScaffold("midnight-blue");
    await applyPlan(plan, { root, dryRun: true, preview: value => { output.push(value); } });
    await expect(readFile(join(root, "src/themes/midnight-blue.ts"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(output.join("")).toContain("+++ b/src/themes/midnight-blue.ts");
    await applyPlan(plan, { root });
    await expect(applyPlan(plan, { root })).rejects.toThrow("Refusing to overwrite");
  });

  it("prints the replacement before a forced overwrite", async () => {
    const root = await temporaryRoot();
    const initial = themeScaffold("midnight-blue");
    await applyPlan(initial, { root });
    const replacement = initial.map(file => ({ ...file, content: file.content.replace("derived from Obsidian", "customized from Obsidian") }));
    await applyPlan(replacement, {
      root,
      force: true,
      preview: async asyncOutput => {
        expect(asyncOutput).toContain("-  description: \"Midnight Blue theme derived from Obsidian\"");
        expect(await readFile(join(root, "src/themes/midnight-blue.ts"), "utf8")).toContain("derived from Obsidian");
      },
    });
    expect(await readFile(join(root, "src/themes/midnight-blue.ts"), "utf8")).toContain("customized from Obsidian");
  });

  it("rejects invalid names and paths outside the selected root", async () => {
    const root = await temporaryRoot();
    expect(() => themeScaffold("Midnight")).toThrow("lower kebab-case");
    expect(() => componentScaffold("bad-name")).toThrow("PascalCase");
    await expect(applyPlan([{ path: "../outside", content: "nope" }], { root })).rejects.toThrow("escapes its root");
  });
});

describe("scaffold generated output", () => {
  it("typechecks the component and theme templates against the real workspace contracts", () => {
    const project = new Project({ tsConfigFilePath: new URL("tsconfig.json", workspace).pathname, compilerOptions: { noEmit: true } });
    const sources = [
      ...componentScaffold("CliContractProbe").map(file => project.createSourceFile(new URL(file.path, workspace).pathname, file.content, { overwrite: true })),
      ...themeScaffold("cli-contract-probe").map(file => project.createSourceFile(new URL(`apps/loupe/${file.path}`, workspace).pathname, file.content, { overwrite: true })),
    ];
    const generatedPaths = new Set(sources.map(source => source.getFilePath()));
    const diagnostics = project.getPreEmitDiagnostics().filter(diagnostic => {
      const source = diagnostic.getSourceFile();
      return source !== undefined && generatedPaths.has(source.getFilePath());
    });
    expect(project.formatDiagnosticsWithColorAndContext(diagnostics)).toBe("");
  }, 15_000);

  it("builds a complete SolidStart app with hydration bootstraps and exact qualified patches", async () => {
    const root = await temporaryRoot();
    const assets = await appAssets();
    const plan = createAppScaffold("contract-app", assets);
    await applyPlan(plan, { root });
    const appRoot = join(root, "contract-app");
    await linkBuildDependencies(appRoot);

    const project = new Project({ tsConfigFilePath: new URL("apps/loupe/tsconfig.json", workspace).pathname, compilerOptions: { noEmit: true } });
    const sources = plan.filter(file => /(?:^|\/)(?:vite\.config|[^/]+)\.tsx?$/u.test(file.path)).map(file =>
      project.createSourceFile(new URL(`apps/loupe/.generated-contract/${file.path}`, workspace).pathname, file.content, { overwrite: true }));
    const generatedPaths = new Set(sources.map(source => source.getFilePath()));
    const diagnostics = project.getPreEmitDiagnostics().filter(diagnostic => {
      const source = diagnostic.getSourceFile();
      return source !== undefined && generatedPaths.has(source.getFilePath());
    });
    expect(project.formatDiagnosticsWithColorAndContext(diagnostics)).toBe("");

    await buildGeneratedApp(appRoot);

    expect(await readFile(join(appRoot, "patches/solid-js@1.9.15.patch"), "utf8")).toBe(assets.solidPatch);
    expect(await readFile(join(appRoot, "patches/@kobalte__core@0.13.13.patch"), "utf8")).toBe(assets.kobalteCorePatch);
    expect(await readFile(join(appRoot, "src/entry-server.tsx"), "utf8")).toContain("createKeyboardHydrationScript");
    expect(await readFile(join(appRoot, "src/entry-server.tsx"), "utf8")).toContain("createThemeScript");
    expect([...await readFile(join(appRoot, "src/entry-server.tsx"), "utf8").then(source => source.matchAll(/rel="preload"/gu))]).toHaveLength(3);
    expect(await readFile(join(appRoot, "src/app.tsx"), "utf8")).toContain('hydration="client" defaultMode="dark"');
    expect(await readFile(join(appRoot, ".agents/skills/sheen/llms.txt"), "utf8")).toBe(assets.context);
  }, 60_000);
});
