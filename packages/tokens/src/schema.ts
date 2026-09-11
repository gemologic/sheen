export const semanticDefaults = {
  "color-bg": "{gray.980}",
  "color-bg-subtle": "{gray.1000}",
  "color-bg-raised": "{gray.940}",
  "color-bg-overlay": "#00000099",
  "color-bg-inset": "{gray.1000}",
  "color-bg-hover": "{gray.900}",
  "color-bg-active": "{gray.850}",
  "color-bg-selected": "{gray.800}",
  "color-fg": "{gray.30}",
  "color-fg-muted": "{gray.300}",
  "color-fg-subtle": "{gray.500}",
  "color-fg-on-accent": "#07130f",
  "color-border": "{gray.850}",
  "color-border-control": "{gray.400}",
  "color-border-strong": "{gray.400}",
  "color-border-subtle": "{gray.900}",
  "color-focus-ring": "#ffffff",
  "color-focus-ring-offset": "{color-bg}",
  "color-accent": "#6ee7b7",
  "color-accent-hover": "#a7f3d0",
  "color-accent-active": "#6ee7b7",
  "color-accent-subtle": "#10362a",
  "color-accent-fg": "#6ee7b7",
  "color-neutral": "{color-fg}",
  "color-neutral-fg": "{color-fg}",
  "color-neutral-subtle": "{color-bg-subtle}",
  "color-neutral-on": "{color-bg}",
  "color-info": "#93c5fd",
  "color-info-subtle": "#172554",
  "color-info-fg": "#bfdbfe",
  "color-info-border": "#93c5fd",
  "color-info-on": "{color-fg-on-accent}",
  "color-success": "#86efac",
  "color-success-subtle": "#052e16",
  "color-success-fg": "#bbf7d0",
  "color-success-border": "#86efac",
  "color-success-on": "{color-fg-on-accent}",
  "color-warning": "#fde047",
  "color-warning-subtle": "#422006",
  "color-warning-fg": "#fef08a",
  "color-warning-border": "#fde047",
  "color-warning-on": "{color-fg-on-accent}",
  "color-danger": "#fda4af",
  "color-danger-subtle": "#4c0519",
  "color-danger-fg": "#fecdd3",
  "color-danger-border": "#fda4af",
  "color-danger-on": "{color-fg-on-accent}",
  "color-market-up": "#34d399",
  "color-market-up-subtle": "#022c22",
  "color-market-up-fg": "#6ee7b7",
  "color-market-up-border": "#34d399",
  "color-market-up-on": "{color-fg-on-accent}",
  "color-market-down": "#fb7185",
  "color-market-down-subtle": "#4c0519",
  "color-market-down-fg": "#fda4af",
  "color-market-down-border": "#fb7185",
  "color-market-down-on": "{color-fg-on-accent}",
  "color-market-flat": "#cbd5e1",
  "color-market-flat-subtle": "#1e293b",
  "color-market-flat-fg": "#e2e8f0",
  "color-market-flat-border": "#cbd5e1",
  "color-market-flat-on": "{color-fg-on-accent}",
  "chart-1": "#6ee7b7",
  "chart-2": "#93c5fd",
  "chart-3": "#fda4af",
  "chart-4": "#fde047",
  "chart-5": "#c4b5fd",
  "chart-6": "#67e8f9",
  "chart-7": "#fdba74",
  "chart-8": "#f0abfc",
  "chart-grid": "{color-border}",
  "chart-axis": "{color-fg-muted}",
  "chart-crosshair": "{color-fg}",
  "chart-area-opacity": "0.12",
  "chart-line-width": "1.5",
  "space-inline-xs": "4px", "space-inline-sm": "6px", "space-inline-md": "8px", "space-inline-lg": "12px", "space-inline-xl": "16px",
  "space-block-xs": "4px", "space-block-sm": "8px", "space-block-md": "12px", "space-block-lg": "16px", "space-block-xl": "24px",
  "space-section": "24px", "space-gutter": "16px",
  "control-h-xs": "22px", "control-h-sm": "26px", "control-h-md": "30px", "control-h-lg": "36px",
  "control-px-xs": "6px", "control-px-sm": "8px", "control-px-md": "10px", "control-px-lg": "12px",
  "control-radius": "5px", "control-border-width": "1px",
  "font-sans": "'IBM Plex Sans', system-ui, sans-serif", "font-mono": "'IBM Plex Mono', monospace",
  "text-caption-size": "11px", "text-caption-leading": "16px", "text-caption-weight": "400",
  "text-ui-sm-size": "12px", "text-ui-sm-leading": "16px", "text-ui-sm-weight": "400",
  "text-ui-size": "13px", "text-ui-leading": "20px", "text-ui-weight": "400",
  "text-body-size": "14px", "text-body-leading": "22px", "text-body-weight": "400",
  "text-code-size": "12px", "text-code-leading": "20px", "text-code-weight": "400",
  "text-h1-size": "24px", "text-h1-leading": "32px", "text-h1-weight": "600",
  "text-h2-size": "20px", "text-h2-leading": "28px", "text-h2-weight": "600",
  "text-h3-size": "16px", "text-h3-leading": "24px", "text-h3-weight": "600",
  "text-h4-size": "14px", "text-h4-leading": "20px", "text-h4-weight": "600",
  "icon-size-sm": "14px", "icon-size-md": "16px", "icon-size-lg": "20px", "icon-stroke": "1.5",
  "elevation-raised": "0 1px 3px #00000033", "elevation-overlay": "0 8px 24px #00000044", "elevation-modal": "0 16px 48px #00000066",
  "surface-radius": "8px",
  "duration-fast": "100ms", "duration-normal": "150ms", "duration-slow": "250ms",
  "ease-standard": "cubic-bezier(0.2, 0, 0, 1)", "ease-entrance": "cubic-bezier(0, 0, 0, 1)", "ease-exit": "cubic-bezier(0.3, 0, 1, 1)",
};

