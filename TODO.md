# Decisions Made

- Decision: SPEC.md v3 incorporates all twelve original audit dispositions and eleven accepted follow-ups, with the subsequent placeholder and focus-offset corrections.
- Decision: Fresh installs start dark; explicit saved preferences win and system mode is opt-in. Initial target: seven themes and twelve independently switchable accent presets. The M0 comparison selected jade as the default.
- Decision: Muted text and placeholders meet AA. Structural borders are ungated; necessary control boundaries meet 3:1. Focus uses an independent ring and surface-colored offset, validated against actual adjacent colors. Contrast theme targets AAA text.
- Decision: Partial scope APIs resolve complete effective axes through context; null resets to root configured defaults. Scoped portals stay outside scrolling panes, with ordering per provider; full-layout comparisons use iframes.
- Decision: Only root preferences persist. Scope setters require controllable scopes and cannot mutate root preferences implicitly.
- Decision: Client hydration uses prepaint script-owned root attributes and deterministic initial markup; cookie hydration uses identical request state and app persistence callbacks. First paint, DOM reuse, focus, and absence of refresh flicker are release requirements.
- Decision: Existing content stays visible during revalidation. Preserve identity, focus, scroll, and dirty edits; reject superseded results and visibly distinguish retained previous-query rows. Authorization changes clear unauthorized content immediately.
- Decision: Router/data/connection ownership stays with apps. Sheen supplies router adapters, dirty-state registration, status rendering, and optimistic/undo affordances.
- Decision: No direct primitive runtime imports in apps. Accept the SheenPolymorphicProps type seam; use opaque sheen column definitions and explicit typed, lint-warned __unsafe_tanstack/__unsafe_uplot escape hatches.
- Decision: Client/server processing is independent of pagination. Virtualize both paginated and continuous desktop tables; server pagination is the recommended large-remote-data mode. Unpaginated server results must be complete and bounded.
- Decision: Server requests combine AbortSignal and monotonic response tokens. Selection is explicit retained IDs or an immutable query/exclusion snapshot; filter changes clear selection by default.
- Decision: Apps supply server export and per-user saved-view adapters. Edit commits retain failed drafts, reject superseded completions, and expose conflicts until retry/discard.
- Decision: Same-scope shortcut collisions throw in dev; production warns and uses the last registration. Runtime snapshots supplement static doctor checks.
- Decision: Inline editing is locally uncontrolled until commit; blur/Enter commits and Escape reverts. Forms consume committed state.
- Decision: Chart columns are equal-length Float64Arrays with strictly increasing UTC-millisecond timestamps; NaN marks gaps. Streaming keeps newest samples, never blocks producers, and exposes dropped/rejected counters.
- Decision: Private themes use exported defineTheme/buildTheme. Minor token additions need versioned defaults; removals/semantic changes are major.
- Decision: At most two build-selected icon sets; literal names are transformed by Vite or imported individually. DynamicIcon explicitly pays the full-registry cost. Loupe owns explicit live-token invalidation.
- Decision: Benchmark five-run medians use calibration and versioned baselines; >10% cumulative regression fails. Frame-stall gates remain absolute on pinned CI hardware; three consecutive smaller increases warn.
- Decision: All exported components require exhaustive metadata and a compiling example. Suppressions require reasons and doctor fails above ten per app. Scaffolds refuse overwrite by default; sync-skill refuses dirty owned directories.
- Decision: Assay has 20 versioned prompts, zero hallucinated props, ≤1 lint error per 100 lines, ≥80% sheen interactive elements, and no >5% aggregate regression.
- Decision: Support latest two stable major browsers; automate Chromium/WebKit and manually check Firefox each release. Explicit locale/messages, tested tablet support, and functional phone fallback are required.
- Decision: Milestones replace phase tags. ScrollArea, shell drawer, and Solid router adapter land M1; palette/context menu/general drawer/TanStack adapter land M2; charts land M3. Both viz and metron must ship before 1.0.
- Decision: URL navigation uses Link; actions use Button. Layout content has no mount animation; transient layers animate enter/exit. Financial chart types belong in a future sheen-market package.
- Decision: AdminApp is the opinionated compact brand baseline over AppShell. It uses semantic topbar/sidebar chrome zones and named presets so navigation, workspace, account, notification, help, and action groups can move among supported placements without arbitrary shell markup.
- Decision: AdminApp also exposes independent semantic chrome, navigation, and action appearance axes. Themes and accents remain global brand axes; documented AdminApp CSS aliases allow app-specific surface colors without forking structure or component behavior.
- Decision: AdminApp configuration is deterministic server input. Sidebar persistence is explicit and server-resolved; responsive or persisted preferences must not rearrange chrome after hydration. The shell provides scoped toast/confirm/command services while general modals remain declarative.
- Decision: DetailsPanel is a docked/resizable wide-screen region and a right Sheet on narrower screens, with one accepted content owner, controlled or URL-backed identity, and focus restoration.
- Decision: DataTable keeps one engine with integrated and framed presentations. AdminApp/DataTablePage use integrated compact chrome; standalone tables use framed chrome. Integrated capability controls appear automatically and global search is explicit per column.
- Decision: Saved views use a compact switcher rather than a toolbar full of management controls. Pagination remains independent of virtualization and client/server processing.
- Decision: WCAG 2.2 AA automation, keyboard/adaptive matrices, NVDA/Firefox, and VoiceOver/Safari qualification are release gates. Dragging always has equivalent menu/button operations and announcements.
- Decision: Calendar/date/time selectors move into active scope in a separate @gemologic/sheen-date package. Ark UI and @internationalized/date remain internal; public values are Sheen-owned, serializable, and never JavaScript Date.
- Decision: Add SegmentedControl, TagInput, FileDropzone, ActivityTimeline, Stepper, and application-oriented account/workspace/notification/query patterns. Extend CodeBlock and isolate DiffViewer, LogViewer, and JSONViewer behind separate code entries.
- Decision: Loupe Composer starts from AdminApp, edits a constrained semantic layout AST, retains recoverable private drafts, and emits deterministic copyable TSX. It never becomes a production runtime schema. Pragmatic Drag and Drop is lazy and Loupe-only.
- Decision: AdminApp, table polish, hydration continuity, accessibility, and performance block the next application-ready release. Composer and advanced viewers block expanded Loupe completion but not package publication. Viz and metron migration remain paused until Sheen is ready to publish.

