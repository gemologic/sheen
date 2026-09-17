import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./compare-admin-benchmarks.ts", import.meta.url));
const normalized = { sidebarCollapse: 0.1, presetLayout: 0.1, themeSwitch: 0.2, commandPalette: 0.1,
  tableSearch: 0.1, tableScroll: 1, detailsDock: 0.1, detailsSheet: 0.1, retainedRefresh: 0.2 };

function report(baseFailures: readonly string[], candidateFailures: readonly string[], change?: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "sheen-comparison-test-"));
  try {
    mkdirSync(join(root, "comparison"));
    writeFileSync(join(root, "comparison/provenance.json"), JSON.stringify({ base: "base-sha", candidate: "candidate-sha" }));
    for (const target of ["base", "candidate"]) {
      const failures = target === "base" ? baseFailures : candidateFailures;
      mkdirSync(join(root, target, "test-results/bench"), { recursive: true });
      writeFileSync(join(root, target, "test-results/bench/admin-app-benchmark.json"), JSON.stringify({
        schema: 3, qualification: "regression", measurement: "cdp-task-duration-thread-ticks-v1", commit: `${target}-sha`,
        runs: Array.from({ length: 5 }, () => ({})), normalized, failures,
      }));
      writeFileSync(join(root, `comparison/${target}-exit-code.txt`), failures.length ? "1" : "0");
    }
    change?.(root);
    const result = spawnSync(process.execPath, [script, "report"], { cwd: root, encoding: "utf8", timeout: 10_000,
      env: { ...process.env, GITHUB_STEP_SUMMARY: join(root, "step-summary.md") } });
    if (result.error) throw result.error;
    return { status: result.status, summary: readFileSync(join(root, "comparison/summary.md"), "utf8") };
  } finally { rmSync(root, { recursive: true, force: true }); }
}

describe("paired benchmark report CLI", () => {
  it("keeps completed historical budget failures visible without failing a passing candidate", () => {
    const result = report(["detailsDock normalized median 0.1609 exceeds 0.1540"], []);
    expect(result.status).toBe(0);
    expect(result.summary).toContain("0.1609 exceeds 0.1540");
    expect(result.summary).toContain("Historical base exceeded");
  });
  it("fails candidate budgets and base correctness failures", () => {
    expect(report([], ["table-search reported 1 Long Tasks"]).status).toBe(1);
    expect(report(["theme-switch replaced an accepted owner, focus, or draft"], []).status).toBe(1);
    expect(report(["unknown failure"], []).status).toBe(1);
  });
  it("fails timeouts even when an earlier budget artifact exists", () => {
    expect(report(["table-search reported 1 Long Tasks"], [], root => {
      writeFileSync(join(root, "comparison/base-exit-code.txt"), "124");
    }).status).toBe(1);
  });
  it("fails missing, mismatched, truncated, and invalid numeric evidence", () => {
    expect(report([], [], root => rmSync(join(root, "base/test-results/bench/admin-app-benchmark.json"))).status).toBe(1);
    for (const patch of [{ commit: "stale" }, { runs: [] }, { qualification: "baseline-capture" }, { normalized: { ...normalized, tableSearch: null } }]) {
      expect(report([], [], root => {
        const path = join(root, "candidate/test-results/bench/admin-app-benchmark.json");
        const artifact: unknown = JSON.parse(readFileSync(path, "utf8"));
        if (typeof artifact !== "object" || artifact === null) throw new Error("Expected artifact");
        writeFileSync(path, JSON.stringify({ ...artifact, ...patch }));
      }).status).toBe(1);
    }
  });
});
