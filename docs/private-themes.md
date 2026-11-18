# Private themes

Private repositories use `defineTheme`, `buildTheme`, and the exported types from `@gemologic/sheen-tokens`. No source imports or fork are required. Start by spreading a complete bundled theme such as `obsidian`, give it a unique lowercase kebab-case ID, and override its `dark` and `light` token maps. Pass the resulting definition through `defineTheme`, then write the CSS returned by `buildTheme` into the application's stylesheet assets. Load that CSS before first paint and register the theme with `ThemeProvider` and the prepaint script's theme catalog.

The [executable consumer fixture](../tests/consumers/private-theme.mts) demonstrates the supported imports and compilation path. `pnpm check:consumers`, after a build, copies only the package manifest and `dist` into an isolated temporary consumer, typechecks the fixture against the emitted declarations, executes it in Node, and resolves the exported CSS entries. It does not use workspace source aliases. Temporary consumer files are removed when the check finishes.

## Custom brand accents

Accents are an independent axis: any accent composes with any theme. Applications with their own brand color define a custom accent instead of overriding `--sheen-color-accent*` by hand.

```ts
import { writeFile } from "node:fs/promises";
import { buildAccent, defineAccent, themes } from "@gemologic/sheen-tokens";
import { brandTheme } from "./themes/brand.ts";

const options = { themes: [...themes, brandTheme] };
export const acme = defineAccent({ id: "acme", label: "Acme", seed: "#ff5a1f" }, options);
await writeFile("src/styles/acme-accent.css", buildAccent(acme, options));
```

`defineAccent` accepts either a single `seed` or explicit colors, `{ id, label?, light, dark, lightSubtle?, darkSubtle? }`. The `id` becomes the `data-sheen-accent` value; it must be lower kebab-case and must not reuse a bundled accent name. Colors accept the same concrete formats as theme tokens and must be opaque.

From a seed, each mode keeps the seed's OKLCH hue and chroma and moves only lightness, in steps of 0.005: darker for light mode, lighter for dark mode, stopping at the first value that passes every supplied theme. A seed that already passes in a mode is kept verbatim. Chroma is reduced only where the target lightness cannot hold it in sRGB. Subtle backgrounds are derived at OKLCH lightness 0.945 (light) and 0.27 (dark) in the accent's hue, which is also how omitted subtle colors are filled for explicit definitions. Expect saturated mid-lightness brands to become a deeper shade in light mode and a lighter tint in dark mode, because the same color serves as accent text, focus ring, and the background behind `fg-on-accent`. Explicit definitions are never adjusted: any failure throws.

Validation combines the accent with every supplied theme in both modes (default: the seven bundled themes) and runs the full theme contrast contract, including `accent-fg` on every surface and on `accent-subtle`, `fg-on-accent` on the accent and its hover/active states, and the accent focus ring at 3:1 on every surface. Contrast uses its 7:1 text threshold. Failures throw `ThemeValidationError` whose diagnostics read `acme/obsidian/dark: color-accent-fg on color-bg-selected: 3.956:1 < 4.5:1`. Pass the themes the application actually ships; an accent validated only against a private theme can fail bundled ones, notably Contrast. `validateAccent` returns the same diagnostics without throwing.

`buildAccent` re-validates and emits the same rules as a bundled accent: `[data-sheen-mode][data-sheen-accent="<id>"]` per mode, which outranks the zero-specificity theme selectors, plus a `[data-sheen-theme="contrast"]` override that keeps Contrast's black/white subtle and focus ring. Hover and active states, `accent-fg`, `fg-on-accent`, and the accent focus ring derive exactly as they do for bundled accents. Status and market colors are untouched; a brand hue near danger or market colors still stays a separate role, so prefer a brand that remains distinguishable from them. Load the emitted CSS after the theme CSS and select the id through `data-sheen-accent`. Register the ids with `<ThemeProvider accents={["acme"]}>` and `createThemeScript({ accents: ["acme"] })` so `setAccent`, persistence, and the prepaint script accept them alongside the bundled accents. `sheen new accent <name>` scaffolds the definition.

## Validation and migration

Accent stylesheets set `color-focus-ring` to the accent color (Contrast keeps black or white), and accent selectors outrank the zero-specificity theme selectors. A private theme that needs a fixed ring regardless of accent declares `--sheen-color-focus-ring` on `[data-sheen-theme="<id>"][data-sheen-accent]`. Accent builds validate the ring at 3:1 against every surface of every supplied theme (the bundled themes by default).

Schema 5 adds motion roles: `duration-press` (immediate press/toggle feedback), `duration-spin` (one indeterminate spinner turn), `ease-spring` (a slight overshoot for small transient layers and toggles), `motion-distance-sm`/`motion-distance-lg` (enter/exit travel), and `motion-stagger` (per-item delay for sequential reveals). It also adds the display type roles `text-display-1-*`, `text-display-2-*`, `text-display-tracking`, and `text-lead-*` (older definitions receive 48/52px and 36/42px displays at their `text-h1-weight`, and 17/26px lead text). Older definitions receive 80ms, their own `ease-entrance`, 4px/12px, and 30ms. Reduced motion zeroes the press duration, stagger, and both distances along with the existing durations.

Schema 4 adds metric size, leading, weight, tracking, and title tracking roles. Older definitions receive 30px/34px metric sizing, their own `text-h2-weight`, and the documented tracking defaults. Current definitions must supply all five roles. Private themes can keep different metric typography by overriding these semantic roles without component CSS.

Definitions declare `schemaVersion`. For a new theme derived from the current exported theme, use `currentSchemaVersion`. Existing private themes retain their declared version until intentionally migrated. The compiler supplies only defaults explicitly introduced after that version, resolving those defaults through the private theme's own tokens. It does not fill arbitrary missing keys from the latest bundled theme. Unknown/future versions, missing required tokens, unknown token keys, malformed references, cycles, and unsafe CSS values fail with `ThemeValidationError.diagnostics`.

Color tokens accept hex, OKLCH, `transparent`, and the supported two-color `color-mix(in oklab, first percentage, second)` form. References use `{token-name}` or primitive paths such as `{gray.980}`. Colors must resolve concretely at build time; runtime `var()` and `currentColor` are not theme color values. Even contrast-exempt roles must contain valid colors. Declared contrast checks run for both modes, reporting theme, mode, token pairing, and measured ratios. Chart perceptual-distance qualification remains an open implementation item.

`buildTheme` emits scoped sRGB hex declarations for every token. Only color tokens whose source the hex fallback cannot reproduce exactly, such as wide-gamut OKLCH or an unrounded `color-mix()`, are repeated afterwards in an `@supports (color: oklch(50% 0 0))` override that keeps the authored value. Non-color tokens are never repeated, and a theme authored entirely in hex emits no override block. It does not emit accents or modify status/market colors. Validate every accent a private theme ships with `validateAccent(accent, { themes: [privateTheme] })` or by building it with `buildAccent` (see below). `defineTheme` and `buildTheme` also apply `validateChartPalette`; private tooling may call `auditChartPalette` to render the full pair and simulation matrix. The bundled accent and chart matrices passing does not prove a private palette passes.

The package consumer check follows Node's [public package entry-point resolution](https://nodejs.org/api/packages.html#package-entry-points). It proves local built-artifact consumption, not npm publication or a consuming application's full browser qualification.
