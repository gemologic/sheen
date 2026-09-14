# @gemologic/sheen-cli

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
