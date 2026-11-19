# @gemologic/sheen-charts

## 0.4.0

### Patch Changes

- Updated dependencies [1667433]
- Updated dependencies [1667433]
- Updated dependencies [1667433]
- Updated dependencies [1667433]
  - @gemologic/sheen@0.4.0

## 0.3.0

### Minor Changes

- a6c322f: Add `DonutChart` (with pie via `innerRadius={0}`), `ScatterChart`, `Heatmap`, `Histogram` with the deterministic `binValues` helper, `Gauge`, and `BarSparkline`. The SVG charts share the existing figure, summary, legend, inspection, and native-table contracts; `BarSparkline` is a separate component so line-only `Sparkline` consumers keep their bundle size.
- a6c322f: Component chrome.
  
  - **TimeSeries** puts its legend and icon zoom controls in a header row beside the title, and no longer draws the x-axis title on the canvas: `xLabel` still names the native table column and the screen-reader context. The plot is about 85px shorter for the same `height`. The new `area` prop fills under the first series with a fading gradient, and `live` marks the latest sample of each visible series with a pulsing dot (static under reduced motion).
  - **Pagination** first, previous, next, and last controls are icon buttons that keep their localized accessible names and mirror in right-to-left scopes.
  - **Dialog, Drawer, Sheet, and Popover** close from a corner icon placed last in tab order. An explicit `closeLabel`, or an alert dialog, keeps the labelled footer action. Toasts dismiss from an icon button.
  - **Select** uses a chevron that turns when the list opens, and a check glyph for the selected option.
  - **Tabs** gain a sliding accent indicator, and **SegmentedControl** slides its selected fill between options. The server-rendered selected styling stays until the indicator has measured.
- a6c322f: Live data motion. `NumberText` gains `flash` (tints up or down with the market colors when the value changes) and `tween` (counts from the previous value). `Stat` tweens numeric values on update by default (`tween={false}` opts out). DataTable accessor columns accept `flash: true` to tint a numeric cell when its value changes for the same row. `flashChange(element, direction)` is exported for custom renderers. Nothing animates on the first render, and reduced motion disables all of it. Skeletons shimmer while they wait (static under reduced motion).
- a6c322f: Breaking: Sheen now requires `solid-js@1.9.19`. Update the application's exact `solid-js` dependency from 1.9.15 to 1.9.19; `sheenRuntime()` rejects other versions. A fresh install of `vite-plugin-solid` resolves `babel-preset-solid@1.9.19`, which requires `solid-js ^1.9.16`, so 1.9.15 now produces an invalid dependency tree.
  
  The vendored DOM renderer is rebuilt from Solid 1.9.19 with the same two corrections: delegated events do not mark hydration complete while lazy components are pending, and an empty `composedPath()` falls back to walking the DOM tree. CLI scaffolds generate the new pin and `vite@8.3.8`, which resolves Vite security advisories in 8.2.2 (GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg, and the bundled launch-editor advisories). Sheen's `vite` peer range stays `>=8 <9`.

### Patch Changes