# M0: Workspace and Theme Spike

- [x] Establish pnpm workspaces, TypeScript/package exports, and Solid-compatible library builds while preserving the existing default.nix setup; qualify chosen dependencies before adding them.
- [x] Set up Vitest, real SolidStart/Playwright browser fixtures, lint/typecheck commands, and matching CI entry points.
- [x] Define primitive and semantic token schemas, reference resolution with cycle errors, and versioned defaults with focused compiler tests.
- [x] Emit scoped CSS and the Tailwind inline bridge, including independently selectable accent modifiers and pure-CSS entry points.
- [x] Build obsidian/paper prototypes and jade/indigo/amber accents; expose the comparison in a minimal Loupe toolbar and record the chosen default accent.
- [x] Implement provider/scope effective-axis resolution, null resets, controllable-scope rules, and root-only persistence with tests.
- [x] Implement contextual portal targets outside scroll panes and provider-level overlay ordering; test nested-scope dialogs and single-layer Escape behavior.
- [x] Implement the client prepaint script, dark fallback, storage validation, CSP support, and deterministic hydration handoff with delayed-JS browser tests.
- [x] Implement cookie-mode SSR state and app persistence callback handling; test success/failure without full navigation.
- [x] Build Button, Input, and Dialog prototypes with stable IDs, semantic behavior, scoped colors, and SSR/keyboard tests.
- [x] Prove the M0 acceptance scenario: two scoped themes, independent accents, correct initial dark paint, hydrated controls, and no overlay theme escape.

# M1: Tokens, Themes, and Build Contracts

