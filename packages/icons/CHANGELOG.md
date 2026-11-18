# @gemologic/sheen-icons

## 0.3.0

### Minor Changes

- a6c322f: The semantic icon catalog grows from 42 to 257 names covering navigation, actions, files, communication, media, commerce, charts, devices, development (`terminal`, `gitBranch`, `database`, `server`, `cloud`, `key`, `api`), status, people, text formatting, layout, time, location, and brand marks (`githubLogo`, `googleLogo`, and others). The existing 42 names and their artwork are unchanged. Each name has a `<Name>Icon` export and an `@gemologic/sheen-icons/icons/<kebab-name>` entry.
  
  Phosphor covers every name. The 113 names without Radix artwork render their Phosphor glyph in Radix themes, resolved at build time, so every name has exactly one glyph per set. `iconRegistry` entries for those names have no `radix` key, and the package root now exports `fallbackIconSet` and the `IconSources` type. `DynamicIcon` retains the larger registry, now about 58KB gzip; single literal and per-icon imports stay around 1.3KB gzip.
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

- a46a080: Ship the generated icon runtime without source-catalog dependencies and include the Radix Icons and Phosphor Icons license notices in the package.
- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.

## 0.1.0-rc.2

No changes in this release.

## 0.1.0-rc.1

No changes in this release.

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- a46a080: Ship the generated icon runtime without source-catalog dependencies and include the Radix Icons and Phosphor Icons license notices in the package.
- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.
