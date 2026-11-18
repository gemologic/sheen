import { accentModeTokens, accents } from "./accents.ts";
import type { AccentColors } from "./accents.ts";
import { accentNames, isAccentName } from "./catalog.ts";
import type { AccentName } from "./catalog.ts";
import { fromOklch, oklchComponents, parseColor, toHex } from "./color.ts";
import type { Oklch } from "./color.ts";
import { emitTokenDeclarations, ThemeValidationError, validateContrast } from "./define.ts";
import type { Mode, Theme } from "./schema.ts";
import { themes as bundledThemes } from "./themes.ts";

export interface Accent extends AccentColors { readonly id: string; readonly label: string }

interface AccentIdentity {
  /** Lower kebab-case `data-sheen-accent` value. Bundled accent names are reserved. */
  readonly id: string;
  readonly label?: string;
}
/** Exact per-mode colors. Missing subtle colors are derived from the mode color. Failing contrast throws. */
export interface ExplicitAccentDefinition extends AccentIdentity {
  readonly light: string;
  readonly dark: string;
  readonly lightSubtle?: string;
  readonly darkSubtle?: string;
}
/** One brand color. Each mode keeps the seed's hue and chroma and moves lightness only as far as contrast requires. */
export interface SeedAccentDefinition extends AccentIdentity { readonly seed: string }
export type AccentDefinition = ExplicitAccentDefinition | SeedAccentDefinition;

export interface AccentValidationOptions {
  /** Every theme the accent can be combined with. Defaults to the seven bundled themes. */
  readonly themes?: readonly Theme[];
}

const modes = ["dark", "light"] satisfies Mode[];
const lightnessStep = 0.005;

const threshold = (theme: Theme): number => theme.id === "contrast" ? 7 : 4.5;

function validateMode(color: string, subtle: string, mode: Mode, themes: readonly Theme[]): string[] {
  return themes.flatMap(theme => validateContrast({ ...theme[mode], ...accentModeTokens(color, subtle, mode, theme.id) }, threshold(theme))
    .map(message => `${theme.id}/${mode}: ${message}`));
}

/** Contrast diagnostics for an accent combined with every supplied theme in both modes. Empty means valid. */
export function validateAccent(accent: AccentColors, options: AccentValidationOptions = {}): string[] {
  const themes = options.themes ?? bundledThemes;
  return modes.flatMap(mode => validateMode(accent[mode], mode === "dark" ? accent.darkSubtle : accent.lightSubtle, mode, themes));
}

const inGamut = (value: Oklch): boolean => {
  const color = fromOklch(value);
  return [color.r, color.g, color.b].every(channel => channel >= -1e-4 && channel <= 1 + 1e-4);
};

/** Reduce chroma at fixed lightness and hue until the coordinate fits sRGB. */
function gamutHex(target: Oklch): string {
  if (inGamut(target)) return toHex(fromOklch(target));
  let low = 0, high = target.c;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    if (inGamut({ ...target, c: middle })) low = middle;
    else high = middle;
  }
  return toHex(fromOklch({ ...target, c: low }));
}

function deriveSubtle(color: string, mode: Mode): string {
  const { c, h } = oklchComponents(parseColor(color));
  return gamutHex(mode === "dark" ? { l: 0.27, c: Math.min(c * 0.5, 0.12), h } : { l: 0.945, c: Math.min(c * 0.3, 0.045), h });
}

/** Darken (light mode) or lighten (dark mode) the seed until every theme passes; a passing seed is kept verbatim. */
function deriveMode(seed: string, mode: Mode, themes: readonly Theme[]): { color: string; subtle: string } {
  const origin = oklchComponents(parseColor(seed));
  const direction = mode === "dark" ? 1 : -1;
  let diagnostics: string[] = [];
  for (let l = origin.l; l >= 0 && l <= 1; l += direction * lightnessStep) {
    const color = l === origin.l ? toHex(parseColor(seed)) : gamutHex({ ...origin, l });
    const subtle = deriveSubtle(color, mode);
    diagnostics = validateMode(color, subtle, mode, themes);
    if (!diagnostics.length) return { color, subtle };
  }
  throw new ThemeValidationError(diagnostics);
}

