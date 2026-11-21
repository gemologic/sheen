# @gemologic/sheen-cli

## 0.4.3

No changes in this release.

## 0.4.2

### Patch Changes

- 50b7882: The `sheen` bin now runs when invoked through a package manager. Its entry check compared the symlinked `node_modules/.bin` path with the real module path, so `sheen doctor`, `sheen sync-skill`, and every other command exited 0 without doing anything. Consumers whose CI runs `sheen doctor` should expect real diagnostics now. `sheen --help` prints usage.

## 0.4.1

No changes in this release.

## 0.4.0

No changes in this release.

## 0.3.0

### Minor Changes

- a6c322f: Custom brand accents: `defineAccent({ id, seed })` derives light and dark accent, subtle, hover, active, and focus-ring values from one brand color, moving only OKLCH lightness until every supplied theme passes contrast (bundled themes by default). Explicit `{ id, light, dark, lightSubtle?, darkSubtle? }` definitions are validated and throw `ThemeValidationError` instead of being adjusted. `buildAccent` now accepts a defined accent and an optional `themes` list, and emits the same selectors and Contrast override as the bundled accents; `validateAccent` returns the diagnostics without throwing. Accent build failures are now `ThemeValidationError`. `sheen new accent <name>` scaffolds a definition.
  
  Breakpoints: `breakpoints` (`xs` 22.5rem, `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem) and `breakpointQuery(name, "up" | "down")` give one viewport scale with non-overlapping range queries. The app scaffold's mobile query now uses `(width < 48rem)`.
- a6c322f: Breaking: Sheen now requires `solid-js@1.9.19`. Update the application's exact `solid-js` dependency from 1.9.15 to 1.9.19; `sheenRuntime()` rejects other versions. A fresh install of `vite-plugin-solid` resolves `babel-preset-solid@1.9.19`, which requires `solid-js ^1.9.16`, so 1.9.15 now produces an invalid dependency tree.
  
  The vendored DOM renderer is rebuilt from Solid 1.9.19 with the same two corrections: delegated events do not mark hydration complete while lazy components are pending, and an empty `composedPath()` falls back to walking the DOM tree. CLI scaffolds generate the new pin and `vite@8.3.8`, which resolves Vite security advisories in 8.2.2 (GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg, and the bundled launch-editor advisories). Sheen's `vite` peer range stays `>=8 <9`.

## 0.2.1

No changes in this release.

## 0.2.0

No changes in this release.

## 0.1.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- 4c53735: Ship Sheen's patched overlay backend and Solid DOM renderer with retained upstream licenses and integrity records. Add `sheenRuntime()` from `@gemologic/sheen/vite` for Vite/SolidStart, keeping the application's ordinary `solid-js@1.9.15` reactive core shared. Consumer installs no longer require Solid/Kobalte patches or an original Kobalte dependency.
  
  Generated apps configure the runtime plugin automatically and use the generating CLI's Sheen version instead of assuming an unpublished 1.0.0 release. SSR preserves the peer server-renderer/request-storage identity. Runtime qualification covers clean npm artifacts, both client entry conditions, nested exiting overlays, production Nitro HTTP rendering, isolated cookie themes, and delayed production/development SSR hydration. Vendor generation also normalizes trailing whitespace deterministically.
- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.

## 0.1.0-rc.2

No changes in this release.

## 0.1.0-rc.1

### Patch Changes

- 4c53735: Ship Sheen's patched overlay backend and Solid DOM renderer with retained upstream licenses and integrity records. Add `sheenRuntime()` from `@gemologic/sheen/vite` for Vite/SolidStart, keeping the application's ordinary `solid-js@1.9.15` reactive core shared. Consumer installs no longer require Solid/Kobalte patches or an original Kobalte dependency.
  
  Generated apps configure the runtime plugin automatically and use the generating CLI's Sheen version instead of assuming an unpublished 1.0.0 release. SSR preserves the peer server-renderer/request-storage identity. Runtime qualification covers clean npm artifacts, both client entry conditions, nested exiting overlays, production Nitro HTTP rendering, isolated cookie themes, and delayed production/development SSR hydration. Vendor generation also normalizes trailing whitespace deterministically.

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.