- [x] Complete all semantic token families, role scales, and component fallbacks, including control borders, focus offsets, status/market colors, and type roles.
- [x] Implement contrast validation for text, controls, actual focus/surface combinations, and composited colors, reporting every failure.
- [x] Complete obsidian, paper, and vellum in both modes with gated text and surfaces.
- [x] Add contrast, slate, and graphite in both modes, including AAA text checks for contrast.
- [x] Add the Studio application theme in both modes with Phosphor artwork, calmer neutral surfaces, and a slightly airier content type scale.
- [x] Complete twelve accent presets and validate every supported theme/mode/accent combination; retain independent status/market colors.
- [x] Implement density, radius, reduced-motion, direction, locale, and message overrides with nested-scope tests.
- [x] Export private-theme build APIs and versioned migration defaults; test invalid themes, missing keys, and unsupported schema versions.
- [x] Package self-hosted IBM Plex fonts with licensing and apply tabular figures to numeric roles.
- [x] Implement the semantic Radix/Phosphor registry, two-set CSS switching, and token-sized decorative/labeled icons.
- [x] Implement literal-name Vite transforms, per-icon exports, and explicit DynamicIcon; verify registry reachability and tree shaking with consumer builds.
- [x] Introduce component metadata/demo schemas, exhaustive export/prop coverage checks, and extraction/typechecking of examples.
- [x] Add package-entry bundle fixtures and budgets, including single-component, feature-entry, representative-app, all-theme CSS, and private-theme consumers.

# M1: Components and Application Shell

Each component task includes its metadata, demo, real unit/keyboard tests, SSR hydration case, and relevant visual states.

- [x] Finalize Button, IconButton, ButtonGroup, Link, shared variants/class merging, and the public polymorphic type seam; verify loading prevents keyboard as well as pointer activation.
- [x] Implement Text, Heading, Code, Kbd, Badge, and Tag with semantic roles and token-based type/color behavior.
- [x] Implement Surface, Card, Separator, Alert, and Callout with inherited focus-offset surfaces and correct contrast roles.
- [x] Implement Spinner, Skeleton, EmptyState, DescriptionList, and styled Table primitives with accessible states.
- [x] Implement Field, InputGroup, Textarea autosize, and SearchInput with mandatory labels and AA placeholders.
- [x] Implement Checkbox, CheckboxGroup, RadioGroup, and Switch with controlled/uncontrolled and disabled behavior.
- [x] Implement Select and its contextual listbox with keyboard navigation and scope-aware portals.
- [x] Finalize Dialog and add AlertDialog/ConfirmDialog with focus restoration, nested dismissal, and disposal-safe imperative confirm.
- [x] Implement Tooltip and Popover with accessible labels, shortcut display, and transient enter/exit motion.
- [x] Implement nested DropdownMenu including checkbox/radio items and consistent roving focus.
- [x] Implement Toast/Toaster and app-owned optimistic revert/undo/retry affordances with rejection tests.
- [x] Implement Tabs, Breadcrumb, NavList/NavItem, Collapsible, and Accordion with logical properties and keyboard behavior.
- [x] Implement Stack, Row/Cluster, Grid, Container, Center, and Spacer using role-based spacing.
- [x] Implement ScrollArea and the fixed-viewport AppShell grid with constrained panes, responsive document-scroll fallback, and overlay scrollbars.
- [x] Implement the shell-specific mobile drawer and SidebarNav nesting/collapse/active-route behavior.
- [x] Implement PageHeader, Toolbar overflow groups, StatusBar connection/task props, and regional ErrorState/LoadingState.
- [x] Define the router adapter and ship the Solid router implementation with title sync and per-pane restoration tests.
- [x] Implement useUnsavedChanges, navigation blocking, beforeunload registration, useIsWindowFocused, and optional useOnlineStatus.
- [x] Implement scoped shortcut registration, collision policy, browser-shortcut protection, input suppression, and cleanup.
- [x] Add shortcut sequences, pending indicator, tooltip association, generated question-mark sheet, and M1 bindings without mod+k.
- [x] Provide a user-facing disable/remap mechanism for character-only shortcuts, including sequences, unless activation is restricted to the focused component; qualify speech-input-safe behavior against WCAG 2.1.4.
- [x] Add real delayed/erroring refresh fixtures and assert retained DOM identity, focus, selection, scroll, drafts, no skeleton replacement, and no blank intermediate frames.
- [x] Expand Loupe component pages with playground/code output, variant matrices, anatomy, generated props, and accessibility panels.
- [x] Gate 0.1.0 on M1 inventory coverage, contrast, SSR/first-paint, keyboard, axe, and package-consumer checks.

