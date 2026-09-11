import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseEvalBaselineMetadata, verifyEvalBaseline } from "./agent-eval-baseline.ts";
import { parseEvalSuite } from "./agent-evals.ts";
import type { EvalAggregate, EvalReport } from "./agent-evals.ts";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function digest(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function fixture(): Promise<{ readonly root: string; readonly aggregate: EvalAggregate }> {
  const root = await mkdtemp(join(tmpdir(), "sheen-agent-baseline-"));
  roots.push(root);
  const baselineRoot = join(root, "evals", "v1", "baseline");
  await mkdir(join(baselineRoot, "outputs"), { recursive: true });
  const suiteValue: unknown = JSON.parse(await readFile(new URL("../evals/v1/prompts.json", import.meta.url), "utf8"));
  const suite = parseEvalSuite(suiteValue);
  await mkdir(join(root, "evals", "v1"), { recursive: true });
  await writeFile(join(root, "AGENTS.md"), "agent rules\n");
  await writeFile(join(root, "llms.txt"), "component context\n");
  await writeFile(join(root, "sheen.manifest.json"), "{}\n");
  await writeJson(join(root, "evals", "v1", "prompts.json"), suite);
  await writeFile(join(root, "evals", "v1", "output.schema.json"), "{}\n");

  const reports: EvalReport[] = [];
  const outputs: { readonly promptId: string; readonly path: string; readonly sha256: string }[] = [];
  for (const prompt of suite.prompts) {
    const code = `export function ${prompt.id.replaceAll("-", "_")}() {\n  return null;\n}\n`;
    const path = join(baselineRoot, "outputs", `${prompt.id}.json`);
    await writeJson(path, { code, notes: "fixture" });
    const rubric = Object.fromEntries([...suite.universalRubric, ...prompt.rubric].map(item => [item.id, true]));
    reports.push({ promptId: prompt.id, generatedLines: 3, lintErrors: 0, interactiveElements: 1, sheenInteractiveElements: 1, hallucinatedProps: [], rubric });
    outputs.push({ promptId: prompt.id, path: `outputs/${prompt.id}.json`, sha256: await digest(path) });
  }
  const reportsPath = join(baselineRoot, "reports.json");
  await writeJson(reportsPath, reports);
  const aggregate = { lintErrorsPerHundredLines: 0, sheenInteractionCoverage: 1, rubricPassRatio: 1 };
  const context = await Promise.all([
    "AGENTS.md",
    "llms.txt",
    "sheen.manifest.json",
    "evals/v1/prompts.json",
    "evals/v1/output.schema.json",
  ].map(async path => ({ path, sha256: await digest(join(root, path)) })));
  await writeJson(join(baselineRoot, "metadata.json"), {
    schemaVersion: 1,
    suiteId: suite.suiteId,
    capturedAt: "2026-09-09T13:00:00.000Z",
    harness: { name: "Codex CLI", version: "0.153.4", model: "fixture", modelSnapshot: null, reasoning: "low", sandbox: "read-only", timeoutSeconds: 285 },
    context,
    reports: { path: "reports.json", sha256: await digest(reportsPath) },
    outputs,
    aggregate,
  });
  return { root, aggregate };
}

describe("agent eval baseline", () => {
  it("verifies a complete digest-bound twenty-prompt baseline", async () => {
    const current = await fixture();
    const result = await verifyEvalBaseline(current.root);
    expect(result.prompts).toBe(20);
    expect(result.aggregate).toEqual(current.aggregate);
  });

  it("rejects changed context and raw outputs", async () => {
    const context = await fixture();
    await writeFile(join(context.root, "llms.txt"), "changed context\n");
    await expect(verifyEvalBaseline(context.root)).rejects.toThrow("context llms.txt digest changed");

    const output = await fixture();
    await writeJson(join(output.root, "evals", "v1", "baseline", "outputs", "01-settings-save.json"), { code: "export default 1;\n", notes: "changed" });
    await expect(verifyEvalBaseline(output.root)).rejects.toThrow("output 01-settings-save digest changed");
  });

  it("rejects report metrics and hard-gate failures that do not match raw artifacts", async () => {
    const current = await fixture();
    const reportsPath = join(current.root, "evals", "v1", "baseline", "reports.json");
    const value: unknown = JSON.parse(await readFile(reportsPath, "utf8"));
    if (!Array.isArray(value) || value.length === 0) throw new Error("Fixture reports are empty");
    const first: unknown = value[0];
    if (typeof first !== "object" || first === null || Array.isArray(first)) throw new Error("Invalid fixture report");
    Object.assign(first, { generatedLines: 99, hallucinatedProps: ["Button.colour"] });
    await writeJson(reportsPath, value);

    const metadataPath = join(current.root, "evals", "v1", "baseline", "metadata.json");
    const metadataValue: unknown = JSON.parse(await readFile(metadataPath, "utf8"));
    const metadata = parseEvalBaselineMetadata(metadataValue);
    await writeJson(metadataPath, { ...metadata, reports: { path: "reports.json", sha256: await digest(reportsPath) } });
    await expect(verifyEvalBaseline(current.root)).rejects.toThrow("records 99 lines, actual output has 3");

    Object.assign(first, { generatedLines: 3 });
    await writeJson(reportsPath, value);
    await writeJson(metadataPath, { ...metadata, reports: { path: "reports.json", sha256: await digest(reportsPath) } });
    await expect(verifyEvalBaseline(current.root)).rejects.toThrow("hallucinated props: Button.colour");
  });

  it("rejects timeouts beyond the repository command ceiling", () => {
    expect(() => parseEvalBaselineMetadata({
      schemaVersion: 1,
      suiteId: "suite",
      capturedAt: "2026-09-09T13:00:00.000Z",
      harness: { name: "Codex CLI", version: "1", model: "model", modelSnapshot: null, reasoning: "low", sandbox: "read-only", timeoutSeconds: 301 },
      context: [],
      reports: { path: "reports.json", sha256: "0".repeat(64) },
      outputs: [],
      aggregate: { lintErrorsPerHundredLines: 0, sheenInteractionCoverage: 1, rubricPassRatio: 1 },
    })).toThrow("Invalid agent eval baseline metadata");
  });
});
