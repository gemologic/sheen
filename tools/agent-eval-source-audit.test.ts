import { describe, expect, it } from "vitest";
import { analyzeEvalSource } from "./agent-eval-source-audit.ts";

const root = new URL("..", import.meta.url).pathname;

describe("agent eval source audit", () => {
  it("derives reproducible lint, interaction, import, and manifest metrics from real public entries", async () => {
    const result = await analyzeEvalSource(root, "valid", `
import { Button, Input, Stack } from "@gemologic/sheen";
import type { JSX } from "solid-js";

export function Valid(): JSX.Element {
  return <Stack><Input label="Name"/><Button>Save</Button><a href="/help">Help</a></Stack>;
}
`);
    expect(result).toMatchObject({
      generatedLines: 5,
      lintErrors: 0,
      interactiveElements: 3,
      sheenInteractiveElements: 2,
      hallucinatedProps: [],
      typeErrors: [],
      importErrors: [],
    });
  });

  it("reports invalid props, private dependencies, and exact-optional type failures", async () => {
    const result = await analyzeEvalSource(root, "invalid", `
import { Input } from "@gemologic/sheen";
import { createSignal } from "@kobalte/core";

export function Invalid() {
  const [error] = createSignal<string>();
  return <Input label="Name" colour="red" error={error()}/>;
}
`);
    expect(result.hallucinatedProps).toEqual(["Input.colour"]);
    expect(result.importErrors).toEqual(["Non-public dependency import: @kobalte/core"]);
    expect(result.typeErrors.join("\n")).toMatch(/colour|exactOptionalPropertyTypes/u);
  });
});
