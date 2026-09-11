import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseEvalReports, parseEvalSuite, scoreEvalSuite } from "./agent-evals.ts";
import type { EvalReport } from "./agent-evals.ts";

async function suite() {
  const raw: unknown = JSON.parse(await readFile(new URL("../evals/v1/prompts.json", import.meta.url), "utf8"));
  return parseEvalSuite(raw);
}

function passingReport(promptId: string, rubricIds: readonly string[]): EvalReport {
  return {
    promptId,
    generatedLines: 100,
    lintErrors: 1,
    interactiveElements: 10,
    sheenInteractiveElements: 8,
    hallucinatedProps: [],
    rubric: Object.fromEntries(rubricIds.map(id => [id, true])),
  };
}

describe("agent eval contract", () => {
  it("validates the frozen twenty-prompt suite and exact rubric reports", async () => {
    const definition = await suite();
    expect(definition.prompts).toHaveLength(20);
    const reports = definition.prompts.map(prompt => passingReport(prompt.id, [...definition.universalRubric, ...prompt.rubric].map(item => item.id)));
    const score = scoreEvalSuite(definition, reports);
    expect(score.failures).toEqual([]);
    expect(score.aggregate).toEqual({ lintErrorsPerHundredLines: 1, sheenInteractionCoverage: 0.8, rubricPassRatio: 1 });
  });

  it("hard-fails hallucinations, missing rubric results, threshold misses, and relative regression", async () => {
    const definition = await suite();
    const reports = definition.prompts.map(prompt => passingReport(prompt.id, [...definition.universalRubric, ...prompt.rubric].map(item => item.id)));
    const first = reports[0];
    if (!first) throw new Error("Eval suite is empty");
    reports[0] = { ...first, lintErrors: 2, sheenInteractiveElements: 7, hallucinatedProps: ["Button.colour"], rubric: { ...first.rubric, hydration: false } };
    const score = scoreEvalSuite(definition, reports, { lintErrorsPerHundredLines: 0.5, sheenInteractionCoverage: 0.9, rubricPassRatio: 1 });
    expect(score.failures.join("\n")).toMatch(/hallucinated props|failed rubric item hydration|below 80%|regressed more than 5%/);
  });

  it("rejects structurally invalid report input", () => {
    expect(() => parseEvalReports([{ promptId: "x", generatedLines: 0 }])).toThrow("Invalid agent eval reports");
  });
});
