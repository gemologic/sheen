import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPACT_CONTEXT_MAX_BYTES, enforceCompactContextBudget, generateCompactContext, generateFullContext, writeGeneratedContext } from "./build-llms.ts";
import type { SheenManifest } from "./build-llms.ts";

const manifest = {
  schemaVersion: 1,
  components: [{
    name: "Button", package: "@gemologic/sheen", category: "action", summary: "Triggers an application action.",
    props: {
      children: { description: "Visible label.", type: "import(\"solid-js\").JSX.Element", required: true, inherited: false },
      disabled: { description: "Prevents activation.", type: "boolean | undefined", required: false, inherited: true },
      tone: { description: "Semantic tone.", type: "\"neutral\" | \"accent\"", required: false, inherited: false, default: "neutral" },
      items: { description: "Immutable labels.", type: "readonly string[]", required: true, inherited: false },
      onPress: { description: "Runs the action.", type: "() => void", required: true, inherited: false },
    },
    tokens: ["--sheen-color-accent"],
    a11y: { role: "button", keyboard: ["Enter", "Space"] },
    examples: [{ title: "Default", code: "<Button>Save</Button>" }],
    guidance: { do: ["Use for actions."], dont: ["Do not use for navigation."] },
  }],
} satisfies SheenManifest;

describe("generated agent context", () => {
  it("writes and refreshes identical repository and public agent documents", async () => {
    const root = await mkdtemp(join(tmpdir(), "sheen-public-context-"));
    try {
      for (const summary of ["Triggers an application action.", "Triggers the updated application action."]) {
        const updated = {
          ...manifest,
          components: manifest.components.map(component => ({ ...component, summary })),
        } satisfies SheenManifest;
        await writeFile(join(root, "sheen.manifest.json"), JSON.stringify(updated));
        const result = await writeGeneratedContext(root);
        expect(result.components).toBe(updated.components.length);
        for (const { name, expected } of [
          { name: "llms.txt", expected: generateCompactContext(updated) },
          { name: "llms-full.txt", expected: generateFullContext(updated) },
        ]) {
          expect(await readFile(join(root, name), "utf8")).toBe(expected);
          expect(await readFile(join(root, "apps", "loupe", "public", name), "utf8")).toBe(expected);
        }
        expect(await readFile(join(root, "dist", "skill", "llms.txt"), "utf8")).toBe(generateCompactContext(updated));
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the compact inventory canonical and excludes inherited platform noise", () => {
    const compact = generateCompactContext(manifest);
    expect(compact).toContain('Button(children:node,tone?:"neutral"|"accent",items:ro s[],onPress:()=>v)');
    expect(compact).toContain("s=string, b=boolean");
    expect(compact).toContain("v=void, ro=readonly");
    expect(compact).not.toContain("disabled");
    expect(compact).toContain("; <Button>Save</Button>");
    expect(enforceCompactContextBudget(compact)).toBeGreaterThan(0);
  });

  it("includes complete authored guidance and rejects a compact-context regression", () => {
    const full = generateFullContext(manifest);
    expect(full).toContain("--sheen-color-accent");
    expect(full).toContain("Do not use for navigation.");
    expect(() => enforceCompactContextBudget("x".repeat(COMPACT_CONTEXT_MAX_BYTES + 1))).toThrow("compact-context ceiling");
  });

  it("references repeated canonical examples instead of spending the compact budget twice", () => {
    const repeated = { ...manifest, components: [manifest.components[0]!, { ...manifest.components[0]!, name: "ButtonAlias" }] } satisfies SheenManifest;
    expect(generateCompactContext(repeated)).toContain("See Button example.");
  });

  it("keeps long signatures useful by retaining required props and counting optional details", () => {
    const manyProps = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`option${index}`, {
      description: `Option ${index}.`, type: "Readonly<Record<string, readonly string[]>>", required: false, inherited: false,
    }]));
    const expanded = {
      ...manifest,
      components: [{ ...manifest.components[0]!, props: { ...manifest.components[0]!.props, ...manyProps } }],
    } satisfies SheenManifest;
    const compact = generateCompactContext(expanded);
    expect(compact).toContain("Button(children:node,items:ro s[],onPress:()=>v,+21 optional)");
    expect(compact).not.toContain("option19");
  });
});
