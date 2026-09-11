import { defaultThemeState, themeChoices } from "./state.ts";
import type { ThemeOverrides, ThemeState } from "./state.ts";
import { bundledThemeMetadata } from "@gemologic/sheen-tokens/catalog";
import type { ThemeMetadata } from "@gemologic/sheen-tokens/catalog";

interface ScriptConfig { defaults: ThemeState; storageKey: string; choices: Readonly<Record<string, readonly string[]>>; iconSets: Readonly<Record<string, ThemeMetadata["iconSet"]>> }

function bootstrap(config: ScriptConfig): void {
  const state: Record<string, string> = { ...config.defaults };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(config.storageKey) ?? "null");
    if (typeof saved === "object" && saved !== null) {
      for (const [name, value] of Object.entries(saved)) {
        if (typeof value !== "string") continue;
        if (config.choices[name]?.includes(value)) state[name] = value;
        if (name === "locale") {
          try { if (Intl.getCanonicalLocales(value).length) state.locale = value; } catch { /* Use the configured locale for invalid input. */ }
        }
      }
    }
  } catch { /* Storage is optional; configured dark defaults remain usable. */ }
  const root = document.documentElement;
  for (const [name, value] of Object.entries(state)) {
    const resolved = name === "mode" && value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    root.setAttribute(`data-sheen-${name}`, resolved);
  }
  root.setAttribute("data-sheen-preference", state.mode ?? "dark");
  root.setAttribute("data-sheen-icon-set", config.iconSets[state.theme ?? ""] ?? "radix");
  root.setAttribute("dir", state.direction ?? "ltr");
  root.setAttribute("lang", state.locale ?? "en-US");
}

export function createThemeScript(options: { defaults?: ThemeState; storageKey?: string; themeIds?: readonly string[]; themes?: readonly ThemeMetadata[] } = {}): string {
  const themes = options.themes ?? bundledThemeMetadata;
  const themeIds = options.themeIds ?? themes.map(theme => theme.id);
  const config: ScriptConfig = {
    defaults: options.defaults ?? { ...defaultThemeState },
    storageKey: options.storageKey ?? "sheen",
    choices: { ...themeChoices, theme: themeIds },
    iconSets: Object.fromEntries(themes.map(theme => [theme.id, theme.iconSet])),
  };
  const json = JSON.stringify(config).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  return `(${bootstrap.toString()})(${json});`;
}

function bootstrapScope(overrides: ThemeOverrides, defaults: ThemeState, iconSets: Readonly<Record<string, ThemeMetadata["iconSet"]>>): void {
  const scope = document.currentScript?.parentElement;
  const parent = scope?.parentElement?.closest("[data-sheen-theme]");
  if (!scope || !parent) return;
  for (const [axis, fallback] of Object.entries(defaults)) {
    const supplied: unknown = Object.getOwnPropertyDescriptor(overrides, axis)?.value;
    let value = supplied === null ? fallback : typeof supplied === "string" ? supplied : parent.getAttribute(`data-sheen-${axis}`) ?? fallback;
    if (axis === "mode" && value === "system") value = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    scope.setAttribute(`data-sheen-${axis}`, value);
    const target = scope.querySelector(':scope > [data-sheen-portal="scope"]');
    target?.setAttribute(`data-sheen-${axis}`, value);
  }
  scope.setAttribute("dir", scope.getAttribute("data-sheen-direction") ?? "ltr");
  scope.setAttribute("lang", scope.getAttribute("data-sheen-locale") ?? "en-US");
  const target = scope.querySelector(':scope > [data-sheen-portal="scope"]');
  const iconSet = iconSets[scope.getAttribute("data-sheen-theme") ?? ""] ?? "radix";
  scope.setAttribute("data-sheen-icon-set", iconSet);
  target?.setAttribute("data-sheen-icon-set", iconSet);
}

export function createScopeScript(overrides: ThemeOverrides, defaults: ThemeState, themes: readonly ThemeMetadata[] = bundledThemeMetadata): string {
  const encode = (value: unknown): string => JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  const iconSets = Object.fromEntries(themes.map(theme => [theme.id, theme.iconSet]));
  return `(${bootstrapScope.toString()})(${encode(overrides)},${encode(defaults)},${encode(iconSets)});`;
}