function opaqueColorDiagnostic(field: string, value: string): string | undefined {
  try { return parseColor(value).a === 1 ? undefined : `${field} must be opaque: ${value}`; }
  catch (error) { return `${field}: ${error instanceof Error ? error.message : String(error)}`; }
}

function identityDiagnostics(id: string): string[] {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return [`Invalid accent id: ${id}`];
  return isAccentName(id) ? [`Accent id ${id} is reserved by a bundled accent`] : [];
}

/**
 * Define a custom accent that composes with any theme like the bundled accents.
 * Seed definitions derive both modes automatically; explicit definitions must already pass.
 * Throws ThemeValidationError with every id, color, and contrast diagnostic.
 */
export function defineAccent(input: AccentDefinition, options: AccentValidationOptions = {}): Accent {
  const themes = options.themes ?? bundledThemes;
  const fields: Readonly<Record<string, string | undefined>> = "seed" in input
    ? { seed: input.seed }
    : { light: input.light, dark: input.dark, lightSubtle: input.lightSubtle, darkSubtle: input.darkSubtle };
  const diagnostics = [
    ...identityDiagnostics(input.id),
    ...Object.entries(fields).flatMap(([field, value]) => value === undefined ? [] : opaqueColorDiagnostic(field, value) ?? []),
  ].map(message => `${input.id}: ${message}`);
  if (diagnostics.length) throw new ThemeValidationError(diagnostics);
  let colors: AccentColors;
  if ("seed" in input) {
    try {
      const dark = deriveMode(input.seed, "dark", themes), light = deriveMode(input.seed, "light", themes);
      colors = { light: light.color, dark: dark.color, lightSubtle: light.subtle, darkSubtle: dark.subtle };
    } catch (error) {
      if (!(error instanceof ThemeValidationError)) throw error;
      throw new ThemeValidationError(error.diagnostics.map(message => `${input.id}: ${message}`));
    }
  } else {
    const light = toHex(parseColor(input.light)), dark = toHex(parseColor(input.dark));
    colors = {
      light, dark,
      lightSubtle: input.lightSubtle === undefined ? deriveSubtle(light, "light") : toHex(parseColor(input.lightSubtle)),
      darkSubtle: input.darkSubtle === undefined ? deriveSubtle(dark, "dark") : toHex(parseColor(input.darkSubtle)),
    };
    const failures = validateAccent(colors, { themes }).map(message => `${input.id}/${message}`);
    if (failures.length) throw new ThemeValidationError(failures);
  }
  return Object.freeze({ id: input.id, label: input.label ?? input.id, ...colors });
}

/**
 * Emit accent CSS: one `[data-sheen-mode][data-sheen-accent]` rule per mode plus the Contrast override.
 * The combination is validated against `options.themes` (default: bundled themes) before emitting.
 */
export function buildAccent(accent: AccentName | Accent, options: AccentValidationOptions = {}): string {
  const id = typeof accent === "string" ? accent : accent.id;
  const colors = typeof accent === "string" ? accents[accent] : accent;
  const diagnostics = [
    ...(typeof accent === "string" ? [] : identityDiagnostics(id)).map(message => `${id}: ${message}`),
    ...validateAccent(colors, options).map(message => `${id}/${message}`),
  ];
  if (diagnostics.length) throw new ThemeValidationError(diagnostics);
  const subtle = (mode: Mode): string => mode === "dark" ? colors.darkSubtle : colors.lightSubtle;
  return modes.flatMap(mode => [
    `[data-sheen-mode="${mode}"][data-sheen-accent="${id}"] {\n${emitTokenDeclarations(accentModeTokens(colors[mode], subtle(mode), mode))}\n}`,
    `[data-sheen-theme="contrast"][data-sheen-mode="${mode}"][data-sheen-accent="${id}"] {\n${emitTokenDeclarations(accentModeTokens(colors[mode], subtle(mode), mode, "contrast"))}\n}`,
  ]).join("\n") + "\n";
}

export function buildAccents(): string { return accentNames.map(name => buildAccent(name)).join(""); }
