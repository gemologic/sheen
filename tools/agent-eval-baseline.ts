import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEvalReports, parseEvalSuite, scoreEvalSuite } from "./agent-evals.ts";
import type { EvalAggregate } from "./agent-evals.ts";
import { auditEvalBaselineSources } from "./agent-eval-source-audit.ts";

const CONTEXT_PATHS = Object.freeze([
  "AGENTS.md",
  "llms.txt",
  "sheen.manifest.json",
  "evals/v1/prompts.json",
  "evals/v1/output.schema.json",
]);

interface BaselineHarness {
  readonly name: string;
  readonly version: string;
  readonly model: string;
  readonly modelSnapshot: string | null;
  readonly reasoning: string;
  readonly sandbox: string;
  readonly timeoutSeconds: number;
}

interface BaselineArtifact {
  readonly path: string;
  readonly sha256: string;
}

interface BaselineOutput extends BaselineArtifact {
  readonly promptId: string;
}

export interface EvalBaselineMetadata {
  readonly schemaVersion: 1;
  readonly suiteId: string;
  readonly capturedAt: string;
  readonly harness: BaselineHarness;
  readonly context: readonly BaselineArtifact[];
  readonly reports: BaselineArtifact;
  readonly outputs: readonly BaselineOutput[];
  readonly aggregate: EvalAggregate;
}

