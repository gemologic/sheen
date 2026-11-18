# @gemologic/sheen

## 0.3.0

### Minor Changes

- a6c322f: Shell chrome. The AdminApp topbar command trigger reads as a search field ("Search or jump to…" with a search glyph and ⌘K) and collapses to the shortcut on narrow screens. The active sidebar item gains an accent marker in the default navigation style. A sidebar with a single section keeps its heading for assistive technology but no longer shows it. PageHeader titles use the h3 size, and h1–h3 headings use `text-title-tracking`. DataTablePage applies one inline gutter to its header, toolbar, table toolbar, and status row while the grid stays full-bleed. ListDetailLayout list items no longer show bullets: the reset targeted a direct child that ScrollArea wraps.
  
  `Link` gains `variant="quiet"`: foreground color with the underline on hover and focus, for table cells, lists, and navigation where position already marks a link.
- a6c322f: Add chat components in the new `@gemologic/sheen/ai` entry (also re-exported from the root) with a matching `@gemologic/sheen/styles/ai.css` island, included in `styles.css`. `PromptInput` is an auto-growing composer: Enter submits, Shift+Enter adds a newline, IME confirmation never submits, and its send button becomes a focus-retaining stop button while `status="streaming"`. `Conversation` is a keyed `role="log"` that keeps existing message nodes across appends and follows new content only while the reader is at the end. `Message` renders one turn with author, avatar, time, and actions. `StreamingText` grows plain text without recreating rendered paragraphs and announces completion once. New English messages: `promptInput`, `sendMessage`, `stopResponse`, `conversation`, `jumpToLatest`, `responseComplete`.
- a6c322f: Loading `Button`s (and `IconButton`/`Tooltip` triggers) stay focusable. They expose `aria-disabled="true"` and `aria-busy="true"` instead of the native `disabled` attribute, and suppress clicks, keyboard activation, and implicit form submission until loading ends.
- a6c322f: Component chrome.
  
  - **TimeSeries** puts its legend and icon zoom controls in a header row beside the title, and no longer draws the x-axis title on the canvas: `xLabel` still names the native table column and the screen-reader context. The plot is about 85px shorter for the same `height`. The new `area` prop fills under the first series with a fading gradient, and `live` marks the latest sample of each visible series with a pulsing dot (static under reduced motion).
  - **Pagination** first, previous, next, and last controls are icon buttons that keep their localized accessible names and mirror in right-to-left scopes.
  - **Dialog, Drawer, Sheet, and Popover** close from a corner icon placed last in tab order. An explicit `closeLabel`, or an alert dialog, keeps the labelled footer action. Toasts dismiss from an icon button.
  - **Select** uses a chevron that turns when the list opens, and a check glyph for the selected option.
  - **Tabs** gain a sliding accent indicator, and **SegmentedControl** slides its selected fill between options. The server-rendered selected styling stays until the indicator has measured.
- a6c322f: Interaction states now transition instead of snapping: buttons, inputs, checkboxes, radios, segmented items, nav and tree items, and table rows ease their color, border, and shadow changes, and input/choice borders brighten on hover. These transitions run only while a control is hovered, focused, or pressed: theme, mode, layout, and data-driven restyles apply at once instead of cross-fading every control, and selecting a table row paints immediately. Select menus open with a quick fade, the Select trigger changes state without a border transition, input focus rings appear at once, and the Select chevron rotates with a compositor-friendly `transform`. Switch is a pill whose thumb slides (and squashes slightly on press); checkbox and radio marks spring in. Menu items and select options show the highlighted item with a fill and a 2px focus-ring bar on the inline-start edge instead of a full outline. Spinners use the new `duration-spin` token (800ms) instead of a 250ms turn.
- a6c322f: Live data motion. `NumberText` gains `flash` (tints up or down with the market colors when the value changes) and `tween` (counts from the previous value). `Stat` tweens numeric values on update by default (`tween={false}` opts out). DataTable accessor columns accept `flash: true` to tint a numeric cell when its value changes for the same row. `flashChange(element, direction)` is exported for custom renderers. Nothing animates on the first render, and reduced motion disables all of it. Skeletons shimmer while they wait (static under reduced motion).
- a6c322f: Theme schema 5 adds motion roles: `duration-press`, `duration-spin`, `ease-spring`, `motion-distance-sm`, `motion-distance-lg`, and `motion-stagger`. Older private themes migrate automatically, and reduced motion zeroes them. UI transient layers now use the motion tokens instead of literal easings: popovers, menus, and select lists scale in from their anchor, toasts rise in, buttons give press feedback, and drawers slide again instead of being overridden by the dialog fade.
- a6c322f: A non-controllable `ThemeScope` now forwards setter calls for axes it does not pin to its parent, so `useTheme().setMode()` and friends work inside `AdminApp` (which scopes only density). Setting an axis the scope pins still rejects with an error naming that axis. `SettingsLayout`'s section index now has a visible heading and follows the reading position as the page scrolls; a navigation click keeps its section current until the scroll settles.
- a6c322f: Breaking: Sheen now requires `solid-js@1.9.19`. Update the application's exact `solid-js` dependency from 1.9.15 to 1.9.19; `sheenRuntime()` rejects other versions. A fresh install of `vite-plugin-solid` resolves `babel-preset-solid@1.9.19`, which requires `solid-js ^1.9.16`, so 1.9.15 now produces an invalid dependency tree.
  
  The vendored DOM renderer is rebuilt from Solid 1.9.19 with the same two corrections: delegated events do not mark hydration complete while lazy components are pending, and an empty `composedPath()` falls back to walking the DOM tree. CLI scaffolds generate the new pin and `vite@8.3.8`, which resolves Vite security advisories in 8.2.2 (GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg, and the bundled launch-editor advisories). Sheen's `vite` peer range stays `>=8 <9`.
