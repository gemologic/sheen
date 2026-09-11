import type { Mode } from "./schema.ts";

export type AccentName = "jade" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "rose" | "red" | "orange" | "amber";

export interface ThemeMetadata {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly defaultMode: Mode;
  readonly iconSet: "radix" | "phosphor";
}
export type IconSetName = ThemeMetadata["iconSet"];

export const accentNames: readonly AccentName[] = Object.freeze([
  "jade", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "rose", "red", "orange", "amber",
]);

export function isAccentName(name: string): name is AccentName { return accentNames.some(candidate => candidate === name); }

export const bundledThemeMetadata: readonly ThemeMetadata[] = Object.freeze([
  { id: "obsidian", label: "Obsidian", description: "Obsidian surfaces with independent accent selection", defaultMode: "dark", iconSet: "radix" },
  { id: "paper", label: "Paper", description: "Paper surfaces with independent accent selection", defaultMode: "dark", iconSet: "radix" },
  { id: "vellum", label: "Vellum", description: "Vellum surfaces with independent accent selection", defaultMode: "dark", iconSet: "phosphor" },
  { id: "contrast", label: "Contrast", description: "Contrast surfaces with independent accent selection", defaultMode: "dark", iconSet: "radix" },
  { id: "slate", label: "Slate", description: "Slate surfaces with independent accent selection", defaultMode: "dark", iconSet: "radix" },
  { id: "graphite", label: "Graphite", description: "Graphite surfaces with independent accent selection", defaultMode: "dark", iconSet: "radix" },
  { id: "studio", label: "Studio", description: "Studio surfaces with independent accent selection", defaultMode: "dark", iconSet: "phosphor" },
]);

export function iconSetForTheme(themeId: string, themes: readonly ThemeMetadata[] = bundledThemeMetadata): IconSetName {
  return themes.find(theme => theme.id === themeId)?.iconSet ?? "radix";
}