- a6c322f: TimeSeries now upgrades from the SVG fallback to the canvas renderer when data is published on every animation frame. Initialization uses the prepared snapshot and delivers newer data as a normal renderer update; only definition or configuration changes restart preparation.
- a6c322f: Breaking: `Button` (and `buttonVariants()`) now default to `variant="outline"`, a raised bordered button, instead of `ghost`. Pass `variant="ghost"` for quiet chrome; Sheen's own close, clear, disclosure, tab, and pagination controls already do. Solid buttons gain hover and pressed fills for every tone, and non-neutral outline and ghost buttons use the tone's text color. `Link variant="button"` accepts `appearance`, `tone`, and `size` so destinations can carry the same treatment, including a solid accent call to action.
  
  New in `@gemologic/sheen`:
  - `Glyph`: a small typed set of chrome icons (chevrons, close, check, plus/minus, status, trend, more, grip) that every package now uses instead of text characters. The `no-restricted-syntax` lint block bans those characters in package source.
  - `List` and `ListItem`: generic rows with leading, title, description, and trailing slots; `href` makes a row a link and `onSelect` a button.
  - `Banner`, plus `icon`, `actions`, `onDismiss`, and `dismissLabel` on `Alert` and `Callout`. Notices use a quieter tinted surface with a 2px tone edge and a tone status icon.
  - `Form`, `FormSection`, and `FormActions`: native form scaffolding with pending state, side-by-side section titles on wide containers, and an optional sticky action row.
  - `Prose` for long-form reading content, `Heading size="display-1" | "display-2"`, and `Text size="lead"`, backed by new schema 5 `text-display-*` and `text-lead-*` tokens.
  - `createMediaQuery` and `useBreakpoint`, plus `breakpoints`/`breakpointQuery` re-exported from the token catalog. Package layout queries now use the shared rem breakpoints, which also fixes the AdminApp mobile rules that skipped exactly 768px.
  - `useShortcutLabel` and `formatShortcut`: one platform-aware shortcut formatter shared by menus, tooltips, the shortcut sheet, and the AdminApp command trigger.
  - `SegmentedControl fullWidth` for short exclusive choices such as Buy/Sell.
  - `ThemeProvider accents` and `createThemeScript({ accents })` register custom accent IDs so they can be selected and persisted; the theme context exposes `accents()`. `ThemeState.accent` is now a string.
  
  Form fields show invalid state with a danger border, a danger focus ring, and an icon on the error message. Light-mode inputs sit on a lighter fill. Coarse pointers get taller controls and 16px input text. Overlay dimming is lighter, and a drawer no longer stacks a blur on its overlay. The Stepper is restyled with titles under the markers on wide containers. Sortable table headers align with their cells and show the full label on hover. `ActivityTimeline` keeps the actor and time on one meta row. DataTablePage places saved views and page actions in the title row, so the table's search and filter toolbar is the only toolbar row. ListDetailLayout rows regain their radius and gain dividers. TimeSeries captions span the full width above the legend and zoom controls. On phones, the AdminApp topbar keeps the current view, command trigger, and utilities on one row (global search drops to its own row), the notification count is no longer clipped, topbar buttons get 36px touch targets, the command trigger ellipsizes its label instead of clipping its shortcut hint at tablet widths, and touch-only devices hide the Ctrl+K hint and the shell's Keyboard shortcuts button. The AppShell header lays its content and shortcut controls out in a single row. Horizontal sortable lists wrap whole items instead of breaking labels mid-word. On coarse pointers, `Badge` keeps a label height instead of growing with the touch-sized control height.
  
  Chart data tables for `BarChart`, `Histogram`, `ScatterChart`, `Heatmap`, and `DonutChart` now re-render their values when the locale changes instead of keeping the first locale's formatting.
  
  `DataTable` `rowHeight` now sizes cells as well as rows, so taller rows (for example two-line identity cells) are no longer clipped to the density's row height. Double-clicking a column divider or choosing Auto-fit now fits the column to its widest rendered content in both directions; previously it could only widen a column.
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

- 4c53735: Reuse number/date formatters and SVG chart models across color-only theme changes. Locale changes still rebuild localized formatting. Read each requested theme token only once per scope redraw, even when many charts subscribe. Tighten production benchmark sampling and scoped revision checks without changing performance budgets or baselines.
- 293072e: Retain AdminApp action controls by group/action ID, StatusBar counts by label, and StatGroup metric positions when accepted data replaces model objects. Resolve inline stat definitions once and keep color-only theme changes out of status number formatting.
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

- 4c53735: Reuse number/date formatters and SVG chart models across color-only theme changes. Locale changes still rebuild localized formatting. Read each requested theme token only once per scope redraw, even when many charts subscribe. Tighten production benchmark sampling and scoped revision checks without changing performance budgets or baselines.
- Updated dependencies [4c53735]
- Updated dependencies [4c53735]
  - @gemologic/sheen@0.1.0-rc.1

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- 293072e: Retain AdminApp action controls by group/action ID, StatusBar counts by label, and StatGroup metric positions when accepted data replaces model objects. Resolve inline stat definitions once and keep color-only theme changes out of status number formatting.
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
  - @gemologic/sheen@0.1.0-rc.0
