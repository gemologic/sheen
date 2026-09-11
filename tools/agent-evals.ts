export interface EvalCriterion {
  readonly id: string;
  readonly description: string;
}

export interface EvalPrompt {
  readonly id: string;
  readonly prompt: string;
  readonly rubric: readonly EvalCriterion[];
}

export interface EvalSuite {
  readonly schemaVersion: 1;
  readonly suiteId: string;
  readonly universalRubric: readonly EvalCriterion[];
  readonly prompts: readonly EvalPrompt[];
}

export interface EvalReport {
  readonly promptId: string;
  readonly generatedLines: number;
  readonly lintErrors: number;
  readonly interactiveElements: number;
  readonly sheenInteractiveElements: number;
  readonly hallucinatedProps: readonly string[];
  readonly rubric: Readonly<Record<string, boolean>>;
}

export interface EvalAggregate {
  readonly lintErrorsPerHundredLines: number;
  readonly sheenInteractionCoverage: number;
  readonly rubricPassRatio: number;
}

export interface EvalScore {
  readonly aggregate: EvalAggregate;
  readonly failures: readonly string[];
  readonly perPrompt: Readonly<Record<string, readonly string[]>>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function criterion(value: unknown): value is EvalCriterion {
  return record(value) && text(value.id) && text(value.description);
}

function prompt(value: unknown): value is EvalPrompt {
  return record(value) && text(value.id) && text(value.prompt) && Array.isArray(value.rubric) && value.rubric.length > 0 && value.rubric.every(criterion);
}

function evalSuite(value: unknown): value is EvalSuite {
  return record(value) && value.schemaVersion === 1 && text(value.suiteId)
    && Array.isArray(value.universalRubric) && value.universalRubric.every(criterion)
    && Array.isArray(value.prompts) && value.prompts.every(prompt);
}

export function parseEvalSuite(value: unknown): EvalSuite {
  if (!evalSuite(value)) throw new Error("Invalid agent eval suite");
  if (value.prompts.length !== 20) throw new Error(`Agent eval suite requires exactly 20 prompts, received ${value.prompts.length}`);
  const promptIds = value.prompts.map(item => item.id);
  if (new Set(promptIds).size !== promptIds.length) throw new Error("Agent eval prompt IDs must be unique");
  const universalIds = value.universalRubric.map(item => item.id);
  if (new Set(universalIds).size !== universalIds.length) throw new Error("Universal rubric IDs must be unique");
  for (const item of value.prompts) {
    const ids = [...universalIds, ...item.rubric.map(entry => entry.id)];
    if (new Set(ids).size !== ids.length) throw new Error(`${item.id} has duplicate rubric IDs`);
  }
  return value;
}

function report(value: unknown): value is EvalReport {
  if (!record(value) || !text(value.promptId)) return false;
  const allowed = new Set(["promptId", "generatedLines", "lintErrors", "interactiveElements", "sheenInteractiveElements", "hallucinatedProps", "rubric"]);
  if (Object.keys(value).some(key => !allowed.has(key))) return false;
  for (const key of ["generatedLines", "lintErrors", "interactiveElements", "sheenInteractiveElements"]) {
    const metric = value[key];
    if (typeof metric !== "number" || !Number.isSafeInteger(metric) || metric < 0) return false;
  }
  return typeof value.generatedLines === "number" && value.generatedLines > 0
    && typeof value.sheenInteractiveElements === "number" && typeof value.interactiveElements === "number"
    && value.sheenInteractiveElements <= value.interactiveElements
    && Array.isArray(value.hallucinatedProps) && value.hallucinatedProps.every(text)
    && record(value.rubric) && Object.values(value.rubric).every(item => typeof item === "boolean");
}

export function parseEvalReports(value: unknown): readonly EvalReport[] {
  if (!Array.isArray(value) || !value.every(report)) throw new Error("Invalid agent eval reports");
  return value;
}

function regression(current: number, baseline: number, direction: "higher" | "lower"): boolean {
  if (direction === "higher") return current < baseline * 0.95;
  if (baseline === 0) return current > 0;
  return current > baseline * 1.05;
}

export function scoreEvalSuite(suite: EvalSuite, reports: readonly EvalReport[], baseline?: EvalAggregate): EvalScore {
  const failures: string[] = [];
  const perPrompt: Record<string, readonly string[]> = {};
  const byPrompt = new Map<string, EvalReport>();
  for (const item of reports) {
    if (byPrompt.has(item.promptId)) failures.push(`duplicate report ${item.promptId}`);
    byPrompt.set(item.promptId, item);
  }
  const known = new Set(suite.prompts.map(item => item.id));
  for (const item of reports) if (!known.has(item.promptId)) failures.push(`unknown report ${item.promptId}`);

  let lines = 0;
  let lintErrors = 0;
  let interactive = 0;
  let sheenInteractive = 0;
  let rubricTotal = 0;
  let rubricPassed = 0;
  for (const item of suite.prompts) {
    const issues: string[] = [];
    const result = byPrompt.get(item.id);
    if (!result) {
      issues.push("missing report");
      perPrompt[item.id] = issues;
      continue;
    }
    lines += result.generatedLines;
    lintErrors += result.lintErrors;
    interactive += result.interactiveElements;
    sheenInteractive += result.sheenInteractiveElements;
    if (result.hallucinatedProps.length > 0) issues.push(`hallucinated props: ${result.hallucinatedProps.join(", ")}`);
    const expected = [...suite.universalRubric, ...item.rubric].map(entry => entry.id);
    const expectedSet = new Set(expected);
    for (const id of Object.keys(result.rubric)) if (!expectedSet.has(id)) issues.push(`unknown rubric item ${id}`);
    for (const id of expected) {
      rubricTotal += 1;
      if (result.rubric[id] === true) rubricPassed += 1;
      else issues.push(`failed rubric item ${id}`);
    }
    perPrompt[item.id] = issues;
    failures.push(...issues.map(issue => `${item.id}: ${issue}`));
  }

  const aggregate = {
    lintErrorsPerHundredLines: lines === 0 ? Number.POSITIVE_INFINITY : lintErrors * 100 / lines,
    sheenInteractionCoverage: interactive === 0 ? 0 : sheenInteractive / interactive,
    rubricPassRatio: rubricTotal === 0 ? 0 : rubricPassed / rubricTotal,
  };
  if (aggregate.lintErrorsPerHundredLines > 1) failures.push(`aggregate lint density ${aggregate.lintErrorsPerHundredLines.toFixed(3)} exceeds 1 per 100 lines`);
  if (aggregate.sheenInteractionCoverage < 0.8) failures.push(`aggregate Sheen interaction coverage ${(aggregate.sheenInteractionCoverage * 100).toFixed(2)}% is below 80%`);
  if (baseline) {
    if (regression(aggregate.lintErrorsPerHundredLines, baseline.lintErrorsPerHundredLines, "lower")) failures.push("aggregate lint density regressed more than 5% from baseline");
    if (regression(aggregate.sheenInteractionCoverage, baseline.sheenInteractionCoverage, "higher")) failures.push("aggregate Sheen interaction coverage regressed more than 5% from baseline");
    if (regression(aggregate.rubricPassRatio, baseline.rubricPassRatio, "higher")) failures.push("aggregate rubric pass ratio regressed more than 5% from baseline");
  }
  return { aggregate, failures, perPrompt };
}
