import { execFile } from "node:child_process";
import { cp, lstat, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { replacementDiff } from "./files.js";

const run = promisify(execFile);

export interface SyncSkillOptions {
  readonly root: string;
  readonly target?: string;
  readonly source?: string;
  readonly dryRun?: boolean;
  readonly preview?: (output: string) => void | Promise<void>;
}

export interface SyncSkillResult {
  readonly target: string;
  readonly changed: boolean;
  readonly files: number;
}

async function pathKind(path: string): Promise<"missing" | "directory" | "other"> {
  try {
    return (await lstat(path)).isDirectory() ? "directory" : "other";
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return "missing";
    throw error;
  }
}

function targetPath(root: string, target: string): string {
  if (!target || isAbsolute(target)) throw new Error(`Skill target must be relative to the repository: ${target}`);
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(resolvedRoot, target);
  const fromRoot = relative(resolvedRoot, resolvedTarget);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) throw new Error(`Skill target escapes its repository: ${target}`);
  return resolvedTarget;
}

async function readTree(root: string, current = root): Promise<ReadonlyMap<string, string>> {
  const values = new Map<string, string>();
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      for (const [name, content] of await readTree(root, path)) values.set(name, content);
    } else if (entry.isFile()) values.set(relative(root, path), await readFile(path, "utf8"));
    else throw new Error(`Skill directories may contain only regular files: ${relative(root, path)}`);
  }
  return values;
}

function equalTrees(left: ReadonlyMap<string, string>, right: ReadonlyMap<string, string>): boolean {
  return left.size === right.size && [...left].every(([path, content]) => right.get(path) === content);
}

function treeDiff(target: string, previous: ReadonlyMap<string, string>, next: ReadonlyMap<string, string>): string {
  const paths = [...new Set([...previous.keys(), ...next.keys()])].sort();
  return paths.flatMap(path => {
    const before = previous.get(path);
    const after = next.get(path);
    if (before === after) return [];
    return [replacementDiff(`${target}/${path}`, before, after ?? "")];
  }).join("\n");
}

async function gitRoot(root: string): Promise<string | undefined> {
  try {
    const result = await run("git", ["-C", root, "rev-parse", "--show-toplevel"], { timeout: 30_000 });
    return result.stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function assertTrackedAndClean(root: string, target: string): Promise<void> {
  const repository = await gitRoot(root);
  if (!repository) throw new Error(`Refusing to replace ${target}: the existing skill directory is outside a Git repository`);
  const absolute = targetPath(root, target);
  const fromRepository = relative(repository, absolute);
  if (fromRepository === ".." || fromRepository.startsWith(`..${sep}`) || isAbsolute(fromRepository)) {
    throw new Error(`Refusing to replace ${target}: the skill directory is outside the containing Git repository`);
  }
  const tracked = await run("git", ["-C", repository, "ls-files", "--", fromRepository], { timeout: 30_000 });
  if (!tracked.stdout.trim()) throw new Error(`Refusing to replace ${target}: the existing skill directory is not tracked by Git`);
  const ignored = await run("git", ["-C", repository, "ls-files", "--others", "--ignored", "--exclude-standard", "--", fromRepository], { timeout: 30_000 });
  if (ignored.stdout.trim()) throw new Error(`Refusing to replace ${target}: the skill directory contains ignored files\n${ignored.stdout.trimEnd()}`);
  const status = await run("git", ["-C", repository, "status", "--porcelain=v1", "--untracked-files=all", "--", fromRepository], { timeout: 30_000 });
  if (status.stdout.trim()) throw new Error(`Refusing to replace ${target}: the skill directory has uncommitted changes\n${status.stdout.trimEnd()}`);
}

export function bundledSkillPath(): string {
  return fileURLToPath(new URL("./skill", import.meta.url));
}

export async function syncSkill(options: SyncSkillOptions): Promise<SyncSkillResult> {
  const target = options.target ?? ".agents/skills/sheen";
  const source = resolve(options.source ?? bundledSkillPath());
  const destination = targetPath(options.root, target);
  if (await pathKind(source) !== "directory") throw new Error(`Bundled Sheen skill is missing: ${source}`);
  const sourceTree = await readTree(source);
  if (!sourceTree.has("SKILL.md") || !sourceTree.has("llms.txt")) throw new Error("Bundled Sheen skill must contain SKILL.md and llms.txt");

  const destinationKind = await pathKind(destination);
  if (destinationKind === "other") throw new Error(`Refusing to replace ${target}: the skill target is not a directory`);
  const destinationExists = destinationKind === "directory";
  const destinationTree = destinationExists ? await readTree(destination) : new Map<string, string>();
  if (equalTrees(sourceTree, destinationTree)) {
    await options.preview?.("Sheen skill is already current.\n");
    return { target, changed: false, files: sourceTree.size };
  }
  const diff = treeDiff(target, destinationTree, sourceTree);
  await options.preview?.(`${diff}\n`);
  if (options.dryRun) return { target, changed: true, files: sourceTree.size };
  if (destinationExists) await assertTrackedAndClean(options.root, target);

  const stagingRoot = await mkdtemp(join(tmpdir(), "sheen-skill-"));
  const staged = join(stagingRoot, "sheen");
  try {
    await cp(source, staged, { recursive: true, errorOnExist: true });
    await rm(destination, { recursive: true, force: true });
    await cp(staged, destination, { recursive: true, errorOnExist: true });
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
  return { target, changed: true, files: sourceTree.size };
}