# M2: Table State and Data Processing

- [x] Define sheen-owned branded column APIs, typed escape hatch, stable row IDs, and serializable versioned table/filter state.
- [x] Implement client filtering/sorting/facets, typed operators/negation/group AST, and ranked debounced fuzzy search with deterministic fixtures.
- [x] Implement server request dispatch with AbortSignal, monotonic tokens, coherent accepted query/results, and real out-of-order/error endpoint tests.
- [x] Implement independent pagination and continuous modes; test complete-result validation, page resets/clamping, empty totals, and retained previous-page presentation.
- [x] Build fixed/variable-height virtualization with stable row identity, scroll anchoring, focus realization, and no blank frames.
- [x] Implement column sizing, resize/auto-fit, pinning, visibility, and reorder with keyboard alternatives and CSS-driven resize updates.
- [x] Implement row grouping, aggregates, hierarchical expansion, async subtree loading, and retry/stale-response behavior.
- [x] Implement explicit/inverted selection, page/all distinctions, ranges, keyboard navigation, and immutable bulk-action payloads across page changes.
- [x] Build FilterBar chips and typed editors, including a basic date-range input that remains usable without the popup DatePicker.
- [x] Implement versioned URL serialization through the router adapter and saved-view list/save/delete integration with failure recovery.
- [x] Implement client CSV/JSON exports and server onExport gating, including escaping and spreadsheet-formula-safe CSV output.
- [x] Implement inline cell editors with local drafts, validation, commit IDs, transport rollback/retry, stale refetch markers, and app-reported version conflicts.
- [x] Build table headers/footers, selection action bar, context actions, and distinct empty/no-results/cold-load/refresh/error states.
- [x] Implement phone mobileLayout cards with equivalent actions and bounded paging rather than mounting the full dataset.
- [x] Add calibrated table benchmark fixtures and CI artifacts for render, sort, filter, resize, and scroll/frame-stall gates.

# M2: Remaining Components and Patterns

- [x] Implement CommandPalette sources, fuzzy matching, recents, runtime registry integration, and mod+k registration only while the provider exists.
- [x] Implement ContextMenu with row-selection semantics and native-menu suppression only when a replacement opens.
- [x] Implement general Drawer/Sheet with scoped portals, focus restoration, and keyboard dismissal.
- [x] Implement Resizable with persisted split sizes and keyboard controls.
- [x] Implement accessible Pagination controls and accepted-result announcements.
- [x] Implement ListDetailLayout with URL-driven activation, focus restoration, and pane scroll continuity.
- [x] Build DataTablePage integrating toolbar, filters, saved views, selection actions, and all regional states.
- [x] Build SettingsLayout with save/dirty handling and responsive behavior.
- [x] Build SplitLayout with responsive behavior and persisted sizes.
- [x] Implement NumberField, Slider, and RangeSlider with locale-aware numeric input and accessible keyboard interaction.
- [x] Implement Combobox and MultiCombobox with async result continuity, accessible selection, and no refresh flashing.
- [x] Implement the form validation adapter and generic editable text-field contract, including blur/Enter/Escape behavior and failed validation.
- [x] Implement Avatar/AvatarGroup with fallback behavior, accessible labels, tests, and demos.
- [x] Implement Progress/Meter with accessible values, tests, and demos.
- [x] Implement CodeBlock with Shiki integration, SSR output, tests, and demos.
- [x] Implement Tree with roving focus, hierarchical expansion, selection, tests, and demos.
- [x] Ship and exercise the TanStack Router adapter against the shared navigation, blocking, and table URL-state contract.

