# Semantic icons

Sheen exposes 42 application-oriented icon names backed by Radix Icons and Phosphor. Applications choose semantic names, while theme metadata chooses the artwork. Obsidian, Paper, Contrast, Slate, and Graphite use Radix; Vellum and Studio use Phosphor. A bundle may contain one or two sets.

## Import paths

Use the Vite marker when the name is a literal:

```tsx
import { Icon } from "@gemologic/sheen-icons";

<Icon name="search" />
```

Configure the transform with every set used by the bundled themes:

```ts
import { sheenIcons } from "@gemologic/sheen-icons/vite";

sheenIcons({ sets: ["radix", "phosphor"] })
```

The transform rejects unknown literal names and embeds only the selected variants for names present in source. Build systems without the plugin use a per-icon export:

```tsx
import { SearchIcon } from "@gemologic/sheen-icons/icons/search";
```

Use `DynamicIcon` only when the name genuinely arrives at runtime. It validates the name and intentionally retains the complete registry, making that bundle cost visible in source.

## Accessibility and sizing

Icons are decorative by default and emit `aria-hidden="true"`. A meaningful icon sets `decorative={false}` and supplies a nonempty `label`; runtime validation rejects an empty label. An icon next to button text normally stays decorative because the button text already supplies the accessible name.

`size="sm"`, `md`, and `lg` resolve to 14px, 16px, and 20px tokens. Resting icons use muted foreground color. `tone="inherit"` is for interactive parents, and button composition inherits `currentColor` automatically.

## Theme and hydration handoff

Both selected SVGs are present in deterministic server markup. CSS displays exactly one based on the nearest `data-sheen-icon-set` attribute, so theme changes do not remount the icon or replace surrounding component state.

Client hydration stamps the root icon set in the blocking prepaint script from the stored theme. Cookie hydration emits it from the authoritative request state. `ThemeScope` stamps the same value on its wrapper and contextual portal before hydration, then keeps both reactive. This prevents the default set from flashing during refresh, hydration, or scoped overlay mounting.

The isolated consumer gate proves literal imports exclude unrelated glyphs, per-icon imports tree-shake unrelated data, and `DynamicIcon` includes the full registry. Browser coverage samples every animation frame during a live set change and delays application JavaScript to inspect the pre-hydration result.
