import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { syncSkill } from "./sync-skill.js";

const temporary: string[] = [];
const run = promisify(execFile);

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function fixture(): Promise<{ readonly source: string; readonly root: string }> {
  const source = await mkdtemp(join(tmpdir(), "sheen-source-skill-"));
  const root = await mkdtemp(join(tmpdir(), "sheen-consumer-"));
  temporary.push(source, root);
  await writeFile(join(source, "SKILL.md"), "# Sheen\n");
  await writeFile(join(source, "llms.txt"), "Button()\n");
  return { source, root };
}

async function initializeRepository(root: string): Promise<void> {
  await run("git", ["init", "--initial-branch=main", root]);
  await run("git", ["-C", root, "config", "user.name", "Sheen fixture"]);
  await run("git", ["-C", root, "config", "user.email", "sheen-fixture@example.test"]);
}

async function commitAll(root: string, message: string): Promise<void> {
  await run("git", ["-C", root, "add", "--all"]);
  await run("git", ["-C", root, "commit", "--quiet", "-m", message]);
}

describe("skill synchronization", () => {
  it("installs only the owned directory and is a no-op when current", async () => {
    const { source, root } = await fixture();
    const first = await syncSkill({ source, root });
    expect(first).toEqual({ target: ".agents/skills/sheen", changed: true, files: 2 });
    expect(await readFile(join(root, ".agents/skills/sheen/SKILL.md"), "utf8")).toBe("# Sheen\n");
    const second = await syncSkill({ source, root });
    expect(second.changed).toBe(false);
  });

  it("refuses to replace a modified existing directory outside Git", async () => {
    const { source, root } = await fixture();
    await syncSkill({ source, root });
    const skill = join(root, ".agents/skills/sheen/SKILL.md");
    await writeFile(skill, "local edit\n");
    await expect(syncSkill({ source, root })).rejects.toThrow("outside a Git repository");
    expect(await readFile(skill, "utf8")).toBe("local edit\n");
  });

  it("keeps dry-run read-only and rejects escaping targets", async () => {
    const { source, root } = await fixture();
    const output: string[] = [];
    const result = await syncSkill({ source, root, target: "vendor/sheen", dryRun: true, preview: value => { output.push(value); } });
    expect(result.changed).toBe(true);
    await expect(readFile(join(root, "vendor/sheen/SKILL.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(output.join("")).toContain("+++ b/vendor/sheen/SKILL.md");
    await expect(syncSkill({ source, root, target: "../escape" })).rejects.toThrow("escapes its repository");
  });

  it("never follows or overwrites a non-directory target", async () => {
    const { source, root } = await fixture();
    const target = join(root, "skill-target");
    await writeFile(target, "keep\n");
    await expect(syncSkill({ source, root, target: "skill-target" })).rejects.toThrow("not a directory");
    expect(await readFile(target, "utf8")).toBe("keep\n");
  });

  it("replaces a clean tracked skill in a temporary real repository and touches no sibling", async () => {
    const { source, root } = await fixture();
    await initializeRepository(root);
    await syncSkill({ source, root });
    const sibling = join(root, "consumer-owned.txt");
    await writeFile(sibling, "keep me\n");
    await commitAll(root, "initial skill");
    await writeFile(join(source, "SKILL.md"), "# Sheen v2\n");

    const output: string[] = [];
    const result = await syncSkill({ source, root, preview: value => { output.push(value); } });
    expect(result).toEqual({ target: ".agents/skills/sheen", changed: true, files: 2 });
    expect(output.join("")).toContain("-# Sheen");
    expect(output.join("")).toContain("+# Sheen v2");
    expect(await readFile(join(root, ".agents/skills/sheen/SKILL.md"), "utf8")).toBe("# Sheen v2\n");
    expect(await readFile(sibling, "utf8")).toBe("keep me\n");
    const status = await run("git", ["-C", root, "status", "--porcelain=v1", "--untracked-files=all"]);
    expect(status.stdout.trimEnd().split("\n")).toEqual([" M .agents/skills/sheen/SKILL.md"]);
  });

  it("fails closed for modified, untracked, and ignored files in a tracked skill directory", async () => {
    const dirtyKinds: readonly (readonly ["modified" | "untracked" | "ignored", string])[] = [
      ["modified", "uncommitted changes"],
      ["untracked", "uncommitted changes"],
      ["ignored", "contains ignored files"],
    ];
    for (const [kind, message] of dirtyKinds) {
      const { source, root } = await fixture();
      await initializeRepository(root);
      await writeFile(join(root, ".gitignore"), "*.secret\n");
      await syncSkill({ source, root });
      await commitAll(root, "initial skill");
      const skill = join(root, ".agents/skills/sheen/SKILL.md");
      if (kind === "modified") await writeFile(skill, "local edit\n");
      else {
        await mkdir(join(root, ".agents/skills/sheen/local"), { recursive: true });
        await writeFile(join(root, `.agents/skills/sheen/local/${kind === "ignored" ? "note.secret" : "note.txt"}`), "keep\n");
      }
      await writeFile(join(source, "SKILL.md"), `# Sheen ${kind}\n`);
      await expect(syncSkill({ source, root })).rejects.toThrow(message);
      expect(await readFile(skill, "utf8")).toBe(kind === "modified" ? "local edit\n" : "# Sheen\n");
    }
  });
});