export type TokenName = keyof typeof semanticDefaults;
export type Tokens = Readonly<Record<TokenName, string>>;
export type Mode = "light" | "dark";
export type PrimitiveMap = Readonly<Record<string, string>>;

export const currentSchemaVersion = 3;
export const versionedDefaults: Partial<Record<TokenName, { introduced: number; value: string }>> = {
  "color-border-control": { introduced: 2, value: "{color-border-strong}" },
  "color-focus-ring-offset": { introduced: 2, value: "{color-bg}" },
  "color-neutral": { introduced: 3, value: "{color-fg}" },
  "color-neutral-fg": { introduced: 3, value: "{color-fg}" },
  "color-neutral-subtle": { introduced: 3, value: "{color-bg-subtle}" },
  "color-neutral-on": { introduced: 3, value: "{color-bg}" },
  "color-info-on": { introduced: 3, value: "{color-fg-on-accent}" },
  "color-success-on": { introduced: 3, value: "{color-fg-on-accent}" },
  "color-warning-on": { introduced: 3, value: "{color-fg-on-accent}" },
  "color-danger-on": { introduced: 3, value: "{color-fg-on-accent}" },
  "color-market-up-border": { introduced: 3, value: "{color-market-up}" },
  "color-market-down-border": { introduced: 3, value: "{color-market-down}" },
  "color-market-flat-border": { introduced: 3, value: "{color-market-flat}" },
  "color-market-up-on": { introduced: 3, value: "{color-fg-on-accent}" },
  "color-market-down-on": { introduced: 3, value: "{color-fg-on-accent}" },
  "color-market-flat-on": { introduced: 3, value: "{color-fg-on-accent}" },
};

export function isTokenName(name: string): name is TokenName {
  return Object.hasOwn(semanticDefaults, name);
}

export interface ThemeDefinition {
  readonly schemaVersion: number;
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly defaultMode: Mode;
  readonly iconSet: "radix" | "phosphor";
  readonly primitives: PrimitiveMap;
  readonly dark: Partial<Tokens>;
  readonly light: Partial<Tokens>;
}

export interface Theme extends Omit<ThemeDefinition, "dark" | "light"> {
  readonly dark: Tokens;
  readonly light: Tokens;
}