# M2: Application Readiness Pass

## AppShell prerequisite

- [x] Reproduce and fix the delayed-hydration AppShell pane-restoration one-pixel drift; add an exact scroll-anchor regression across desktop/mobile presentation changes without remounting accepted content.

## DataTable product pass

- [x] Add shared `integrated` and `framed` DataTable presentations; inherit compact density coherently across rows, headers, editors, selection, footer, pagination, and mobile cards without duplicating behavior.
- [x] Add explicit column search configuration and projections, validate sensitive/hidden/action exclusions, and expose typed public search options with accessible label, placeholder, debounce, shortcut, and `false` opt-out.
- [x] Route search through accepted TableState, URL serialization, saved views, exports, inverted selection, server AbortSignal/token handling, page reset, and refresh continuity.
- [x] Rebuild integrated table chrome as one compact capability-driven toolbar with search, active filters, columns, export, result counts, and overflow; keep page actions owned by DataTablePage and prevent duplicate toolbars.
- [x] Replace expanded saved-view controls with a compact switcher plus accessible management menu/dialog, preserving adapter error recovery and current accepted state.
- [x] Polish sort indicators, multi-sort sequence, resize and reorder affordances, pinned edges, row hover/focus/selection, context actions, previous-query state, empty states, and selection action bar across themes/densities.
- [x] Update DataTablePage to use integrated chrome; retain framed standalone demos and both continuous and numbered pagination examples. The integrated AdminApp starter remains owned by its explicit AdminApp task below.
- [x] Add real keyboard and screen-reader-oriented table tests for search/filter/sort announcements, virtualized row/column context, edit/selection state, pagination acceptance, and focus survival during refresh.
- [x] Profile production table render, multi-sort, ranked search, cell projections, and reactive fan-out before optimizing; retain the current API and avoid a worker-only column contract unless measured evidence requires one.
- [x] Extend the calibrated benchmark with global search, multi-sort, representative complex cells, integrated compact mode, and accepted-content identity; improve raw 100k render/sort timings without regressing frame, blank-row, or bundle gates.
- [x] Add opt-in exact global search with a visible mode control and portable leading-apostrophe syntax; keep per-column equality in FilterBar and exclude unbounded native regular expressions from the client contract.

## AdminApp

- [x] Define the public AdminApp, semantic chrome-zone, placement, preset, navigation, account, workspace, notification, and action-group types without importing app data/auth concerns.
- [x] Add the `@gemologic/sheen-patterns/admin` entry and isolated consumer build; prove base AppShell does not pull AdminApp services, date, table, chart, or Composer code.
- [x] Implement AdminTopbar and horizontal TopNav with landmark naming, overflow behavior, roving keyboard navigation, active-route matching, and compact density.
- [x] Implement AccountMenu and WorkspaceSwitcher from app-owned models, including topbar dropdown and sidebar-footer dropup/alignment behavior with equivalent keyboard and touch access.
- [x] Extend SidebarNav for AdminApp semantic header/navigation/footer zones, grouped/nested items, badges, collapsed icon rail, tooltips, focus preservation, and responsive handoff.
- [x] Implement and visually qualify the standard, workspace, horizontal, and inspector presets plus individual validated placement overrides; reject duplicate or unsupported placements descriptively.
- [x] Add controlled/uncontrolled sidebar collapse with explicit server-resolved persistence input and callback; scaffold cookie-authoritative persistence and prove no post-hydration layout jump.
- [x] Implement DetailsPanel as one controlled/URL-backed content owner with docked/resizable and right-Sheet presentations, responsive focus restoration, stable identity, and no duplicated hydration markup.
- [x] Add scoped Toast provider/Toaster, command palette, and confirm service composition to AdminApp while keeping arbitrary Dialog content declarative and tree-shakeable.
- [x] Build the polished default AdminApp starter with integrated DataTable, topbar, sidebar, account/workspace controls, page header, status, refresh progress, details, route states, and believable seeded content.
- [x] Add AdminApp SSR/hydration/refresh tests across every preset and placement, including account/permission clearing, retained focus/drafts/scroll, mobile order, RTL, and nested theme portals.

