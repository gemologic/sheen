# Layout gallery

Loupe's `/gallery` index links complete compositions and their operational states. These routes are intended to run directly or inside the laboratory's exact-width iframe. They use public Sheen packages and the same dark-default root provider as the rest of Loupe.

`/gallery/dashboard` combines a stat group, three labeled Sparklines, an activity table, statuses, and an uncontrolled operator draft. Its URL-selectable ready, empty, loading, server-error, and permission-denied states are explicit. Background refresh retains the accepted composition and draft, marks it busy, and publishes the next revision only after acceptance. Permission loss removes protected content immediately.

The table gallery reuses `/data-table-page`, the full DataTablePage and DataTable integration fixture. `rows=100000` selects a cached deterministic 100,000-row client dataset; `table=paged` chooses explicit numbered pagination while its absence selects continuous virtual scrolling. Both modes retain filtering, sorting, selection, bulk actions, export, column controls, mobile cards, saved-view adapters, status, and refresh handling. `rows=empty` exercises the component-owned empty state. The gallery also links cold-loading, server-error, and permission-denied page states.

Four additional routes exercise application-level composition rather than isolated components:

- `/gallery/list-detail` puts a keyboard-navigable issue list and retained detail pane inside its required `AppShell` owner.
- `/gallery/settings` demonstrates app-owned dirty state, asynchronous save, discard, and permanent save-bar ownership.
- `/gallery/form` uses app-owned validation and submission state without allowing native validation to intercept that contract.
- `/gallery/reading` combines long-form navigation, annotations, code, and semantic content without turning the page into a dashboard.

Each route exposes URL-selectable ready, empty, loading, server-error, and permission-denied states. A delayed ready-state refresh marks the accepted composition busy without replacing it, blanking it, or losing focusable drafts. Fixture/config objects remain data-only until their rendered branch owns them; eagerly creating JSX for an SSR-omitted branch is a hydration bug, even when the eventual markup looks identical. Seven focused Chromium cases verify twenty consecutive retained animation frames for every composition, application-specific landmarks and interactions, permission clearing/recovery, and queued pre-hydration refresh with a retained draft. The command-palette overlay remains pending the approved command-palette dependency, so its grouped TODO is intentionally still open.

`/gallery/hostile` currently covers the dependency-free portion of the hostile qualification surface. It includes an exact 500-character unbroken value, zero-width characters, Arabic/RTL, CJK, Devanagari, Hebrew, skin-tone/ZWJ emoji, a deterministic 100,000-row continuous table, and exactly 200 menu records behind seven nested submenu layers. Desktop coverage reaches the deepest action by keyboard and bounds its 193-action terminal menu to the viewport. Phone coverage proves pathological values do not create document overflow and that the table mounts twenty cards behind local presentation paging. The route labels twelve-series streaming as pending rather than substituting static charts; that portion remains blocked on the accepted renderer and ring-buffer decisions, so the grouped hostile-fixture TODO stays open.

The 100,000-row gallery is functional and browser-tested, but it is not the performance gate. The calibrated benchmark route and its five-run artifact remain authoritative for timing and frame-stall claims.
