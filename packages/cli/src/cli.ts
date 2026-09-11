#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { applyPlan } from "./files.js";
import { doctor, formatDoctorResult } from "./doctor.js";
import { runManifest } from "./manifest.js";
import { appScaffold, componentScaffold, themeScaffold } from "./scaffolds.js";
import { syncSkill } from "./sync-skill.js";

interface CliStreams {
  readonly out: (value: string) => void;
  readonly error: (value: string) => void;
}

interface ParsedArguments {
  readonly positional: readonly string[];
  readonly root: string;
  readonly target?: string;
  readonly shortcutSnapshot?: string;
  readonly dryRun: boolean;
  readonly force: boolean;
}

function usage(): string {
  return "Usage:\n  sheen new <app|theme|component> <name> [--root <path>] [--dry-run] [--force]\n  sheen manifest [--root <path>]\n  sheen sync-skill [--root <path>] [--target <relative-path>] [--dry-run]\n  sheen doctor [--root <path>] [--shortcut-snapshot <relative-path>]\n";
}

function parseArguments(args: readonly string[], cwd: string): ParsedArguments {
  const positional: string[] = [];
  let root = cwd;
  let target: string | undefined;
  let shortcutSnapshot: string | undefined;
  let dryRun = false;
  let force = false;
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--dry-run") dryRun = true;
    else if (value === "--force") force = true;
    else if (value === "--root") {
      const target = args[index + 1];
      if (!target) throw new Error("--root requires a path");
      root = resolve(cwd, target);
      index += 1;
    } else if (value === "--target") {
      const selected = args[index + 1];
      if (!selected) throw new Error("--target requires a relative path");
      target = selected;
      index += 1;
    } else if (value === "--shortcut-snapshot") {
      const selected = args[index + 1];
      if (!selected) throw new Error("--shortcut-snapshot requires a relative path");
      shortcutSnapshot = selected;
      index += 1;
    } else if (value?.startsWith("--")) throw new Error(`Unknown option: ${value}`);
    else if (value !== undefined) positional.push(value);
  }
  return {
    positional,
    root,
    dryRun,
    force,
    ...(target === undefined ? {} : { target }),
    ...(shortcutSnapshot === undefined ? {} : { shortcutSnapshot }),
  };
}

export async function runCli(args: readonly string[], cwd: string, streams: CliStreams): Promise<number> {
  try {
    const parsed = parseArguments(args, cwd);
    const [command, kind, name, ...extra] = parsed.positional;
    if (command === "manifest" && kind === undefined) {
      if (parsed.force || parsed.dryRun || parsed.target || parsed.shortcutSnapshot) throw new Error("manifest accepts only --root");
      streams.out(await runManifest(parsed.root));
      return 0;
    }
    if (command === "doctor" && kind === undefined) {
      if (parsed.force || parsed.dryRun || parsed.target) throw new Error("doctor is always read-only and does not accept scaffold or sync options");
      const result = await doctor({
        root: parsed.root,
        ...(parsed.shortcutSnapshot === undefined ? {} : { shortcutSnapshot: parsed.shortcutSnapshot }),
      });
      streams.out(formatDoctorResult(result));
      return result.diagnostics.length === 0 ? 0 : 1;
    }
    if (command === "sync-skill" && kind === undefined) {
      if (parsed.force) throw new Error("sync-skill has no force bypass for dirty files");
      if (parsed.shortcutSnapshot) throw new Error("--shortcut-snapshot is only valid with doctor");
      const result = await syncSkill({
        root: parsed.root,
        dryRun: parsed.dryRun,
        preview: streams.out,
        ...(parsed.target === undefined ? {} : { target: parsed.target }),
      });
      if (!parsed.dryRun) streams.out(`${result.changed ? "Synchronized" : "Verified"} ${result.files} skill files at ${result.target}.\n`);
      return 0;
    }
    if (command !== "new" || !kind || !name || extra.length > 0) throw new Error(usage().trim());
    if (parsed.target || parsed.shortcutSnapshot) throw new Error("--target and --shortcut-snapshot are not scaffold options");
    const plan = kind === "app" ? await appScaffold(name) : kind === "theme" ? themeScaffold(name) : kind === "component" ? componentScaffold(name) : undefined;
    if (!plan) throw new Error(`Unknown scaffold: ${kind}`);
    const result = await applyPlan(plan, {
      root: parsed.root,
      dryRun: parsed.dryRun,
      force: parsed.force,
      preview: streams.out,
    });
    if (!parsed.dryRun) streams.out(`Created ${result.created.length}, replaced ${result.replaced.length}, unchanged ${result.unchanged.length}.\n`);
    return 0;
  } catch (error) {
    streams.error(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invoked === import.meta.url) {
  process.exitCode = await runCli(process.argv.slice(2), process.cwd(), {
    out: value => process.stdout.write(value),
    error: value => process.stderr.write(value),
  });
}