- a6c322f: New `@gemologic/sheen/sortable` entry with `SortableList` and `Board`, styled by the opt-in `@gemologic/sheen/styles/sortable.css`. Both are controlled and keyed by stable ids: pointer drags (via the Pragmatic drag and drop engine, kept behind this entry) show an accent drop indicator and auto-scroll their scroll containers, and the keyboard model is Space/Enter to lift, arrows/Home/End to move (mirrored in RTL), Space/Enter to drop, and Escape to cancel, with localized live-region announcements. `SortableList` reports `onReorder({ id, fromIndex, toIndex, ids })` in vertical or horizontal orientation with an optional grip handle and disabled items. `Board` moves cards within and between columns with `onMove({ id, fromColumn, fromIndex, toColumn, index })`, keeps empty columns as drop zones, accepts a column header slot with the live count, optionally reorders columns, and snaps columns on phones. Applications that never import the entry pay nothing for it.
- a6c322f: Add CSS islands that mirror the JavaScript islands: `@gemologic/sheen/styles/core.css`, `@gemologic/sheen/styles/forms.css`, `@gemologic/sheen/styles/overlays.css`, and `@gemologic/sheen/styles/navigation.css`. Core holds the shared base (layer order, theme root, shared control and focus rules) and is required; the other islands contain only their own component rules and layer on top of it; `ShortcutSheet` also needs `styles/overlays.css` because it renders a Dialog. `@gemologic/sheen/styles.css` keeps working unchanged and now composes the four islands without duplicating rules.
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

### Patch Changes

- a6c322f: Surface and depth retune. Obsidian dark widens the steps between base, raised, and interaction surfaces; control borders across every theme drop to the softest value that still clears 3:1 against all seven surfaces; light Obsidian's selected fill is neutral instead of indigo. Elevations are now layered (inner top highlight, contact shadow, ambient shadow) with lighter light-mode values, and raised surfaces carry `elevation-raised` by default. Modal and command overlays blur what they cover.
  
  The focus ring now follows the selected accent (Contrast keeps its black or white ring). Components still read only `color-focus-ring`, so a private theme or scope can pin it independently.
  
  Fixes: table and filter-bar focus outlines referenced undefined tokens and rendered nothing; menu item descriptions and admin account subtitles referenced an undefined type size; drawers stretched their header, body, and footer to fill the viewport instead of scrolling the body.
- a8534a5: Menus, submenus, and other list popups no longer pull focus back after keyboard navigation on a busy page. Each popup's deferred open autofocus is skipped when focus has already moved elsewhere while it waited, so quickly arrowing into a submenu keeps focus on the item you reached.
- 718dd8c: Closing a popover or dialog before its open autofocus has run now returns focus to the trigger. Focus that stayed on the element that held it at open is no longer treated as a deliberate move elsewhere, so a quick Escape after a mouse-opened Popover lands back on its trigger instead of the previously focused control.
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
- Updated dependencies [a6c322f]
  - @gemologic/sheen-tokens@0.3.0

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
