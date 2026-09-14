import type { AccentName } from "./catalog.ts";
import { parseColor, toHex } from "./color.ts";
import type { Mode, Tokens } from "./schema.ts";

interface Accent { readonly light: string; readonly dark: string; readonly lightSubtle: string; readonly darkSubtle: string }
export const accents = {
  jade: { light: "#065f46", dark: "#6ee7b7", lightSubtle: "#d1fae5", darkSubtle: "#022c22" },
  teal: { light: "#115e59", dark: "#5eead4", lightSubtle: "#ccfbf1", darkSubtle: "#042f2e" },
  cyan: { light: "#155e75", dark: "#67e8f9", lightSubtle: "#cffafe", darkSubtle: "#083344" },
  sky: { light: "#075985", dark: "#7dd3fc", lightSubtle: "#e0f2fe", darkSubtle: "#082f49" },
  blue: { light: "#1e40af", dark: "#93c5fd", lightSubtle: "#dbeafe", darkSubtle: "#172554" },
  indigo: { light: "#3730a3", dark: "#a5b4fc", lightSubtle: "#e0e7ff", darkSubtle: "#1e1b4b" },
  violet: { light: "#5b21b6", dark: "#c4b5fd", lightSubtle: "#ede9fe", darkSubtle: "#2e1065" },
  purple: { light: "#6b21a8", dark: "#d8b4fe", lightSubtle: "#f3e8ff", darkSubtle: "#3b0764" },
  rose: { light: "#9f1239", dark: "#fda4af", lightSubtle: "#ffe4e6", darkSubtle: "#4c0519" },
  red: { light: "#991b1b", dark: "#fca5a5", lightSubtle: "#fee2e2", darkSubtle: "#450a0a" },
  orange: { light: "#9a3412", dark: "#fdba74", lightSubtle: "#ffedd5", darkSubtle: "#431407" },
  amber: { light: "#92400e", dark: "#fde68a", lightSubtle: "#fef3c7", darkSubtle: "#451a03" },
} satisfies Record<AccentName, Accent>;

export function accentTokens(name: AccentName, mode: Mode, themeId?: string): Partial<Tokens> {
  const accent = accents[name], color = accent[mode];
  const extreme = mode === "dark" ? "#ffffff" : "#000000";
  return {
    "color-accent": color,
    "color-accent-hover": toHex(parseColor(`color-mix(in oklab, ${color} 92%, ${extreme})`)),
    "color-accent-active": toHex(parseColor(`color-mix(in oklab, ${color} 84%, ${extreme})`)),
    "color-accent-fg": color, "color-accent-subtle": themeId === "contrast" ? (mode === "dark" ? "#000000" : "#ffffff") : mode === "dark" ? accent.darkSubtle : accent.lightSubtle,
    "color-fg-on-accent": mode === "dark" ? "#050505" : "#ffffff",
  };
}
