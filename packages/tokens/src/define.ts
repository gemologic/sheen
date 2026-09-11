import { composite, contrastRatio, parseColor, toHex, toOklch } from "./color.ts";
import { validateChartPalette } from "./palette.ts";
import { currentSchemaVersion, isTokenName, semanticDefaults, versionedDefaults } from "./schema.ts";
import type { Mode, Theme, ThemeDefinition, TokenName, Tokens } from "./schema.ts";

export class ThemeValidationError extends Error {
  readonly diagnostics: readonly string[];
  constructor(diagnostics: readonly string[]) {
    super(diagnostics.join("\n"));
    this.name = "ThemeValidationError";
    this.diagnostics = diagnostics;
  }
}

export function resolveTokens(input: ThemeDefinition, mode: Mode): Tokens {
  const diagnostics: string[] = [];
  const raw: Partial<Record<TokenName, string>> = { ...input[mode] };
  for (const name of Object.keys(raw)) if (!isTokenName(name)) diagnostics.push(`${input.id}/${mode}: unknown token ${name}`);
  for (const name of Object.keys(semanticDefaults)) {
    if (!isTokenName(name) || raw[name] !== undefined) continue;
    const migration = versionedDefaults[name];
    if (migration && input.schemaVersion < migration.introduced) raw[name] = migration.value;
    else diagnostics.push(`${input.id}/${mode}: missing token ${name}`);
  }
  if (diagnostics.length) throw new ThemeValidationError(diagnostics);
  const cache = new Map<string, string>();
  function resolve(name: string, trail: readonly string[]): string {
    if (trail.includes(name)) throw new Error(`reference cycle: ${[...trail, name].join(" -> ")}`);
    const cached = cache.get(name);
    if (cached !== undefined) return cached;
    const value = isTokenName(name) ? raw[name] : Object.hasOwn(input.primitives, name) ? input.primitives[name] : undefined;
    if (typeof value !== "string" || !value.trim()) throw new Error(`unresolved reference ${name}`);
    if (/[;<>@]|\/\*/.test(value)) throw new Error(`unsafe CSS value for ${name}`);
    const resolved = value.replace(/\{([^{}]+)\}/g, (_match: string, reference: string) => resolve(reference, [...trail, name]));
    if (/[{}]/.test(resolved)) throw new Error(`malformed reference in ${name}`);
    cache.set(name, resolved);
    return resolved;
  }
  const output = { ...semanticDefaults };
  for (const name of Object.keys(output)) {
    if (!isTokenName(name)) continue;
    try {
      const value = resolve(name, []);
      if (name.startsWith("color-") || /^chart-(?:[1-8]|grid|axis|crosshair)$/.test(name)) parseColor(value);
      output[name] = value;
    }
    catch (error) { diagnostics.push(`${input.id}/${mode}/${name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (diagnostics.length) throw new ThemeValidationError(diagnostics);
  return Object.freeze(output);
}

export interface ContrastPair {
  readonly foreground: TokenName;
  readonly background: TokenName;
  readonly minimum: number;
  /** The opaque surface behind a translucent background. */
  readonly surface?: TokenName;
  readonly role?: string;
}

export function validateContrast(tokens: Tokens, textMinimum = 4.5, additional: readonly ContrastPair[] = []): string[] {
  const surfaces: TokenName[] = ["color-bg", "color-bg-subtle", "color-bg-raised", "color-bg-inset", "color-bg-hover", "color-bg-active", "color-bg-selected"];
  const pairs: ContrastPair[] = surfaces.flatMap(background => [
    { foreground: "color-fg", background, minimum: textMinimum },
    { foreground: "color-fg-muted", background, minimum: textMinimum },
    { foreground: "color-border-control", background, minimum: 3 },
    { foreground: "color-focus-ring", background, minimum: 3 },
    { foreground: "color-accent-fg", background, minimum: textMinimum },
  ]);
  for (const background of ["color-accent", "color-accent-hover", "color-accent-active"] satisfies TokenName[]) {
    pairs.push({ foreground: "color-fg-on-accent", background, minimum: textMinimum });
  }
  pairs.push({ foreground: "color-accent-fg", background: "color-accent-subtle", minimum: textMinimum });
  pairs.push({ foreground: "color-neutral-on", background: "color-neutral", minimum: textMinimum });
  pairs.push({ foreground: "color-neutral-fg", background: "color-neutral-subtle", minimum: textMinimum });
  for (const role of ["info", "success", "warning", "danger", "market-up", "market-down", "market-flat"] satisfies string[]) {
    const foreground = `color-${role}-fg`, background = `color-${role}-subtle`, solid = `color-${role}`, on = `color-${role}-on`, border = `color-${role}-border`;
    if (!isTokenName(foreground) || !isTokenName(background) || !isTokenName(solid) || !isTokenName(on) || !isTokenName(border)) throw new Error(`Incomplete semantic role: ${role}`);
    pairs.push({ foreground, background, minimum: textMinimum, role });
    pairs.push({ foreground: on, background: solid, minimum: textMinimum, role });
    pairs.push({ foreground: border, background, minimum: 3, role });
  }
  pairs.push(...additional);
  const diagnostics: string[] = [];
  for (const pair of pairs) {
    try {
      const background = pair.surface ? toHex(composite(parseColor(tokens[pair.background]), parseColor(tokens[pair.surface]))) : tokens[pair.background];
      const ratio = contrastRatio(tokens[pair.foreground], background);
      if (ratio < pair.minimum) diagnostics.push(`${pair.foreground} on ${pair.background}: ${ratio.toFixed(3)}:1 < ${pair.minimum}:1`);
    } catch (error) { diagnostics.push(`${pair.foreground} on ${pair.background}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return diagnostics;
}

export function defineTheme(input: ThemeDefinition): Theme {
  const diagnostics: string[] = [];
  if (!/^[a-z][a-z0-9-]*$/.test(input.id)) diagnostics.push(`Invalid theme id: ${input.id}`);
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1 || input.schemaVersion > currentSchemaVersion) diagnostics.push(`Unsupported schema version: ${input.schemaVersion}`);
  if (input.defaultMode !== "dark" && input.defaultMode !== "light") diagnostics.push("Invalid default mode");
  if (input.iconSet !== "radix" && input.iconSet !== "phosphor") diagnostics.push("Invalid icon set");
  if (diagnostics.length) throw new ThemeValidationError(diagnostics);
  const resolved: Partial<Record<Mode, Tokens>> = {};
  for (const mode of ["dark", "light"] satisfies Mode[]) {
    try { resolved[mode] = resolveTokens(input, mode); }
    catch (error) {
      if (!(error instanceof ThemeValidationError)) throw error;
      diagnostics.push(...error.diagnostics);
    }
  }
  const threshold = input.id === "contrast" ? 7 : 4.5;
  for (const mode of ["dark", "light"] satisfies Mode[]) {
    const tokens = resolved[mode];
    if (!tokens) continue;
    diagnostics.push(...validateContrast(tokens, threshold).map(message => `${input.id}/${mode}: ${message}`));
    diagnostics.push(...validateChartPalette(tokens).map(message => `${input.id}/${mode}: ${message}`));
  }
  if (diagnostics.length) throw new ThemeValidationError(diagnostics);
  const { dark, light } = resolved;
  if (!dark || !light) throw new ThemeValidationError([`${input.id}: both modes are required`]);
  return Object.freeze({ ...input, primitives: Object.freeze({ ...input.primitives }), dark, light });
}

export function emitTokenDeclarations(tokens: Readonly<Record<string, string>>, modern = false): string {
  return Object.entries(tokens).map(([name, value]) => {
    let emitted = value;
    if (/^(#|oklch\(|color-mix\(|transparent$)/.test(value) && !value.includes("px")) {
      const color = parseColor(value);
      emitted = modern ? (value.startsWith("oklch(") || value.startsWith("color-mix(") ? value : toOklch(value)) : toHex(color);
    }
    return `  --sheen-${name}: ${emitted};`;
  }).join("\n");
}

export function buildTheme(input: ThemeDefinition): string {
  const theme = defineTheme(input);
  function emit(modern: boolean): string {
    return (["dark", "light"] satisfies Mode[]).map(mode => {
      const selector = `:where([data-sheen-theme="${theme.id}"][data-sheen-mode="${mode}"])`;
      return `${selector} {\n  color-scheme: ${mode};\n${emitTokenDeclarations(theme[mode], modern)}\n}`;
    }).join("\n");
  }
  return `${emit(false)}\n@supports (color: oklch(50% 0 0)) {\n${emit(true)}\n}\n`;
}
