# @gemologic/sheen-code

## 0.4.3

### Patch Changes

- Updated dependencies [81735a1]
  - @gemologic/sheen@0.4.3

## 0.4.2

### Patch Changes

- Updated dependencies [50b7882]
  - @gemologic/sheen@0.4.2

## 0.4.1

### Patch Changes

- 93dea59: Gaps found while porting an embedded admin to 0.4.0.
  
  - `Checkbox` and `Switch` put a passed `aria-describedby` on the native input, merged with the description and error, instead of on the root container. With `TooltipTrigger`, pass `inputRef={trigger.ref}` and `aria-describedby={trigger["aria-describedby"]}`.
  - `AdminNavigationGroup` declares `defaultOpen`, which `AdminApp` already forwarded to `SidebarNav`.
  - `@gemologic/sheen-date/styles.css` uses `@layer components` like every other Sheen stylesheet. It was in `sheen.components`, a separate top-level layer that outranked `utilities`.
  - `@gemologic/sheen-code/languages` adds `go`, `rust`, and `toml`.
  - `resolveLucideIconName` maps `building-2`, `scroll`, `scroll-text`, and `table-2`.
- Updated dependencies [93dea59]
  - @gemologic/sheen@0.4.1

## 0.4.0

### Minor Changes

- 1667433: `highlightCode` now uses Shiki's fine-grained core with the JavaScript regex engine instead of `shiki/bundle/web`. The web bundle turned every grammar, every theme, and the oniguruma wasm into consumer chunks (124 files, 5.3 MB for an app highlighting one language); an app now emits only the highlight entry, the engine, the two GitHub default themes, and the grammars it declares (5 files, about 375 KB for TypeScript).
  
  Breaking: `highlightCode` requires a `languages` array of grammar definitions imported from the new `@gemologic/sheen-code/languages` entry, and `language` must be an id or alias of one of them. Migrate `highlightCode({ code, language: "ts" })` to `highlightCode({ code, language: "ts", languages: [typescript] })` with `import { typescript } from "@gemologic/sheen-code/languages"`. The same web-bundle languages and aliases are available, and an undeclared language rejects. `HighlightCodeOptions` is now generic over the declared languages, `BundledLanguage` from `shiki/bundle/web` is no longer referenced, and `CodeLanguage`/`CodeLanguageName` are exported. `highlightCode` also accepts an optional `signal`; aborted calls reject with its reason. Output tokens and the light/dark token variables are unchanged.

### Patch Changes

- Updated dependencies [1667433]
- Updated dependencies [1667433]
- Updated dependencies [1667433]
- Updated dependencies [1667433]
  - @gemologic/sheen@0.4.0

## 0.3.0

### Minor Changes

- a6c322f: Breaking: Sheen now requires `solid-js@1.9.19`. Update the application's exact `solid-js` dependency from 1.9.15 to 1.9.19; `sheenRuntime()` rejects other versions. A fresh install of `vite-plugin-solid` resolves `babel-preset-solid@1.9.19`, which requires `solid-js ^1.9.16`, so 1.9.15 now produces an invalid dependency tree.
  
  The vendored DOM renderer is rebuilt from Solid 1.9.19 with the same two corrections: delegated events do not mark hydration complete while lazy components are pending, and an empty `composedPath()` falls back to walking the DOM tree. CLI scaffolds generate the new pin and `vite@8.3.8`, which resolves Vite security advisories in 8.2.2 (GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg, and the bundled launch-editor advisories). Sheen's `vite` peer range stays `>=8 <9`.

### Patch Changes

- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a8534a5]
- Updated dependencies [a6c322f]
- Updated dependencies [718dd8c]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
  - @gemologic/sheen@0.3.0

## 0.2.1

### Patch Changes

- @gemologic/sheen@0.2.1

## 0.2.0

### Patch Changes

- Updated dependencies [529f3de]
  - @gemologic/sheen@0.2.0

## 0.1.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
- Updated dependencies [4c53735]
- Updated dependencies [4c53735]
- Updated dependencies [f235435]
- Updated dependencies [a46a080]
  - @gemologic/sheen@0.1.0

## 0.1.0-rc.2

### Patch Changes

- Updated dependencies [f235435]
  - @gemologic/sheen@0.1.0-rc.2

## 0.1.0-rc.1

### Patch Changes

- Updated dependencies [4c53735]
- Updated dependencies [4c53735]
  - @gemologic/sheen@0.1.0-rc.1

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
  - @gemologic/sheen@0.1.0-rc.0
