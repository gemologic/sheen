import { emitTokenDeclarations } from "./define.ts";
import { primitives } from "./primitives.ts";
import { semanticDefaults } from "./schema.ts";
import type { TokenName } from "./schema.ts";

type ColorTokenName = Extract<TokenName, `color-${string}`>;

const forcedColorTokens = {
  "color-bg": "Canvas !important",
  "color-bg-subtle": "Canvas !important",
  "color-bg-raised": "Canvas !important",
  "color-bg-overlay": "Canvas !important",
  "color-bg-inset": "Canvas !important",
  "color-bg-hover": "Canvas !important",
  "color-bg-active": "Canvas !important",
  "color-bg-selected": "Canvas !important",
  "color-fg": "CanvasText !important",
  "color-fg-muted": "CanvasText !important",
  "color-fg-subtle": "GrayText !important",
  "color-fg-on-accent": "HighlightText !important",
  "color-border": "CanvasText !important",
  "color-border-control": "ButtonText !important",
  "color-border-strong": "CanvasText !important",
  "color-border-subtle": "CanvasText !important",
  "color-focus-ring": "Highlight !important",
  "color-focus-ring-offset": "Canvas !important",
  "color-accent": "Highlight !important",
  "color-accent-hover": "Highlight !important",
  "color-accent-active": "Highlight !important",
  "color-accent-subtle": "Canvas !important",
  "color-accent-fg": "LinkText !important",
  "color-neutral": "ButtonText !important",
  "color-neutral-fg": "CanvasText !important",
  "color-neutral-subtle": "Canvas !important",
  "color-neutral-on": "ButtonFace !important",
  "color-info": "ButtonText !important",
  "color-info-subtle": "Canvas !important",
  "color-info-fg": "CanvasText !important",
  "color-info-border": "ButtonText !important",
  "color-info-on": "ButtonFace !important",
  "color-success": "ButtonText !important",
  "color-success-subtle": "Canvas !important",
  "color-success-fg": "CanvasText !important",
  "color-success-border": "ButtonText !important",
  "color-success-on": "ButtonFace !important",
  "color-warning": "ButtonText !important",
  "color-warning-subtle": "Canvas !important",
  "color-warning-fg": "CanvasText !important",
  "color-warning-border": "ButtonText !important",
  "color-warning-on": "ButtonFace !important",
  "color-danger": "ButtonText !important",
  "color-danger-subtle": "Canvas !important",
  "color-danger-fg": "CanvasText !important",
  "color-danger-border": "ButtonText !important",
  "color-danger-on": "ButtonFace !important",
  "color-market-up": "ButtonText !important",
  "color-market-up-subtle": "Canvas !important",
  "color-market-up-fg": "CanvasText !important",
  "color-market-up-border": "ButtonText !important",
  "color-market-up-on": "ButtonFace !important",
  "color-market-down": "ButtonText !important",
  "color-market-down-subtle": "Canvas !important",
  "color-market-down-fg": "CanvasText !important",
  "color-market-down-border": "ButtonText !important",
  "color-market-down-on": "ButtonFace !important",
  "color-market-flat": "ButtonText !important",
  "color-market-flat-subtle": "Canvas !important",
  "color-market-flat-fg": "CanvasText !important",
  "color-market-flat-border": "ButtonText !important",
  "color-market-flat-on": "ButtonFace !important",
} satisfies Readonly<Record<ColorTokenName, string>>;