## Application-readiness qualification

- [x] Run axe and complete keyboard traversal against the default AdminApp, every placement preset, integrated paged/continuous DataTables, open overlays, details presentations, and refresh/error/permission states.
- [x] Add forced-colors, 200%/400% zoom, reduced-motion, RTL, long-content, focus-not-obscured, and target-size qualification for the AdminApp/DataTable release boundary.
- [x] Add application benchmarks for sidebar collapse, preset layouts, DetailsPanel dock/Sheet transitions, command-palette opening, and retained refresh; fail on unexpected layout shift, remount, Long Task, or frame over 50ms.

## Date, selector, and application inventory

- [x] Create `@gemologic/sheen-date` with isolated exports, styles, package-consumer fixtures, and a measured bundle budget; qualify and pin Ark UI plus `@internationalized/date` without leaking their runtime imports or public types.
- [x] Define and test Sheen-owned serializable CalendarDate, Time, DateTime, timezone, range, ambiguity, ISO form-projection, parsing, validation, and locale contracts without JavaScript Date values.
- [x] Implement Calendar and DateField with complete keyboard navigation, unavailable/min/max dates, locale/calendar presentation, deterministic SSR, form submission, and metadata/demos.
- [x] Implement DatePicker and DateRangePicker with scoped portals, presets, typed validation, draft continuity, responsive presentation, and DataTable FilterBar integration.
- [x] Implement TimeField, TimePicker, DateTimePicker, and TimeZoneSelect with explicit IANA zones, DST ambiguity/nonexistence handling, locale formatting, form projection, and hydration tests.
- [x] Implement SegmentedControl with single-selection form semantics, roving keyboard focus, compact presentation, and overflow behavior.
- [x] Implement TagInput with ordered unique values, keyboard removal/reorder, async validation continuity, native form projection, and long-token behavior.
- [x] Implement FileDropzone with equivalent file-picker activation, drag-state announcements, app-owned upload transport, validation, retry/removal, and no drag-only operation.
- [x] Implement ActivityTimeline and Stepper with semantic list/progress structure, current/completed/error states, responsive density, and non-color status encoding.
- [x] Add AccountMenu, WorkspaceSwitcher, and NotificationCenter gallery scenarios against real adapters/state, with no package-owned network or persistence.
- [x] Extend CodeBlock with header/filename, copy, wrap, language, and highlighted-line options while keeping Shiki optional.
- [x] Add a deterministic AuthLayout base plus focused OAuth/OIDC and responsive brand-split starters, with app-owned authentication, isolated packaging, and hydration-safe content identity.

# M3: Charts

- [x] Define chart APIs, series/token names, and validated toColumnar conversions for equal lengths, UTC milliseconds, finite values, and NaN gaps.
- [x] Implement scoped canvas probes and batched token refresh, including inherited changes and Loupe-only invalidation.
- [x] Build TimeSeries/uPlot lifecycle with SSR fallback, size reservation, scoped theme updates, cleanup, and the typed unsafe seam.
- [x] Implement line/area paths with gap semantics and responsive grouped/stacked/horizontal bars on the SVG layer.
- [x] Implement dependency-free Sparkline and Stat/StatGroup with scoped trend colors and budget tests.
- [x] Implement columnar ring-buffer streaming, newest-sample retention, rAF coalescing, dropped/rejected counters, and lifecycle cleanup.
- [x] Implement crosshair groups, tooltips, annotations, legend toggles, zoom/reset, and keyboard-equivalent controls.
- [x] Add accessible chart summaries and view-as-table output that preserves gaps, explicit locale, and formatting-only timezones.
- [x] Validate palettes for supported color-vision simulations and pin the perceptual-distance threshold with committed reference fixtures.
- [x] Add chart benchmarks for 100k points/four series, streaming, tooltip updates, Sparkline, and 20-chart theme/accent changes.

