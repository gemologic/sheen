import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export interface PlannedFile {
  readonly path: string;
  readonly content: string;
}

export interface ApplyPlanOptions {
  readonly root: string;
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly preview?: (output: string) => void | Promise<void>;
}

export interface ApplyPlanResult {
  readonly created: readonly string[];
  readonly replaced: readonly string[];
  readonly unchanged: readonly string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function destination(root: string, path: string): string {
  if (!path || isAbsolute(path)) throw new Error(`Scaffold path must be relative: ${path}`);
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, path);
  const fromRoot = relative(resolvedRoot, resolvedPath);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) throw new Error(`Scaffold path escapes its root: ${path}`);
  return resolvedPath;
}

function lines(value: string): readonly string[] {
  const result = value.split("\n");
  if (result.at(-1) === "") return result.slice(0, -1);
  return result;
}

export function replacementDiff(path: string, previous: string | undefined, next: string): string {
  const before = previous === undefined ? "/dev/null" : `a/${path}`;
  const previousLines = previous === undefined ? [] : lines(previous);
  const nextLines = lines(next);
  return [
    `--- ${before}`,
    `+++ b/${path}`,
    `@@ -1,${previousLines.length} +1,${nextLines.length} @@`,
    ...previousLines.map(line => `-${line}`),
    ...nextLines.map(line => `+${line}`),
  ].join("\n");
}

export async function applyPlan(plan: readonly PlannedFile[], options: ApplyPlanOptions): Promise<ApplyPlanResult> {
  if (plan.length === 0) throw new Error("Scaffold plan is empty");
  const unique = new Set<string>();
  const inspected: { readonly file: PlannedFile; readonly destination: string; readonly previous?: string }[] = [];
  for (const file of plan) {
    if (unique.has(file.path)) throw new Error(`Scaffold plan contains duplicate path: ${file.path}`);
    unique.add(file.path);
    const target = destination(options.root, file.path);
    const previous = await exists(target) ? await readFile(target, "utf8") : undefined;
    inspected.push(previous === undefined ? { file, destination: target } : { file, destination: target, previous });
  }

  const existing = inspected.filter(item => item.previous !== undefined).map(item => item.file.path);
  if (existing.length > 0 && !options.force && !options.dryRun) {
    throw new Error(`Refusing to overwrite existing scaffold target${existing.length === 1 ? "" : "s"}:\n${existing.join("\n")}`);
  }

  const changed = inspected.filter(item => item.previous !== item.file.content);
  const preview = changed.length === 0
    ? "No scaffold changes."
    : changed.map(item => replacementDiff(item.file.path, item.previous, item.file.content)).join("\n");
  await options.preview?.(`${preview}\n`);
  if (!options.dryRun) {
    for (const item of changed) {
      await mkdir(dirname(item.destination), { recursive: true });
      await writeFile(item.destination, item.file.content);
    }
  }

  return {
    created: inspected.filter(item => item.previous === undefined).map(item => item.file.path),
    replaced: changed.filter(item => item.previous !== undefined).map(item => item.file.path),
    unchanged: inspected.filter(item => item.previous === item.file.content).map(item => item.file.path),
  };
}
