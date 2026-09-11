import { accentNames, bundledThemeMetadata, isAccentName } from "@gemologic/sheen-tokens/catalog";
import type { AccentName } from "@gemologic/sheen-tokens/catalog";
import type { Mode } from "@gemologic/sheen-tokens";

export interface ThemeState {
  theme: string;
  mode: Mode | "system";
  accent: AccentName;
  density: "compact" | "comfortable" | "spacious";
  radius: "sharp" | "soft" | "round";
  motion: "full" | "reduced";
  direction: "ltr" | "rtl";
  locale: string;
}

export const defaultThemeState: Readonly<ThemeState> = Object.freeze({ theme: "obsidian", mode: "dark", accent: "jade", density: "comfortable", radius: "soft", motion: "full", direction: "ltr", locale: "en-US" });
export type ThemeOverrides = { [K in keyof ThemeState]?: ThemeState[K] | null };

export function resolveThemeState(parent: ThemeState, overrides: ThemeOverrides, defaults: ThemeState): ThemeState {
  return {
    theme: overrides.theme === null ? defaults.theme : overrides.theme ?? parent.theme,
    mode: overrides.mode === null ? defaults.mode : overrides.mode ?? parent.mode,
    accent: overrides.accent === null ? defaults.accent : overrides.accent ?? parent.accent,
    density: overrides.density === null ? defaults.density : overrides.density ?? parent.density,
    radius: overrides.radius === null ? defaults.radius : overrides.radius ?? parent.radius,
    motion: overrides.motion === null ? defaults.motion : overrides.motion ?? parent.motion,
    direction: overrides.direction === null ? defaults.direction : overrides.direction ?? parent.direction,
    locale: overrides.locale === null ? defaults.locale : overrides.locale ?? parent.locale,
  };
}

export function readThemeState(value: unknown, fallback: ThemeState, themeIds: readonly string[] = bundledThemeMetadata.map(theme => theme.id)): ThemeState {
  if (typeof value !== "object" || value === null) return { ...fallback };
  const result = { ...fallback };
  if ("theme" in value && typeof value.theme === "string" && themeIds.includes(value.theme)) result.theme = value.theme;
  if ("mode" in value && (value.mode === "dark" || value.mode === "light" || value.mode === "system")) result.mode = value.mode;
  if ("accent" in value && typeof value.accent === "string" && isAccentName(value.accent)) result.accent = value.accent;
  if ("density" in value && (value.density === "compact" || value.density === "comfortable" || value.density === "spacious")) result.density = value.density;
  if ("radius" in value && (value.radius === "sharp" || value.radius === "soft" || value.radius === "round")) result.radius = value.radius;
  if ("motion" in value && (value.motion === "full" || value.motion === "reduced")) result.motion = value.motion;
  if ("direction" in value && (value.direction === "rtl" || value.direction === "ltr")) result.direction = value.direction;
  if ("locale" in value && typeof value.locale === "string") {
    try { if (Intl.getCanonicalLocales(value.locale).length) result.locale = value.locale; } catch { /* Invalid persisted locale uses the explicit fallback. */ }
  }
  return result;
}

export const themeChoices = Object.freeze({ theme: bundledThemeMetadata.map(theme => theme.id), mode: ["dark", "light", "system"], accent: accentNames, density: ["compact", "comfortable", "spacious"], radius: ["sharp", "soft", "round"], motion: ["full", "reduced"], direction: ["ltr", "rtl"] });