# M4: Loupe and Cross-System Validation

- [x] Complete URL-backed toolbar axes and resizable viewport iframes, including theme/accent persistence and explicit locale.
- [x] Implement grid/spacing/focus overlays, forced states, color-vision simulations, reduced-vision blur, and performance meters.
- [x] Build token explorer values/consumers and the contrast matrix with diagnostic WCAG/APCA scores.
- [x] Build scoped live token editing with rAF invalidation and chart refresh without remounting components.
- [x] Add base-theme derivation, validated import, theme.ts export, and recoverable local editor persistence.
- [x] Build component ThemeScope comparisons and full-layout iframe comparisons across themes, accents, modes, densities, and widths.
- [x] Add dashboard and full-featured 100k-row table gallery scenarios with empty/loading/error/permission states.
- [x] Add list-detail, settings, form-heavy, and reading gallery scenarios with command palette overlays and refresh fixtures.
- [x] Build the hostile fixture with long/zero-width/multilingual text, deeply nested menus, 100k rows, and twelve streaming series using non-color encodings beyond eight colors.
- [x] Complete RTL, tablet, phone, keyboard, axe, and bounded visual matrices; validate the entire theme/accent palette separately from screenshot combinations.
- [x] Run hydration/refresh regression scenarios across supported test engines, including stored light preferences on a dark-default app and delayed fonts/JS/data.
- [x] Expand axe coverage to every Loupe route and meaningful open/loading/error/permission state; keep zero automated WCAG A/AA violations as the gate.
- [x] Add forced-colors, 200%/400% zoom, focus-not-obscured, target-size exception, reduced-motion, and long/multilingual-content qualification for AdminApp, DataTable, date selectors, overlays, and Composer.
- [ ] Bound the 179-live-preview Components catalog's hydration and reveal work so production scrolling has no Long Task or frame above 50ms while retaining deterministic server markup.
- [ ] Record NVDA/Firefox and VoiceOver/Safari release-candidate passes for navigation, table operations, date/time selection, overlays, AdminApp presets, and Composer non-drag alternatives.
- [x] Extend application benchmark and continuity coverage to date/time overlays and Composer editing without weakening the AdminApp/DataTable gates.

## Loupe Composer

- [x] Define the private versioned Composer layout AST, semantic regions, AdminApp placement nodes, component nodes, validation errors, migrations, and deterministic serialization without CSS or executable expressions.
- [x] Extend metadata validation with opt-in Composer parent/child regions, editable safe props, deterministic fixture factories, and code-generation adapters; reject incomplete eligible components in CI.
- [x] Build seeded lorem, user, record, activity, chart, and application-state fixture factories that use no network, clock, or per-render randomness.
- [x] Build the Composer route with lazy palette, isolated AdminApp iframe canvas, property inspector, selection model, viewport/theme axes, and the polished default starter document.
- [x] Add standard/workspace/horizontal/inspector preset selection and per-zone placement editing for navigation, account, workspace, notification, help, and semantic action groups.
- [x] Add lazy Loupe-only Pragmatic Drag and Drop pointer behavior with valid drop targets, indicators, autoscroll, cancellation, virtualization compatibility, and no published-package reachability.
- [x] Implement Add before/after, Move, Move to region, Duplicate, Configure, and Remove alternatives with focus management and live announcements; test every result without pointer input.
- [x] Implement one deterministic undo/redo history for structural and prop edits while excluding preview-only theme, viewport, direction, locale, and motion changes.
- [x] Add recoverable local drafts, schema-version migration, reset, and JSON import/export with unavailable/corrupt-storage behavior; document the schema as private and unstable.
- [x] Generate deterministic self-contained and structure-only TSX using public imports and named placeholders; format, typecheck, lint, SSR-render, and hydrate every generated fixture in CI.
- [x] Add Composer hostile, keyboard, screen-reader, refresh, reduced-motion, RTL, responsive, memory-growth, and bundle-isolation tests; dragging must never be the only route to an outcome.
- [x] Implement QueryBuilder over the table filter AST with keyboard-complete rule/group editing, deterministic serialization, URL/view compatibility, metadata, demos, and Composer eligibility.
- [x] Add separately imported DiffViewer, LogViewer, and JSONViewer with bounded or virtualized large-content behavior, search/copy affordances, accessible structure, metadata, and bundle fixtures.

