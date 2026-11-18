# @gemologic/sheen-tokens

## 0.3.0

### Minor Changes

- a6c322f: Custom brand accents: `defineAccent({ id, seed })` derives light and dark accent, subtle, hover, active, and focus-ring values from one brand color, moving only OKLCH lightness until every supplied theme passes contrast (bundled themes by default). Explicit `{ id, light, dark, lightSubtle?, darkSubtle? }` definitions are validated and throw `ThemeValidationError` instead of being adjusted. `buildAccent` now accepts a defined accent and an optional `themes` list, and emits the same selectors and Contrast override as the bundled accents; `validateAccent` returns the diagnostics without throwing. Accent build failures are now `ThemeValidationError`. `sheen new accent <name>` scaffolds a definition.
  
  Breakpoints: `breakpoints` (`xs` 22.5rem, `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem) and `breakpointQuery(name, "up" | "down")` give one viewport scale with non-overlapping range queries. The app scaffold's mobile query now uses `(width < 48rem)`.
- a6c322f: Surface and depth retune. Obsidian dark widens the steps between base, raised, and interaction surfaces; control borders across every theme drop to the softest value that still clears 3:1 against all seven surfaces; light Obsidian's selected fill is neutral instead of indigo. Elevations are now layered (inner top highlight, contact shadow, ambient shadow) with lighter light-mode values, and raised surfaces carry `elevation-raised` by default. Modal and command overlays blur what they cover.
  
  The focus ring now follows the selected accent (Contrast keeps its black or white ring). Components still read only `color-focus-ring`, so a private theme or scope can pin it independently.
  
  Fixes: table and filter-bar focus outlines referenced undefined tokens and rendered nothing; menu item descriptions and admin account subtitles referenced an undefined type size; drawers stretched their header, body, and footer to fill the viewport instead of scrolling the body.
- a6c322f: Theme CSS no longer repeats every token inside `@supports (color: oklch(...))`. `buildTheme` now emits that block only for color tokens whose authored value the sRGB hex fallback cannot reproduce exactly, such as wide-gamut OKLCH, and never repeats non-color tokens. Bundled themes are sRGB-exact and ship no override block, roughly halving their gzip size.
  
  Tier-one primitive ramps (`--sheen-gray-*`, `--sheen-size-*`, `--sheen-radius-*`, `--sheen-font-size-*`, and the other color ramps) moved out of `core.css` into the new opt-in `@gemologic/sheen-tokens/primitives.css` export, exposed in code as `buildPrimitives()`. Themes already ship resolved semantic values, so applications only need it for token tooling. `core.css` keeps the `--sheen-z-*` and `--sheen-shadow-*` layering primitives that component CSS still reads. Import `primitives.css` if your own CSS references a tier-one ramp variable.
- a6c322f: Theme schema 5 adds motion roles: `duration-press`, `duration-spin`, `ease-spring`, `motion-distance-sm`, `motion-distance-lg`, and `motion-stagger`. Older private themes migrate automatically, and reduced motion zeroes them. UI transient layers now use the motion tokens instead of literal easings: popovers, menus, and select lists scale in from their anchor, toasts rise in, buttons give press feedback, and drawers slide again instead of being overridden by the dialog fade.
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

## 0.2.1

No changes in this release.

## 0.2.0

### Minor Changes

- 529f3de: Refresh Studio and the admin starter with a quieter surface hierarchy, locally bundled Inter Variable, retained IBM Plex Mono identifiers, clearer typography, and responsive metric, chart, table, and form layouts. The admin starter defaults to dark Studio with indigo; the global Obsidian/jade defaults, other themes, private themes, and independent appearance axes remain available.
  
  Add `NumberText` for locale-aware numeric parts, `Stat.format`, `Stat.visual`, and explicit `Stat.valence`, plus foreground/muted chart series colors. Stat trend direction no longer implies positive or negative meaning: set `valence` explicitly where status coloring is intended; omitted valence is neutral. Add opt-in `DataTable.summarizeColumns` for fields fixed by accepted equality constraints, with explicit column restoration and preserved saved preferences, sorting, and raw exports.
  
  Token schema 4 adds metric typography and title tracking roles. Existing private themes should retain their declared schema version until intentionally migrated; the compiler supplies the versioned defaults. New schema-4 definitions must provide the new roles. Studio applications should preload `@gemologic/sheen-tokens/fonts/InterVariable.woff2?url` alongside the retained Mono face, as described in `docs/fonts.md`.
  
  Improve compact-density geometry, scoped landmarks and overlays, touch popovers, and canvas axis font updates across themes and pixel ratios. Preserve accepted content, native owners, focus, drafts, and scroll through appearance changes, refresh, and hydration. Update component metadata, examples, and styling guidance for the new contracts.
  
  Add opt-in `defineColumns` cell dependencies to retain unchanged noneditable custom cells across immutable row refreshes. Reuse equivalent NumberText formatters within bounded, request-isolated theme scopes while preserving locale and format-option changes.

## 0.1.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.

## 0.1.0-rc.2

No changes in this release.

## 0.1.0-rc.1

No changes in this release.

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- a46a080: Add the Studio surface theme and nearest-scope Phosphor artwork selection. Keep AdminApp chrome comfortable by default, allow DataTable to opt into a local density, preserve action icon color through AdminApp wrappers, and keep collapsed Admin rail destinations centered and unobstructed by secondary action menus.
