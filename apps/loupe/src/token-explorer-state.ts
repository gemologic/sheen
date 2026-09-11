import { composite, contrastRatio, isTokenName, parseColor, primitives, semanticDefaults, toHex } from "@gemologic/sheen-tokens";
import type { TokenName } from "@gemologic/sheen-tokens";
import { ColorSpace, contrastAPCA, sRGB } from "colorjs.io/fn";
import { tokenConsumers } from "./generated/token-consumers.ts";

ColorSpace.register(sRGB);

export interface TokenCatalogItem {
  readonly tier: 1 | 2;
  readonly name: string;
  readonly cssName: `--sheen-${string}`;
  readonly consumers: readonly string[];
}

function cssName(name: string): `--sheen-${string}` {
  return `--sheen-${name.replaceAll(".", "-")}`;
}

const primitiveCatalog: readonly TokenCatalogItem[] = Object.keys(primitives).sort((first, second) => first.localeCompare(second)).map(name => {
  const variable = cssName(name);
  return { tier: 1, name, cssName: variable, consumers: tokenConsumers[variable] ?? [] };
});
const semanticNames = Object.keys(semanticDefaults).filter(isTokenName).sort((first, second) => first.localeCompare(second));
const semanticCatalog: readonly TokenCatalogItem[] = semanticNames.map(name => {
  const variable = cssName(name);
  return { tier: 2, name, cssName: variable, consumers: tokenConsumers[variable] ?? [] };
});

export const tokenCatalog: readonly TokenCatalogItem[] = Object.freeze([...primitiveCatalog, ...semanticCatalog]);

export function filterTokenCatalog(query: string): readonly TokenCatalogItem[] {
  const needle = query.trim().toLocaleLowerCase("en-US");
  if (!needle) return tokenCatalog;
  return tokenCatalog.filter(item => item.name.toLocaleLowerCase("en-US").includes(needle)
    || item.cssName.toLocaleLowerCase("en-US").includes(needle)
    || item.consumers.some(consumer => consumer.toLocaleLowerCase("en-US").includes(needle)));
}

function isForeground(name: TokenName): boolean {
  return name === "color-fg" || name.startsWith("color-fg-") || name.endsWith("-fg") || name.endsWith("-on");
}

function isBackground(name: TokenName): boolean {
  if (name.startsWith("color-bg")) return true;
  return /^color-(?:accent(?:-(?:hover|active|subtle))?|neutral(?:-subtle)?|info(?:-subtle)?|success(?:-subtle)?|warning(?:-subtle)?|danger(?:-subtle)?|market-(?:up|down|flat)(?:-subtle)?)$/u.test(name);
}

export const foregroundTokenNames: readonly TokenName[] = Object.freeze(semanticNames.filter(isForeground));
export const backgroundTokenNames: readonly TokenName[] = Object.freeze(semanticNames.filter(isBackground));

export function wcagMatrixScore(values: Readonly<Record<string, string>>, foreground: TokenName, background: TokenName): number {
  const foregroundValue = values[cssName(foreground)];
  const backgroundValue = values[cssName(background)];
  const surfaceValue = values[cssName("color-bg")];
  if (!foregroundValue || !backgroundValue || !surfaceValue) throw new Error(`Missing computed values for ${foreground} on ${background}`);
  const parsedBackground = parseColor(backgroundValue);
  const opaqueBackground = parsedBackground.a === 1 ? backgroundValue : toHex(composite(parsedBackground, parseColor(surfaceValue)));
  return contrastRatio(foregroundValue, opaqueBackground);
}

export function apcaMatrixScore(values: Readonly<Record<string, string>>, foreground: TokenName, background: TokenName): number {
  const foregroundValue = values[cssName(foreground)];
  const backgroundValue = values[cssName(background)];
  const surfaceValue = values[cssName("color-bg")];
  if (!foregroundValue || !backgroundValue || !surfaceValue) throw new Error(`Missing computed values for ${foreground} on ${background}`);
  const surface = parseColor(surfaceValue);
  if (surface.a !== 1) throw new Error("APCA diagnostics require an opaque resolved surface");
  const opaqueBackground = composite(parseColor(backgroundValue), surface);
  const visibleForeground = composite(parseColor(foregroundValue), opaqueBackground);
  return contrastAPCA(toHex(opaqueBackground), toHex(visibleForeground));
}

export function tokenPreviewKind(value: string): "color" | "length" | "shadow" | "text" {
  try { parseColor(value); return "color"; }
  catch {
    if (/^-?[\d.]+(?:px|rem|em|%)$/u.test(value)) return "length";
    if (/^[-\d.]+\s+[-\d.]+(?:px)?\s+/u.test(value) || value.includes("#")) return "shadow";
    return "text";
  }
}
