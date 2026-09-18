# @gemologic/sheen

## 0.2.1

### Patch Changes

- @gemologic/sheen-tokens@0.2.1

## 0.2.0

### Minor Changes

- 529f3de: Refresh Studio and the admin starter with a quieter surface hierarchy, locally bundled Inter Variable, retained IBM Plex Mono identifiers, clearer typography, and responsive metric, chart, table, and form layouts. The admin starter defaults to dark Studio with indigo; the global Obsidian/jade defaults, other themes, private themes, and independent appearance axes remain available.
  
  Add `NumberText` for locale-aware numeric parts, `Stat.format`, `Stat.visual`, and explicit `Stat.valence`, plus foreground/muted chart series colors. Stat trend direction no longer implies positive or negative meaning: set `valence` explicitly where status coloring is intended; omitted valence is neutral. Add opt-in `DataTable.summarizeColumns` for fields fixed by accepted equality constraints, with explicit column restoration and preserved saved preferences, sorting, and raw exports.
  
  Token schema 4 adds metric typography and title tracking roles. Existing private themes should retain their declared schema version until intentionally migrated; the compiler supplies the versioned defaults. New schema-4 definitions must provide the new roles. Studio applications should preload `@gemologic/sheen-tokens/fonts/InterVariable.woff2?url` alongside the retained Mono face, as described in `docs/fonts.md`.
  
  Improve compact-density geometry, scoped landmarks and overlays, touch popovers, and canvas axis font updates across themes and pixel ratios. Preserve accepted content, native owners, focus, drafts, and scroll through appearance changes, refresh, and hydration. Update component metadata, examples, and styling guidance for the new contracts.
  
  Add opt-in `defineColumns` cell dependencies to retain unchanged noneditable custom cells across immutable row refreshes. Reuse equivalent NumberText formatters within bounded, request-isolated theme scopes while preserving locale and format-option changes.

### Patch Changes

- Updated dependencies [529f3de]
  - @gemologic/sheen-tokens@0.2.0

## 0.1.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.
- 4c53735: Ship Sheen's patched overlay backend and Solid DOM renderer with retained upstream licenses and integrity records. Add `sheenRuntime()` from `@gemologic/sheen/vite` for Vite/SolidStart, keeping the application's ordinary `solid-js@1.9.15` reactive core shared. Consumer installs no longer require Solid/Kobalte patches or an original Kobalte dependency.
  
  Generated apps configure the runtime plugin automatically and use the generating CLI's Sheen version instead of assuming an unpublished 1.0.0 release. SSR preserves the peer server-renderer/request-storage identity. Runtime qualification covers clean npm artifacts, both client entry conditions, nested exiting overlays, production Nitro HTTP rendering, isolated cookie themes, and delayed production/development SSR hydration. Vendor generation also normalizes trailing whitespace deterministically.

### Patch Changes

- a46a080: Polish compact focus, shortcut-key, and icon-button presentation. Add decorative dropdown item icons and optional trigger-width menu sizing, and use the matched-width behavior for expanded AdminApp sidebar selectors.
- 4c53735: Reuse number/date formatters and SVG chart models across color-only theme changes. Locale changes still rebuild localized formatting. Read each requested theme token only once per scope redraw, even when many charts subscribe. Tighten production benchmark sampling and scoped revision checks without changing performance budgets or baselines.
- f235435: Keep locale and reading direction independent of color-only theme updates. Existing floating layers no longer rebuild their positioning subscriptions when theme, accent, or mode changes; actual locale and direction changes still update retained forms and overlays.
- a46a080: Keep FileDropzone full-width inside centered, intrinsically sized, and component-documentation containers.
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
  - @gemologic/sheen-tokens@0.1.0

## 0.1.0-rc.2

### Patch Changes

- f235435: Keep locale and reading direction independent of color-only theme updates. Existing floating layers no longer rebuild their positioning subscriptions when theme, accent, or mode changes; actual locale and direction changes still update retained forms and overlays.
- @gemologic/sheen-tokens@0.1.0-rc.2

## 0.1.0-rc.1

### Minor Changes

- 4c53735: Ship Sheen's patched overlay backend and Solid DOM renderer with retained upstream licenses and integrity records. Add `sheenRuntime()` from `@gemologic/sheen/vite` for Vite/SolidStart, keeping the application's ordinary `solid-js@1.9.15` reactive core shared. Consumer installs no longer require Solid/Kobalte patches or an original Kobalte dependency.
  
  Generated apps configure the runtime plugin automatically and use the generating CLI's Sheen version instead of assuming an unpublished 1.0.0 release. SSR preserves the peer server-renderer/request-storage identity. Runtime qualification covers clean npm artifacts, both client entry conditions, nested exiting overlays, production Nitro HTTP rendering, isolated cookie themes, and delayed production/development SSR hydration. Vendor generation also normalizes trailing whitespace deterministically.

### Patch Changes

- 4c53735: Reuse number/date formatters and SVG chart models across color-only theme changes. Locale changes still rebuild localized formatting. Read each requested theme token only once per scope redraw, even when many charts subscribe. Tighten production benchmark sampling and scoped revision checks without changing performance budgets or baselines.
- @gemologic/sheen-tokens@0.1.0-rc.1

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- a46a080: Polish compact focus, shortcut-key, and icon-button presentation. Add decorative dropdown item icons and optional trigger-width menu sizing, and use the matched-width behavior for expanded AdminApp sidebar selectors.
- a46a080: Keep FileDropzone full-width inside centered, intrinsically sized, and component-documentation containers.
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
  - @gemologic/sheen-tokens@0.1.0-rc.0