# M5: Agent Tooling

- [x] Generate compact llms.txt, full context, and the vendorable skill from validated metadata/examples; enforce the compact context budget.
- [x] Write the repository AGENTS.md and consumer guidance covering Solid correctness, wrapper seams, shell/refresh contracts, and theme/contrast roles.
- [x] Implement raw-color, spacing, radius, tier-one-token, and logical-property lint rules with real rule fixtures and wrapper exceptions.
- [x] Implement native-control/import, props-destructure/class-merge, and computed-style lint rules with valid/invalid fixtures.
- [x] Implement shell-scroll, transient-motion, icon-label/name/dynamic-name, unsafe-seam, and layout-preference rules.
- [x] Enforce justified suppression comments and the ten-suppression ceiling in doctor; report exact paths and limits of static analysis.
- [x] Implement app scaffold with theme/hydration bootstrap, router adapter, shell, recommended lint, examples, and vendored context; include the keyboard bootstrap and carry or supersede the Solid/Kobalte patches documented in docs/hydration.md and docs/dependency-patches.md, then typecheck/build the generated app.
- [x] Implement theme and component scaffolds with metadata/demo/test files and generated-output validation.
- [x] Implement dry-run/refusal/force-diff CLI behavior and dirty-directory-safe sync-skill using temporary real fixture repositories.
- [x] Implement doctor version/config checks and runtime shortcut snapshot ingestion; verify read-only behavior and actionable exit statuses.
- [ ] Commit twenty assay prompts/rubrics and capture a pinned model/configuration baseline with outputs and per-prompt reports.
- [ ] Gate agent-context changes on hallucinated props, lint density, sheen interaction coverage, and ≤5% relative aggregate regression.

# M6: Dogfood and Release

- [ ] Finish and qualify the application-readiness blockers before adding Sheen as a dependency of viz or metron; record the exact metron repository selected for dogfood.
- [ ] Migrate viz's theme/shell and foundational controls with application-level navigation/hydration checks.
- [ ] Migrate viz's remaining in-scope components and resolve recorded adoption friction.
- [ ] Migrate metron's shell/theme and controls, preserving runtime refresh and connection semantics.
- [ ] Migrate metron tables to pagination/continuous contracts, views/export adapters, and conflict-safe edits.
- [ ] Migrate metron charts and streaming inputs; verify theme switches and sustained updates without flashing.
- [ ] Close dogfood release blockers and record evidence that both apps have shipped on sheen.
- [x] Configure Changesets/release PRs, public package contents, MIT/font licenses, and deprecation/codemod policy without publishing until separately authorized.
- [x] Add a manual main-only npm workflow that prepares and hashes exact tarballs before protected-environment approval, supports resumable one-time bootstrap, and uses OIDC staging afterward.
- [ ] Run release gates, capture manual Firefox evidence, review calibration/bundle artifacts, and prepare 1.0 only after both-app acceptance.

# Deferred / Out of Scope

- Jade is the selected default accent; all twelve presets remain required and independently switchable.
- Solid 2 migration and dual-major framework support are deferred.
- Candlestick, depth chart, and order book belong in a future sheen-market package.
- Cursor-based infinite fetching is deferred; continuous bounded data and numbered pagination are required now.
- Demand-driven inventory: OTPField, TreeSelect, ColorPicker, TransferList, HoverCard, ScatterChart, Heatmap, Donut, Histogram, and BoxPlot.
- Custom icon artwork, MCP server, React/framework-agnostic adapters, marketing components, and legacy-browser polyfills are out of scope.
- Paid fonts and product-specific themes/configuration remain in private consuming repositories.
- Actual package publishing and changes in external application repositories require their own authorized execution workflow; this document plans those milestones.
