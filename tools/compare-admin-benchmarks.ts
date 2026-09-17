import { appendFileSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Run from the comparison workspace containing harness/, base/, and candidate/.
const output = resolve("comparison");
mkdirSync(output, { recursive: true });

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

function sha(directory: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
}

function prepare(): void {
  const files = ["playwright.config.ts", "admin-app.bench.spec.ts", "frame-sampling.ts", "cpu-sampling.ts", "admin-app-owners.ts", "baselines/admin-app.v3.ts"];
  let spec = readFileSync("harness/bench/admin-app.bench.spec.ts", "utf8");
  const adapters = [
    ['name: "Theme Studio", exact: true', 'name: /^Theme (?:Studio|Inherit root theme)$/u'],
    ['page.locator(".loupe-admin-accounts")', 'page.locator(".sheen-data-table")'],
    ['/^Revision \\d+ · \\d+ chart samples$/u', '/^Revision \\d+(?: · \\d+ chart samples)?$/u'],
    ['toHaveText("Revision 2 · 20000 chart samples")', 'toHaveText(/^Revision 2(?: · 20000 chart samples)?$/u)'],
  ];
  for (const [before, after] of adapters) {
    if (!before || !after || spec.split(before).length !== 2) throw new Error("Shared harness changed; review comparison adapters before running");
    spec = spec.replace(before, after);
  }
  const expectedPlaywright = field(field(readJson("harness/package.json"), "devDependencies"), "@playwright/test");
  if (expectedPlaywright !== "1.63.0") throw new Error("Review browser compatibility before changing the comparison Playwright version");
  for (const target of ["base", "candidate"]) {
    const actual = field(field(readJson(`${target}/package.json`), "devDependencies"), "@playwright/test");
    if (actual !== expectedPlaywright) throw new Error(`${target} must use Playwright ${expectedPlaywright}`);
    mkdirSync(`${target}/bench/baselines`, { recursive: true });
    for (const file of files) copyFileSync(`harness/bench/${file}`, `${target}/bench/${file}`);
    writeFileSync(`${target}/bench/admin-app.bench.spec.ts`, spec);
  }
  writeFileSync(`${output}/shared-admin-app.bench.spec.ts`, spec);
  writeFileSync(`${output}/provenance.json`, `${JSON.stringify({
    harness: sha("harness"), base: sha("base"), candidate: sha("candidate"),
    first: process.env.FIRST, playwright: expectedPlaywright,
    runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    note: "Diagnostic paired comparison. Inspect selected commits for workload changes: pre-redesign theme-switch is Plex to Plex; Studio redesign is Inter to Plex. No baseline capture or budget changes.",
  }, null, 2)}\n`);
}

function report(): void {
  const lines = ["# AdminApp paired comparison", "", "Candidate gates determine qualification. Completed base budget failures are historical warnings; incomplete measurements and correctness failures fail either side.", "", "Ratios compare candidate/base on this runner. Check the selected commits: theme-switch can include different font transitions across the redesign.", ""];
  const measurements = new Map<string, unknown>();
  const provenance = readJson(`${output}/provenance.json`);
  let failed = false;
  for (const target of ["base", "candidate"]) {
    try {
      const artifact = readJson(`${target}/test-results/bench/admin-app-benchmark.json`);
      const status = readFileSync(`${output}/${target}-exit-code.txt`, "utf8").trim();
      const failures = field(artifact, "failures");
      const runs = field(artifact, "runs");
      if (field(artifact, "schema") !== 3 || field(artifact, "qualification") !== "regression" ||
        field(artifact, "measurement") !== "cdp-task-duration-thread-ticks-v1" || !Array.isArray(failures) ||
        !failures.every(value => typeof value === "string") || !Array.isArray(runs) || runs.length !== 5 ||
        field(artifact, "commit") !== field(provenance, target)) throw new Error("Unexpected, incomplete, or mismatched artifact");
      measurements.set(target, field(artifact, "normalized"));
      lines.push(`## ${target}`, "", `Commit: ${String(field(artifact, "commit"))}. Exit: ${status}.`, "", "```json", JSON.stringify(failures, null, 2), "```", "");
      // Only recognized historical performance limits are advisory. Never mask
      // a crash, timeout, stale artifact, or owner/layout/workload failure.
      const baseBudgetOnly = target === "base" && status === "1" && failures.length > 0 && failures.every(value =>
        typeof value === "string" && /^(?:\w+ normalized median [\d.]+ exceeds [\d.]+|[\w-]+ reported \d+ frames over [\d.]+ms|[\w-]+ reported \d+ Long Tasks|[\w-]+ p99 [\d.]+ms exceeds [\d.]+ms)$/u.test(value));
      if (baseBudgetOnly) lines.push("> Historical base exceeded a performance budget. Candidate results remain independently gated.", "");
      else if (status !== "0" || failures.length > 0) failed = true;
    } catch (error) {
      failed = true;
      lines.push(`## ${target}`, "", `Incomplete measurement: ${String(error)}. Inspect build and benchmark logs.`, "");
    }
  }
  lines.push("| Operation | Base | Candidate | Change |", "| --- | ---: | ---: | ---: |");
  for (const metric of ["sidebarCollapse", "presetLayout", "themeSwitch", "commandPalette", "tableSearch", "tableScroll", "detailsDock", "detailsSheet", "retainedRefresh"]) {
    const base = field(measurements.get("base"), metric);
    const candidate = field(measurements.get("candidate"), metric);
    if (typeof base === "number" && Number.isFinite(base) && base > 0 && typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      lines.push(`| ${metric} | ${base.toFixed(4)} | ${candidate.toFixed(4)} | ${(100 * (candidate / base - 1)).toFixed(1)}% |`);
    } else {
      failed = true;
      lines.push(`| ${metric} | incomplete | incomplete | unavailable |`);
    }
  }
  const markdown = `${lines.join("\n")}\n`;
  writeFileSync(`${output}/summary.md`, markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  process.stdout.write(markdown);
  if (failed) process.exitCode = 1;
}

if (process.argv[2] === "prepare") prepare();
else if (process.argv[2] === "report") report();
else throw new Error("Expected prepare or report");
