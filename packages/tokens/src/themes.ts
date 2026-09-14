import { defineTheme, emitTokenDeclarations, validateContrast } from "./define.ts";
import { accentTokens } from "./accents.ts";
import { accentNames } from "./catalog.ts";
import type { AccentName, IconSetName } from "./catalog.ts";
import { currentSchemaVersion, semanticDefaults } from "./schema.ts";
import type { Mode, Theme, Tokens } from "./schema.ts";
import { primitives } from "./primitives.ts";

const lightTokens: Tokens = {
  ...semanticDefaults,
  "color-bg": "#fafafa", "color-bg-subtle": "#f4f4f5", "color-bg-raised": "#ffffff", "color-bg-inset": "#f4f4f5",
  "color-bg-hover": "#e4e4e7", "color-bg-active": "#d4d4d8", "color-bg-selected": "#e0e7ff",
  "color-fg": "#18181b", "color-fg-muted": "#52525b", "color-fg-subtle": "#71717a",
  "color-border": "#d4d4d8", "color-border-control": "#71717a", "color-border-strong": "#71717a", "color-border-subtle": "#e4e4e7",
  "color-focus-ring": "#18181b",
  "color-info": "#1e3a8a", "color-info-fg": "#1e3a8a", "color-info-subtle": "#eff6ff", "color-info-border": "#1e40af",
  "color-success": "#14532d", "color-success-fg": "#14532d", "color-success-subtle": "#f0fdf4", "color-success-border": "#166534",
  "color-warning": "#78350f", "color-warning-fg": "#78350f", "color-warning-subtle": "#fffbeb", "color-warning-border": "#92400e",
  "color-danger": "#881337", "color-danger-fg": "#881337", "color-danger-subtle": "#fff1f2", "color-danger-border": "#9f1239",
  "color-market-up": "#064e3b", "color-market-up-fg": "#064e3b", "color-market-up-subtle": "#ecfdf5", "color-market-up-border": "#065f46",
  "color-market-down": "#7f1d1d", "color-market-down-fg": "#7f1d1d", "color-market-down-subtle": "#fef2f2", "color-market-down-border": "#991b1b",
  "color-market-flat": "#334155", "color-market-flat-fg": "#334155", "color-market-flat-subtle": "#f1f5f9", "color-market-flat-border": "#475569",
  "chart-1": "#065f46", "chart-2": "#1e40af", "chart-3": "#9f1239", "chart-4": "#92400e", "chart-5": "#5b21b6", "chart-6": "#155e75", "chart-7": "#9a3412", "chart-8": "#86198f",
  ...accentTokens("jade", "light"),
};

function theme(id: string, label: string, dark: Partial<Tokens>, light: Partial<Tokens>, iconSet: IconSetName = "radix"): Theme {
  return defineTheme({
    schemaVersion: currentSchemaVersion, id, label, description: `${label} surfaces with independent accent selection`, defaultMode: "dark", iconSet, primitives,
    dark: { ...semanticDefaults, ...dark }, light: { ...lightTokens, ...light },
  });
}