export interface VerifiedEvalBaseline {
  readonly metadata: EvalBaselineMetadata;
  readonly aggregate: EvalAggregate;
  readonly prompts: number;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const expected = new Set(allowed);
  return Object.keys(value).length === expected.size && Object.keys(value).every(key => expected.has(key));
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function digest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function artifact(value: unknown): value is BaselineArtifact {
  return record(value)
    && exactKeys(value, ["path", "sha256"])
    && text(value.path)
    && digest(value.sha256);
}

function output(value: unknown): value is BaselineOutput {
  return record(value)
    && exactKeys(value, ["promptId", "path", "sha256"])
    && text(value.promptId)
    && text(value.path)
    && digest(value.sha256);
}

function harness(value: unknown): value is BaselineHarness {
  return record(value)
    && exactKeys(value, ["name", "version", "model", "modelSnapshot", "reasoning", "sandbox", "timeoutSeconds"])
    && text(value.name)
    && text(value.version)
    && text(value.model)
    && (value.modelSnapshot === null || text(value.modelSnapshot))
    && text(value.reasoning)
    && text(value.sandbox)
    && typeof value.timeoutSeconds === "number"
    && Number.isSafeInteger(value.timeoutSeconds)
    && value.timeoutSeconds > 0
    && value.timeoutSeconds <= 300;
}

function ratio(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function aggregate(value: unknown): value is EvalAggregate {
  return record(value)
    && exactKeys(value, ["lintErrorsPerHundredLines", "sheenInteractionCoverage", "rubricPassRatio"])
    && typeof value.lintErrorsPerHundredLines === "number"
    && Number.isFinite(value.lintErrorsPerHundredLines)
    && value.lintErrorsPerHundredLines >= 0
    && ratio(value.sheenInteractionCoverage)
    && ratio(value.rubricPassRatio);
}

function baselineMetadata(value: unknown): value is EvalBaselineMetadata {
  return record(value)
    && exactKeys(value, ["schemaVersion", "suiteId", "capturedAt", "harness", "context", "reports", "outputs", "aggregate"])
    && value.schemaVersion === 1
    && text(value.suiteId)
    && text(value.capturedAt)
    && !Number.isNaN(Date.parse(value.capturedAt))
    && harness(value.harness)
    && Array.isArray(value.context)
    && value.context.every(artifact)
    && artifact(value.reports)
    && Array.isArray(value.outputs)
    && value.outputs.every(output)
    && aggregate(value.aggregate);
}

export function parseEvalBaselineMetadata(value: unknown): EvalBaselineMetadata {
  if (!baselineMetadata(value)) throw new Error("Invalid agent eval baseline metadata");
  return value;
}

function contained(root: string, path: string): string {
  if (isAbsolute(path)) throw new Error(`Agent eval artifact path must be relative: ${path}`);
  const absolute = resolve(root, path);
  const relation = relative(root, absolute);
  if (relation === ".." || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
    throw new Error(`Agent eval artifact escapes the baseline directory: ${path}`);
  }
  return absolute;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function requireDigest(path: string, expected: string, label: string): Promise<void> {
  const actual = await sha256(path);
  if (actual !== expected) throw new Error(`${label} digest changed: expected ${expected}, received ${actual}`);
}

function generatedLines(code: string): number {
  return code.split(/\r?\n/u).filter(line => line.trim().length > 0).length;
}

function rawOutput(value: unknown): value is { readonly code: string; readonly notes: string } {
  return record(value)
    && exactKeys(value, ["code", "notes"])
    && text(value.code)
    && typeof value.notes === "string";
}

function sameAggregate(left: EvalAggregate, right: EvalAggregate): boolean {
  return left.lintErrorsPerHundredLines === right.lintErrorsPerHundredLines
    && left.sheenInteractionCoverage === right.sheenInteractionCoverage
    && left.rubricPassRatio === right.rubricPassRatio;
}

export async function verifyEvalBaseline(root: string): Promise<VerifiedEvalBaseline> {
  const baselineRoot = join(root, "evals", "v1", "baseline");
  const metadataValue: unknown = JSON.parse(await readFile(join(baselineRoot, "metadata.json"), "utf8"));
  const metadata = parseEvalBaselineMetadata(metadataValue);
  const suiteValue: unknown = JSON.parse(await readFile(join(root, "evals", "v1", "prompts.json"), "utf8"));
  const suite = parseEvalSuite(suiteValue);
  if (metadata.suiteId !== suite.suiteId) throw new Error(`Agent eval suite mismatch: expected ${suite.suiteId}, received ${metadata.suiteId}`);

  const contextByPath = new Map(metadata.context.map(item => [item.path, item]));
  if (contextByPath.size !== metadata.context.length) throw new Error("Agent eval context contains duplicate paths");
  if (metadata.context.length !== CONTEXT_PATHS.length || CONTEXT_PATHS.some(path => !contextByPath.has(path))) {
    throw new Error(`Agent eval context must bind exactly: ${CONTEXT_PATHS.join(", ")}`);
  }
  await Promise.all(CONTEXT_PATHS.map(async path => {
    const item = contextByPath.get(path);
    if (!item) throw new Error(`Missing agent eval context digest for ${path}`);
    await requireDigest(contained(root, path), item.sha256, `Agent eval context ${path}`);
  }));

  if (metadata.reports.path !== "reports.json") throw new Error("Agent eval reports path must be reports.json");
  const reportsPath = contained(baselineRoot, metadata.reports.path);
  await requireDigest(reportsPath, metadata.reports.sha256, "Agent eval reports");
  const reportsValue: unknown = JSON.parse(await readFile(reportsPath, "utf8"));
  const reports = parseEvalReports(reportsValue);
  const reportByPrompt = new Map(reports.map(item => [item.promptId, item]));

  const outputsByPrompt = new Map(metadata.outputs.map(item => [item.promptId, item]));
  if (outputsByPrompt.size !== metadata.outputs.length) throw new Error("Agent eval outputs contain duplicate prompt IDs");
  if (metadata.outputs.length !== suite.prompts.length) throw new Error(`Agent eval baseline requires ${suite.prompts.length} outputs, received ${metadata.outputs.length}`);
  await Promise.all(suite.prompts.map(async prompt => {
    const item = outputsByPrompt.get(prompt.id);
    if (!item) throw new Error(`Missing agent eval output ${prompt.id}`);
    const expectedPath = `outputs/${prompt.id}.json`;
    if (item.path !== expectedPath) throw new Error(`Agent eval output ${prompt.id} must use ${expectedPath}`);
    const outputPath = contained(baselineRoot, item.path);
    await requireDigest(outputPath, item.sha256, `Agent eval output ${prompt.id}`);
    const value: unknown = JSON.parse(await readFile(outputPath, "utf8"));
    if (!rawOutput(value)) throw new Error(`Invalid raw agent eval output ${prompt.id}`);
    const report = reportByPrompt.get(prompt.id);
    if (!report) throw new Error(`Missing agent eval report ${prompt.id}`);
    const lines = generatedLines(value.code);
    if (report.generatedLines !== lines) throw new Error(`Agent eval report ${prompt.id} records ${report.generatedLines} lines, actual output has ${lines}`);
  }));

  const score = scoreEvalSuite(suite, reports);
  if (score.failures.length > 0) throw new Error(`Agent eval baseline failed:\n${score.failures.join("\n")}`);
  if (!sameAggregate(metadata.aggregate, score.aggregate)) throw new Error("Agent eval baseline aggregate does not match its reports");
  return { metadata, aggregate: score.aggregate, prompts: suite.prompts.length };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  const metadataPath = join(root, "evals", "v1", "baseline", "metadata.json");
  const metadataExists = await exists(metadataPath);
  if (!metadataExists) {
    if (process.argv.includes("--if-present")) console.log("Agent eval baseline is not captured; deterministic verification is inactive");
    else {
      console.error("Agent eval baseline is missing evals/v1/baseline/metadata.json");
      process.exitCode = 1;
    }
  } else {
    try {
      const result = await verifyEvalBaseline(root);
      await auditEvalBaselineSources(root);
      console.log(`Verified ${result.prompts} agent eval outputs for ${result.metadata.harness.model}; coverage=${(result.aggregate.sheenInteractionCoverage * 100).toFixed(2)}%`);
    } catch (error: unknown) {
      console.error(error instanceof Error ? error.message : "Agent eval baseline verification failed");
      process.exitCode = 1;
    }
  }
}
