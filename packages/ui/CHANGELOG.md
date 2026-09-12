# @gemologic/sheen

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
