# Private themes

Private repositories use `defineTheme`, `buildTheme`, and the exported types from `@gemologic/sheen-tokens`. No source imports or fork are required. Start by spreading a complete bundled theme such as `obsidian`, give it a unique lowercase kebab-case ID, and override its `dark` and `light` token maps. Pass the resulting definition through `defineTheme`, then write the CSS returned by `buildTheme` into the application's stylesheet assets. Load that CSS before first paint and register the theme with `ThemeProvider` and the prepaint script's theme catalog.

The [executable consumer fixture](../tests/consumers/private-theme.mts) demonstrates the supported imports and compilation path. `pnpm check:consumers`, after a build, copies only the package manifest and `dist` into an isolated temporary consumer, typechecks the fixture against the emitted declarations, executes it in Node, and resolves the exported CSS entries. It does not use workspace source aliases. Temporary consumer files are removed when the check finishes.

## Validation and migration

Schema 4 adds metric size, leading, weight, tracking, and title tracking roles. Older definitions receive 30px/34px metric sizing, their own `text-h2-weight`, and the documented tracking defaults. Current definitions must supply all five roles. Private themes can keep different metric typography by overriding these semantic roles without component CSS.

Definitions declare `schemaVersion`. For a new theme derived from the current exported theme, use `currentSchemaVersion`. Existing private themes retain their declared version until intentionally migrated. The compiler supplies only defaults explicitly introduced after that version, resolving those defaults through the private theme's own tokens. It does not fill arbitrary missing keys from the latest bundled theme. Unknown/future versions, missing required tokens, unknown token keys, malformed references, cycles, and unsafe CSS values fail with `ThemeValidationError.diagnostics`.

Color tokens accept hex, OKLCH, `transparent`, and the supported two-color `color-mix(in oklab, first percentage, second)` form. References use `{token-name}` or primitive paths such as `{gray.980}`. Colors must resolve concretely at build time; runtime `var()` and `currentColor` are not theme color values. Even contrast-exempt roles must contain valid colors. Declared contrast checks run for both modes, reporting theme, mode, token pairing, and measured ratios. Chart perceptual-distance qualification remains an open implementation item.

`buildTheme` emits scoped sRGB fallbacks followed by modern color overrides. It does not emit accents or modify status/market colors. If a private theme supports accent overrides, validate the resulting combinations with `accentTokens` and `validateContrast` before shipping them. `defineTheme` and `buildTheme` also apply `validateChartPalette`; private tooling may call `auditChartPalette` to render the full pair and simulation matrix. The bundled accent and chart matrices passing does not prove a private palette passes.

The package consumer check follows Node's [public package entry-point resolution](https://nodejs.org/api/packages.html#package-entry-points). It proves local built-artifact consumption, not npm publication or a consuming application's full browser qualification.
