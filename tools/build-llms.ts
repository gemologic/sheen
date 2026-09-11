import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const COMPACT_CONTEXT_MAX_BYTES = 45_000;

interface ManifestProp {
  readonly description: string;
  readonly type: string;
  readonly required: boolean;
  readonly inherited: boolean;
  readonly default?: string | number | boolean | null;
}

interface ManifestExample {
  readonly title: string;
  readonly code: string;
  readonly imports?: string;
  readonly setup?: string;
}

interface ManifestComponent {
  readonly name: string;
  readonly package: string;
  readonly category: string;
  readonly summary: string;
  readonly props: Readonly<Record<string, ManifestProp>>;
  readonly tokens: readonly string[];
  readonly a11y: { readonly role: string; readonly keyboard: readonly string[] };
  readonly examples: readonly ManifestExample[];
  readonly guidance: { readonly do: readonly string[]; readonly dont: readonly string[] };
}

export interface SheenManifest {
  readonly schemaVersion: 1;
  readonly components: readonly ManifestComponent[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function scalarValue(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function manifestProp(value: unknown): value is ManifestProp {
  if (!record(value) || !text(value.description) || !text(value.type) || typeof value.required !== "boolean" || typeof value.inherited !== "boolean") return false;
  return !("default" in value) || scalarValue(value.default);
}

function manifestExample(value: unknown): value is ManifestExample {
  if (!record(value) || !text(value.title) || !text(value.code)) return false;
  if ("imports" in value && typeof value.imports !== "string") return false;
  return !("setup" in value) || typeof value.setup === "string";
}

function manifestComponent(value: unknown): value is ManifestComponent {
  if (!record(value) || !text(value.name) || !text(value.package) || !text(value.category) || !text(value.summary)) return false;
  if (!record(value.props) || !Object.values(value.props).every(manifestProp) || !stringList(value.tokens)) return false;
  if (!record(value.a11y) || !text(value.a11y.role) || !stringList(value.a11y.keyboard)) return false;
  if (!Array.isArray(value.examples) || value.examples.length === 0 || !value.examples.every(manifestExample)) return false;
  return record(value.guidance) && stringList(value.guidance.do) && stringList(value.guidance.dont);
}

function sheenManifest(value: unknown): value is SheenManifest {
  return record(value) && value.schemaVersion === 1 && Array.isArray(value.components) && value.components.every(manifestComponent);
}

function parseManifest(value: unknown): SheenManifest {
  if (!sheenManifest(value)) throw new Error("Unsupported or invalid sheen manifest");
  return value;
}

function oneLine(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

function compactType(value: string): string {
  return oneLine(value)
    .replaceAll(/import\("[^"]+"\)\./gu, "")
    .replaceAll(" | undefined", "")
    .replaceAll(/\s+\|\s+/gu, "|")
    .replaceAll(/\s+&\s+/gu, "&")
    .replaceAll(/\s+=>\s+/gu, "=>")
    .replaceAll(/,\s+/gu, ",")
    .replaceAll(/:\s+/gu, ":");
}

function compactSignatureType(value: string): string {
  const normalized = compactType(value).replaceAll("readonly ", "ro ").replaceAll("Promise<", "P<").replaceAll("AbortSignal", "Abort");
  if (normalized === '"sm"|"md"|"lg"') return "size";
  if (normalized === '"muted"|"inherit"') return "mute";
  const replacements: readonly [string, string][] = [["JSX.Element", "node"], ["boolean", "b"], ["number", "n"], ["string", "s"], ["void", "v"]];
  let result = "";
  for (let index = 0; index < normalized.length;) {
    const character = normalized[index];
    if (character === '"' || character === "'") {
      const quote = character;
      result += character;
      index += 1;
      while (index < normalized.length) {
        const current = normalized[index];
        result += current;
        index += 1;
        if (current === "\\" && index < normalized.length) {
          result += normalized[index];
          index += 1;
        } else if (current === quote) break;
      }
      continue;
    }
    const replacement = replacements.find(([source]) => normalized.startsWith(source, index)
      && !/[\p{L}\p{N}_$]/u.test(normalized[index - 1] ?? "")
      && !/[\p{L}\p{N}_$]/u.test(normalized[index + source.length] ?? ""));
    if (replacement) {
      result += replacement[1];
      index += replacement[0].length;
    } else {
      result += character;
      index += 1;
    }
  }
  return result;
}

function scalar(value: string | number | boolean | null): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Unable to serialize manifest default");
  return serialized;
}

function authoredProps(component: ManifestComponent): readonly [string, ManifestProp][] {
  return Object.entries(component.props).filter((entry): entry is [string, ManifestProp] => !entry[1].inherited);
}

function signature(component: ManifestComponent): string {
  const props = authoredProps(component);
  const render = ([name, prop]: [string, ManifestProp]) => {
    return `${name}${prop.required ? "" : "?"}:${compactSignatureType(prop.type)}`;
  };
  const complete = props.map(render).join(",");
  if (complete.length <= 180) return complete;
  const required = props.filter((entry): entry is [string, ManifestProp] => entry[1].required);
  const optionalCount = props.length - required.length;
  return `${required.map(render).join(",")}${optionalCount > 0 ? `,+${optionalCount} optional` : ""}`;
}

function compactExample(example: ManifestExample): string {
  return oneLine(example.code)
    .replaceAll(/\{\s+/gu, "{")
    .replaceAll(/\s+\}/gu, "}")
    .replaceAll(/,\s+/gu, ",")
    .replaceAll(/:\s+/gu, ":")
    .replaceAll(/\s+\/>/gu, "/>");
}

function groups(manifest: SheenManifest): ReadonlyMap<string, readonly ManifestComponent[]> {
  const result = new Map<string, ManifestComponent[]>();
  for (const component of [...manifest.components].sort((left, right) => `${left.package}/${left.name}`.localeCompare(`${right.package}/${right.name}`))) {
    const existing = result.get(component.package) ?? [];
    existing.push(component);
    result.set(component.package, existing);
  }
  return result;
}

export function generateCompactContext(manifest: SheenManifest): string {
  const lines = [
    "# Sheen component index",
    "",
    "Generated from sheen.manifest.json. Import public @gemologic/sheen entries. Link changes URLs; Button acts. Omit absent optional props instead of passing undefined. Use semantic tokens, explicit locale, complete SSR, and retained refresh content.",
    "Aliases: s=string, b=boolean, n=number, v=void, ro=readonly, node=JSX.Element, P=Promise, Abort=AbortSignal, size=\"sm\"|\"md\"|\"lg\", mute=\"muted\"|\"inherit\". Native props, defaults, and referenced examples are in the full context.",
  ];
  const canonicalExamples = new Map<string, string>();
  for (const [packageName, components] of groups(manifest)) {
    lines.push("", `## ${packageName}`);
    for (const component of components) {
      const example = component.examples[0];
      if (!example) throw new Error(`${component.name} requires a canonical example`);
      const compact = compactExample(example);
      const canonical = canonicalExamples.get(compact);
      const rendered = compact.length > 80 ? "See full example." : canonical ? `See ${canonical} example.` : compact;
      canonicalExamples.set(compact, canonical ?? component.name);
      const summary = component.summary.replace(/[.;:]$/u, "");
      lines.push(`- ${component.name}(${signature(component)}): ${summary}; ${rendered}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function generateFullContext(manifest: SheenManifest): string {
  const lines = ["# Sheen full component context", "", "Generated from sheen.manifest.json. Do not edit by hand."];
  for (const [packageName, components] of groups(manifest)) {
    lines.push("", `## ${packageName}`);
    for (const component of components) {
      lines.push("", `### ${component.name}`, "", component.summary, "", `Category: ${component.category}`, "", "Props:");
      for (const [name, prop] of authoredProps(component)) {
        const required = prop.required ? "required" : "optional";
        const defaultValue = "default" in prop ? `; default ${scalar(prop.default ?? null)}` : "";
        lines.push(`- \`${name}: ${compactType(prop.type)}\` (${required}${defaultValue}). ${prop.description}`);
      }
      lines.push("", `Accessibility role: ${component.a11y.role}`, `Keyboard: ${component.a11y.keyboard.join(", ") || "native behavior"}`);
      if (component.tokens.length) lines.push(`Tokens: ${component.tokens.map(token => `\`${token}\``).join(", ")}`);
      lines.push("", "Do:", ...component.guidance.do.map(item => `- ${item}`), "", "Do not:", ...component.guidance.dont.map(item => `- ${item}`));
      for (const example of component.examples) {
        lines.push("", `Example, ${example.title}:`, "```tsx");
        if (example.imports) lines.push(example.imports);
        if (example.setup) lines.push(example.setup);
        lines.push(example.code, "```");
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

export function enforceCompactContextBudget(content: string): number {
  const bytes = new TextEncoder().encode(content).byteLength;
  if (bytes > COMPACT_CONTEXT_MAX_BYTES) throw new Error(`llms.txt is ${bytes} UTF-8 bytes, above the ${COMPACT_CONTEXT_MAX_BYTES}-byte compact-context ceiling`);
  return bytes;
}

function skillInstructions(): string {
  return `---
name: sheen
description: Build SolidJS interfaces with the Sheen design system, its public components, semantic tokens, SSR hydration contract, and retained-refresh behavior.
---

# Sheen

Read the bundled \`llms.txt\` before choosing components or props.

- Import application components only from public \`@gemologic/sheen*\` entries. Never import Kobalte, Corvu, TanStack, uPlot, or d3 directly in consuming apps.
- Use \`Link\` when an interaction changes the URL and \`Button\` for actions.
- Use semantic \`--sheen-color-*\`, spacing, type, radius, and motion tokens. Do not use tier-one ramps in components.
- Keep Solid props reactive. Use props directly or \`splitProps\`; never destructure component props.
- With \`exactOptionalPropertyTypes\`, omit absent optional JSX props instead of passing \`undefined\`.
- Emit complete deterministic server content. Do not branch initial markup on browser globals or a mounted signal.
- During background refresh, retain accepted content and stable identities. Preserve focus, drafts, expansion, and scroll; accept coherent results atomically.
- Use \`pagination={false}\` only for complete bounded table data. Prefer numbered server pagination for large or expensive remote results.
`;
}

export async function writeGeneratedContext(root: string): Promise<{ readonly compactBytes: number; readonly components: number }> {
  const manifestPath = join(root, "sheen.manifest.json");
  const manifest = parseManifest(JSON.parse(await readFile(manifestPath, "utf8")));
  const compact = generateCompactContext(manifest);
  const full = generateFullContext(manifest);
  const compactBytes = enforceCompactContextBudget(compact);
  const skillRoot = join(root, "dist", "skill");
  await mkdir(skillRoot, { recursive: true });
  await Promise.all([
    writeFile(join(root, "llms.txt"), compact),
    writeFile(join(root, "llms-full.txt"), full),
    writeFile(join(skillRoot, "llms.txt"), compact),
    writeFile(join(skillRoot, "SKILL.md"), skillInstructions()),
  ]);
  return { compactBytes, components: manifest.components.length };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  const result = await writeGeneratedContext(root);
  console.log(`Generated compact/full context and vendorable skill for ${result.components} components; compact=${result.compactBytes}B`);
}
