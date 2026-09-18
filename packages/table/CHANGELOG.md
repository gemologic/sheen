# @gemologic/sheen-table

## 0.2.1

### Patch Changes

- 117d296: Add the server DataTable `refreshKey` prop for background revalidation and post-mutation invalidation. Key changes request the latest query through the existing abortable request controller, retaining accepted content, pagination, column layout, drafts, selection, and scroll. Initial keys do not trigger duplicate hydration requests.
- @gemologic/sheen@0.2.1

## 0.2.0

### Minor Changes

- 529f3de: Refresh Studio and the admin starter with a quieter surface hierarchy, locally bundled Inter Variable, retained IBM Plex Mono identifiers, clearer typography, and responsive metric, chart, table, and form layouts. The admin starter defaults to dark Studio with indigo; the global Obsidian/jade defaults, other themes, private themes, and independent appearance axes remain available.
  
  Add `NumberText` for locale-aware numeric parts, `Stat.format`, `Stat.visual`, and explicit `Stat.valence`, plus foreground/muted chart series colors. Stat trend direction no longer implies positive or negative meaning: set `valence` explicitly where status coloring is intended; omitted valence is neutral. Add opt-in `DataTable.summarizeColumns` for fields fixed by accepted equality constraints, with explicit column restoration and preserved saved preferences, sorting, and raw exports.
  
  Token schema 4 adds metric typography and title tracking roles. Existing private themes should retain their declared schema version until intentionally migrated; the compiler supplies the versioned defaults. New schema-4 definitions must provide the new roles. Studio applications should preload `@gemologic/sheen-tokens/fonts/InterVariable.woff2?url` alongside the retained Mono face, as described in `docs/fonts.md`.
  
  Improve compact-density geometry, scoped landmarks and overlays, touch popovers, and canvas axis font updates across themes and pixel ratios. Preserve accepted content, native owners, focus, drafts, and scroll through appearance changes, refresh, and hydration. Update component metadata, examples, and styling guidance for the new contracts.
  
  Add opt-in `defineColumns` cell dependencies to retain unchanged noneditable custom cells across immutable row refreshes. Reuse equivalent NumberText formatters within bounded, request-isolated theme scopes while preserving locale and format-option changes.

### Patch Changes

- Updated dependencies [529f3de]
  - @gemologic/sheen@0.2.0

## 0.1.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- 5b9918c: Reduce client sorting, search, and filtering work without changing locale-aware matching or stable sort semantics. Keep color-only theme changes out of the client query pipeline while retaining locale re-evaluation and row/focus identity.
- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.
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

- 5b9918c: Reduce client sorting, search, and filtering work without changing locale-aware matching or stable sort semantics. Keep color-only theme changes out of the client query pipeline while retaining locale re-evaluation and row/focus identity.
- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
  - @gemologic/sheen@0.1.0-rc.0