export function buildCore(): string {
  const primitiveTokens = Object.fromEntries(Object.entries(primitives).map(([key, value]) => [key.replaceAll(".", "-"), value]));
  return `:root {\n${emitTokenDeclarations(primitiveTokens)}\n}
@supports (color: oklch(50% 0 0)) {
  :root {\n${emitTokenDeclarations(primitiveTokens, true)}\n  }
}
[data-sheen-theme] {
  --sheen-button-radius: var(--sheen-control-radius);
  --sheen-density-row-compact: 28px; --sheen-density-row-comfortable: 34px; --sheen-density-row-spacious: 42px;
  --sheen-density-compact-inline-xs: 2px; --sheen-density-compact-inline-md: 6px; --sheen-density-compact-block-xs: 2px;
  --sheen-table-row-h: 34px;
  --sheen-sidebar-w: 220px;
  --sheen-sidebar-w-collapsed: 48px;
  --sheen-topbar-h: 44px;
  --sheen-statusbar-h: 26px;
}
[data-sheen-density="compact"] {
  --sheen-control-h-xs: 18px; --sheen-control-h-sm: 24px; --sheen-control-h-md: 26px; --sheen-control-h-lg: 32px;
  --sheen-control-px-xs: 4px; --sheen-control-px-sm: 6px; --sheen-control-px-md: 8px; --sheen-control-px-lg: 10px;
  --sheen-table-row-h: var(--sheen-density-row-compact, 28px);
  --sheen-space-inline-xs: var(--sheen-density-compact-inline-xs, 2px); --sheen-space-inline-sm: 4px; --sheen-space-inline-md: var(--sheen-density-compact-inline-md, 6px); --sheen-space-inline-lg: 8px; --sheen-space-inline-xl: 12px;
  --sheen-space-block-xs: var(--sheen-density-compact-block-xs, 2px); --sheen-space-block-sm: 4px; --sheen-space-block-md: 8px; --sheen-space-block-lg: 12px; --sheen-space-block-xl: 16px;
  --sheen-space-gutter: 12px; --sheen-space-section: 16px;
}
[data-sheen-density="comfortable"] {
${Object.entries(semanticDefaults).filter(([name]) => name.startsWith("space-") || name.startsWith("control-px-")).map(([name, value]) => `  --sheen-${name}: var(--sheen-density-comfortable-${name}, ${value});`).join("\n")}
  --sheen-control-h-xs: 22px; --sheen-control-h-sm: 26px; --sheen-control-h-md: 30px; --sheen-control-h-lg: 36px;
  --sheen-table-row-h: var(--sheen-density-row-comfortable, 34px);
}
[data-sheen-density="spacious"] {
  --sheen-control-h-xs: 26px; --sheen-control-h-sm: 30px; --sheen-control-h-md: 34px; --sheen-control-h-lg: 40px;
  --sheen-control-px-xs: 8px; --sheen-control-px-sm: 10px; --sheen-control-px-md: 12px; --sheen-control-px-lg: 16px;
  --sheen-table-row-h: var(--sheen-density-row-spacious, 42px);
  --sheen-space-inline-xs: 6px; --sheen-space-inline-sm: 8px; --sheen-space-inline-md: 12px; --sheen-space-inline-lg: 16px; --sheen-space-inline-xl: 20px;
  --sheen-space-block-xs: 6px; --sheen-space-block-sm: 12px; --sheen-space-block-md: 16px; --sheen-space-block-lg: 20px; --sheen-space-block-xl: 32px;
  --sheen-space-gutter: 20px; --sheen-space-section: 32px;
}
[data-sheen-radius="sharp"] { --sheen-control-radius: 0px; --sheen-surface-radius: 0px; }
[data-sheen-radius="soft"] { --sheen-control-radius: 5px; --sheen-surface-radius: 8px; }
[data-sheen-radius="round"] { --sheen-control-radius: 999px; --sheen-surface-radius: 12px; }
[data-sheen-theme="studio"] {
  font-feature-settings: "cv01" 1, "ss03" 1;
  --sheen-text-ui-size: 14px;
  --sheen-density-row-compact: 36px; --sheen-density-row-comfortable: 40px; --sheen-density-row-spacious: 48px;
  --sheen-density-compact-inline-xs: 4px; --sheen-density-compact-inline-md: 8px; --sheen-density-compact-block-xs: 4px;
  --sheen-density-comfortable-space-inline-sm: 8px;
  --sheen-sidebar-w: 244px;
  --sheen-space-inline-sm: 8px;
  --sheen-space-block-md: 12px;
}
[data-sheen-theme="studio"][data-sheen-density="compact"] {
  --sheen-space-inline-xs: 4px; --sheen-space-inline-sm: 4px; --sheen-space-inline-md: 8px;
  --sheen-space-block-xs: 4px; --sheen-space-block-sm: 4px; --sheen-space-block-md: 8px;
}
[data-sheen-theme="studio"]:not([data-sheen-density]) { --sheen-table-row-h: 40px; }
[data-sheen-theme="studio"][data-sheen-radius="soft"] { --sheen-control-radius: 6px; --sheen-surface-radius: 12px; }
[data-sheen-motion="reduced"] { --sheen-duration-fast: 0ms; --sheen-duration-normal: 0ms; --sheen-duration-slow: 0ms; }
@media (prefers-reduced-motion: reduce) {
  [data-sheen-theme] { --sheen-duration-fast: 0ms; --sheen-duration-normal: 0ms; --sheen-duration-slow: 0ms; }
}
@media (forced-colors: active) {
  :is([data-sheen-theme], [data-sheen-mode], [data-sheen-accent]) {
${emitTokenDeclarations(forcedColorTokens)}
  }
}
`;
}

export function buildPreset(): string {
  const mappings: string[] = [];
  for (const name of Object.keys(semanticDefaults)) {
    if (name.startsWith("color-")) mappings.push(`  --${name}: var(--sheen-${name});`);
    if (name.startsWith("font-")) mappings.push(`  --${name}: var(--sheen-${name});`);
  }
  mappings.push("  --radius-control: var(--sheen-control-radius);", "  --radius-surface: var(--sheen-surface-radius);");
  return `@theme inline {\n${mappings.join("\n")}\n}\n`;
}