export const obsidian = theme("obsidian", "Obsidian", {}, {});
export const paper = theme("paper", "Paper", {
  "color-bg": "#171716", "color-bg-subtle": "#111110", "color-bg-raised": "#252523", "color-bg-inset": "#10100f",
  "color-bg-hover": "#2b2b28", "color-bg-active": "#33332f", "color-bg-selected": "#393934",
  "color-fg": "#f5f5ef", "color-fg-muted": "#c4c4bb", "color-fg-subtle": "#8a8a82",
  "color-border": "#343431", "color-border-control": "#9b9b92", "color-border-strong": "#9b9b92", "color-border-subtle": "#292927",
  "color-focus-ring": "#ffffff",
}, {
  "color-bg": "#ffffff", "color-bg-subtle": "#f7f7f5", "color-bg-raised": "#ffffff", "color-bg-inset": "#f1f1ef",
  "color-bg-hover": "#e9e9e6", "color-bg-active": "#ddddda", "color-bg-selected": "#e4e4e0",
  "color-fg": "#171716", "color-fg-muted": "#555550", "color-fg-subtle": "#777771",
  "color-border": "#d0d0cc", "color-border-control": "#70706a", "color-border-strong": "#70706a", "color-border-subtle": "#e5e5e1",
  "color-focus-ring": "#171716",
});
const readingType: Partial<Tokens> = {
  "text-body-size": "16px", "text-body-leading": "26px",
  "control-h-xs": "24px", "control-h-sm": "28px", "control-h-md": "34px", "control-h-lg": "40px",
  "space-block-sm": "10px", "space-block-md": "14px", "space-block-lg": "18px", "space-block-xl": "28px",
};
export const vellum = theme("vellum", "Vellum", {
  ...readingType,
  "color-bg": "#1c1917", "color-bg-raised": "#292524", "color-bg-subtle": "#151210", "color-bg-inset": "#171412",
  "color-bg-hover": "#302a26", "color-bg-active": "#39312c", "color-bg-selected": "#40372f",
  "color-fg": "#faf7f2", "color-fg-muted": "#cec5b8", "color-fg-subtle": "#938a7d",
  "color-border": "#3f3832", "color-border-control": "#a89e90", "color-border-strong": "#a89e90", "color-border-subtle": "#302a26",
  "color-focus-ring": "#fffaf2",
}, {
  ...readingType,
  "color-bg": "#fbf7ed", "color-bg-raised": "#fffdf8", "color-bg-subtle": "#f5eddf", "color-bg-inset": "#f1e8d8",
  "color-bg-hover": "#e9dfcf", "color-bg-active": "#ddd1bf", "color-bg-selected": "#e4dacb",
  "color-fg": "#211d18", "color-fg-muted": "#5b534a", "color-fg-subtle": "#7d7469",
  "color-border": "#d6cab8", "color-border-control": "#746a5e", "color-border-strong": "#746a5e", "color-border-subtle": "#e8dece",
  "color-focus-ring": "#211d18",
}, "phosphor");
export const contrast = theme("contrast", "Contrast", {
  "color-bg": "#000000", "color-bg-raised": "#000000", "color-bg-subtle": "#000000", "color-bg-inset": "#000000", "color-bg-hover": "#000000", "color-bg-active": "#000000", "color-bg-selected": "#000000",
  "color-fg": "#ffffff", "color-fg-muted": "#eeeeee", "color-fg-subtle": "#b3b3b3",
  "color-border": "#ffffff", "color-border-control": "#ffffff", "color-border-strong": "#ffffff", "color-border-subtle": "#ffffff", "control-border-width": "2px", "color-accent-subtle": "#000000",
  "color-info-subtle": "#000000", "color-success-subtle": "#000000", "color-warning-subtle": "#000000", "color-danger-subtle": "#000000",
  "color-market-up-subtle": "#000000", "color-market-down-subtle": "#000000", "color-market-flat-subtle": "#000000",
}, {
  "color-bg": "#ffffff", "color-bg-raised": "#ffffff", "color-bg-subtle": "#ffffff", "color-bg-inset": "#ffffff", "color-bg-hover": "#ffffff", "color-bg-active": "#ffffff", "color-bg-selected": "#ffffff",
  "color-fg": "#000000", "color-fg-muted": "#272727", "color-fg-subtle": "#595959",
  "color-border": "#000000", "color-border-control": "#000000", "color-border-strong": "#000000", "color-border-subtle": "#000000", "control-border-width": "2px", "color-accent-subtle": "#ffffff",
  "color-info-subtle": "#ffffff", "color-success-subtle": "#ffffff", "color-warning-subtle": "#ffffff", "color-danger-subtle": "#ffffff",
  "color-market-up-subtle": "#ffffff", "color-market-down-subtle": "#ffffff", "color-market-flat-subtle": "#ffffff",
});
export const slate = theme("slate", "Slate", {
  "color-bg": "#0f172a", "color-bg-subtle": "#0b1120", "color-bg-raised": "#1e293b", "color-bg-inset": "#111827",
  "color-bg-hover": "#25334a", "color-bg-active": "#2d3c54", "color-bg-selected": "#334155",
  "color-fg": "#f8fafc", "color-fg-muted": "#cbd5e1", "color-fg-subtle": "#94a3b8",
  "color-border": "#334155", "color-border-control": "#94a3b8", "color-border-strong": "#94a3b8", "color-border-subtle": "#1e293b",
  "color-focus-ring": "#ffffff",
}, {
  "color-bg": "#f8fafc", "color-bg-subtle": "#f1f5f9", "color-bg-raised": "#ffffff", "color-bg-inset": "#e2e8f0",
  "color-bg-hover": "#e2e8f0", "color-bg-active": "#cbd5e1", "color-bg-selected": "#dbeafe",
  "color-fg": "#172033", "color-fg-muted": "#475569", "color-fg-subtle": "#64748b",
  "color-border": "#cbd5e1", "color-border-control": "#64748b", "color-border-strong": "#64748b", "color-border-subtle": "#e2e8f0",
  "color-focus-ring": "#172033",
});
export const graphite = theme("graphite", "Graphite", {
  "color-bg": "#171717", "color-bg-subtle": "#101010", "color-bg-raised": "#262626", "color-bg-inset": "#121212",
  "color-bg-hover": "#2e2e2e", "color-bg-active": "#363636", "color-bg-selected": "#404040",
  "color-fg": "#fafafa", "color-fg-muted": "#d4d4d4", "color-fg-subtle": "#a3a3a3",
  "color-border": "#383838", "color-border-control": "#a3a3a3", "color-border-strong": "#a3a3a3", "color-border-subtle": "#2b2b2b",
  "color-focus-ring": "#ffffff",
}, {
  "color-bg": "#fafafa", "color-bg-subtle": "#f5f5f5", "color-bg-raised": "#ffffff", "color-bg-inset": "#ededed",
  "color-bg-hover": "#e5e5e5", "color-bg-active": "#d4d4d4", "color-bg-selected": "#dedede",
  "color-fg": "#171717", "color-fg-muted": "#525252", "color-fg-subtle": "#737373",
  "color-border": "#d4d4d4", "color-border-control": "#6b6b6b", "color-border-strong": "#6b6b6b", "color-border-subtle": "#e5e5e5",
  "color-focus-ring": "#171717",
});
const studioType: Partial<Tokens> = {
  "text-body-size": "15px", "text-body-leading": "24px",
  "text-h1-size": "26px", "text-h1-leading": "34px",
  "text-h2-size": "21px", "text-h2-leading": "30px",
  "text-h3-size": "17px", "text-h3-leading": "24px",
};
export const studio = theme("studio", "Studio", {
  ...studioType,
  "color-bg": "#111113", "color-bg-subtle": "#0b0b0d", "color-bg-raised": "#1a1a1e", "color-bg-inset": "#09090b",
  "color-bg-hover": "#252529", "color-bg-active": "#2e2e34", "color-bg-selected": "#292930",
  "color-fg": "#fafafa", "color-fg-muted": "#b4b4bd", "color-fg-subtle": "#85858f",
  "color-border": "#34343a", "color-border-control": "#8f8f9a", "color-border-strong": "#8f8f9a", "color-border-subtle": "#29292e",
  "color-focus-ring": "#ffffff",
}, {
  ...studioType,
  "color-bg": "#f7f8fa", "color-bg-subtle": "#f0f1f4", "color-bg-raised": "#ffffff", "color-bg-inset": "#ebedf1",
  "color-bg-hover": "#e6e8ed", "color-bg-active": "#d9dce3", "color-bg-selected": "#e1e4ea",
  "color-fg": "#17171a", "color-fg-muted": "#4e4f57", "color-fg-subtle": "#70717b",
  "color-border": "#d2d5dc", "color-border-control": "#6f7079", "color-border-strong": "#6f7079", "color-border-subtle": "#e2e4e9",
  "color-focus-ring": "#17171a",
}, "phosphor");
export const themes: readonly Theme[] = Object.freeze([obsidian, paper, vellum, contrast, slate, graphite, studio]);

export function buildAccent(name: AccentName): string {
  const rules: string[] = [];
  for (const mode of ["dark", "light"] satisfies Mode[]) {
    const tokens = accentTokens(name, mode);
    for (const base of themes) {
      const diagnostics = validateContrast({ ...base[mode], ...accentTokens(name, mode, base.id) }, base.id === "contrast" ? 7 : 4.5);
      if (diagnostics.length) throw new Error(`${base.id}/${mode}/${name}: ${diagnostics.join("\n")}`);
    }
    rules.push(`[data-sheen-mode="${mode}"][data-sheen-accent="${name}"] {\n${emitTokenDeclarations(tokens)}\n}`);
    rules.push(`[data-sheen-theme="contrast"][data-sheen-mode="${mode}"][data-sheen-accent="${name}"] {\n${emitTokenDeclarations(accentTokens(name, mode, "contrast"))}\n}`);
  }
  return rules.join("\n") + "\n";
}

export function buildAccents(): string { return accentNames.map(buildAccent).join(""); }
