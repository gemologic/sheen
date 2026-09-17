# AdminApp brand and ownership contract

`AdminApp` is the full application baseline from `@gemologic/sheen-patterns/admin`. Import `@gemologic/sheen-patterns/admin/styles.css`; that stylesheet includes the base patterns styles. Product identity, routes, permissions, account data, workspaces, notifications, persistence, and transport stay app-owned.

See [Studio application styling](studio-style.md) for focal hierarchy, semantic surface depth, numeric formatting, structured fields, factual copy, and the per-task accent budget.

The `standard`, `workspace`, `horizontal`, and `inspector` presets place semantic chrome zones. A validated `placements` override can move one zone among its supported targets. Placement is deterministic server input. Changing it after hydration is supported for Loupe and settings previews, but it must not be used as a refresh key and does not justify remounting the shell.

`adminChromeZones`, `adminChromeTargets`, and `adminPlacementTargets` expose the complete validated grammar for settings tools and the Loupe Composer. They are data, not a second renderer. Production code passes only the selected overrides:

```tsx
<AdminApp
  preset="workspace"
  placements={[
    { zone: "primary-navigation", target: "topbar-center" },
    { zone: "workspace", target: "sidebar-header" },
    { zone: "primary-actions", target: "sidebar-footer" },
    { zone: "account", target: "sidebar-footer" },
  ]}
  {...applicationModels}
>
  {page}
</AdminApp>
```

Every available zone appears exactly once. Unsupported zone/target pairs and duplicate overrides throw descriptive errors before rendering. The lab links to `/admin?configure=1`, where a collapsed Customize panel exposes all twelve zone placements, four presets, the three appearance axes, theme, mode, accent, direction, and paged/continuous table behavior through URL-backed controls. Normal product routes omit the panel. Preview changes retain the existing shell and accepted content.

The placement grammar covers the common product families without allowing each app to invent incompatible shell markup:

| Zone | Supported placements |
| --- | --- |
| Product | topbar start, sidebar header |
| Workspace | topbar start/end, sidebar header/footer |
| Primary or secondary navigation | topbar center, sidebar navigation |
| Current view | topbar start/center, sidebar header |
| Command trigger | topbar center/end, sidebar footer |
| Global search | topbar center/end, sidebar header |
| Primary or utility actions | topbar end, sidebar footer |
| Notifications or help | topbar end, sidebar footer |
| Account | topbar end, sidebar header/footer |

Start with a preset, then override only what defines the product. A content-heavy workspace can keep navigation and account in the sidebar; a lightweight product can use horizontal topbar navigation and omit the sidebar entirely. The same models and behavior render in either placement, including derived menu direction, mobile order, keyboard access, focus restoration, and scoped theming. Composer edits this grammar directly and emits the chosen preset, appearance, and overrides as copyable TSX.

## Main-content layouts

Action groups default to inline controls. Set `presentation: "overflow"` for infrequent help or utility groups; the labeled trigger opens a scoped popover containing native links and buttons. For overflow icons, pass a factory such as `icon: () => <ExternalLinkIcon decorative />` so hidden controls do not evaluate DOM-bearing JSX during hydration. Sidebar-footer groups open upward. Selection closes the panel, Escape returns focus, and stable action IDs retain current callbacks as models refresh. Prefer at most one filled primary action per task surface. An overlay that starts a new task may have its own primary action; a destructive confirmation uses danger semantics.

AdminApp deliberately owns the application frame, not a single page geometry. Compose its retained child with the focused pattern that matches the task: `PageHeader` plus `Grid` for dashboards, `DataTablePage` for data workspaces, `ListDetailLayout` for inboxes and browsers, `SettingsLayout` for persistent settings navigation and save state, or `SplitLayout` for two resizable work panes. Forms and reading surfaces can use `Container` with `Stack`; generic application dashboards should remain edge-to-edge rather than being forced into a centered document column. These layouts can coexist on different routes without remounting AdminApp or changing its chrome placements.

The starter's `/admin/policies` route pairs a registry with a create form. It composes native named `CheckboxGroup` controls with group counts, a total selection count, unavailable permissions, validation, and form reset. The fixture endpoint independently validates names and allowed permissions; successful submissions add records to the current page session. Deletion names the policy and requires a danger confirmation. These are demo records, not production authorization policies. Register unsaved drafts with `useUnsavedChanges` so navigation is guarded, and abort pending submissions when access is revoked or the page is disposed.

`/admin/settings` uses `SettingsLayout` with app-owned saved values, dirty state, validation, and discard. AdminApp evaluates page children inside AppShell so this dirty-state context is available during SSR and hydration. The fixture's router exempts only appearance-only query changes and in-page fragments from its leave guard; route and data-query changes remain guarded. `/admin/audit` groups recorded events under sticky day labels and exports exactly those events as JSON. Inbox summaries use native disclosure controls.

The normal starter hides its design controls. The Design lab links to `/admin?configure=1`, which exposes the URL-backed preview controls. Appearance changes replace the current history entry; the shell's content location excludes those preview parameters so changing presentation does not start scroll restoration. Actual content navigation retains its history-entry identity. Reset appearance restores Studio, dark mode, indigo, and the standard layout without replacing the current editor. A failed refresh keeps the accepted page and drafts, shows an explicit retry, and emits no success toast. Use `refresh=fail-first` to exercise a real delayed 503 followed by a successful retry in the demo; workspace changes and authorization loss cancel obsolete requests.

## Brand axes

Global theme and accent remain independent. Fresh `ThemeProvider` state is dark Obsidian with jade; the admin starter explicitly scopes dark Studio with indigo. Studio uses a neutral surface ladder, local Inter Variable, Plex Mono identifiers, 30px metrics, and 20px page titles. The bundled surface themes remain Obsidian, Paper, Vellum, Contrast, Slate, Graphite, and Studio. Jade, teal, cyan, sky, blue, indigo, violet, purple, rose, red, orange, and amber are independently selectable accents. Explicit `theme=inherit`, `mode=inherit`, or `accent=inherit` in the starter lab inherits the root axis. Private applications can compile another complete theme with `defineTheme` and `buildTheme` instead of forking AdminApp.

Pass stable server-resolved axes through `AdminApp.theme` when one application needs a scoped brand. Omitted axes inherit the root provider, explicit `null` resets to the provider default, and density alone defaults to `comfortable`. Opt individual data tables into `density="compact"` when the workflow benefits from native-app information density without shrinking navigation, dialogs, and general content. The scoped portal receives the same effective values, so account, notification, command, confirmation, and details overlays do not escape the application brand.

AdminApp's `appearance` prop controls three shell-specific axes without changing the global theme:

- `chrome`: `layered`, `unified`, or `tonal`
- `navigation`: `subtle`, `accent`, or `indicator`
- `actions`: `quiet`, `outlined`, or `accent`

The defaults are `{ chrome: "layered", navigation: "subtle", actions: "quiet" }`. These names encode relationships rather than fixed colors, so every combination continues to work across bundled and private themes. Apps that need exact brand surfaces set the component aliases on their own class:

```css
.acme-admin {
  --sheen-admin-color-canvas: oklch(18% 0.025 255);
  --sheen-admin-color-topbar: oklch(22% 0.035 255);
  --sheen-admin-color-sidebar: oklch(15% 0.02 255);
  --sheen-admin-color-details: oklch(21% 0.025 255);
  --sheen-admin-color-status: oklch(16% 0.02 255);
  --sheen-admin-color-nav-hover: oklch(28% 0.04 255);
  --sheen-admin-color-nav-active: var(--sheen-color-accent-subtle);
  --sheen-admin-color-nav-active-fg: var(--sheen-color-accent-fg);
}
```

The app owns contrast qualification for literal overrides. Prefer semantic values from a private theme, keep text at AA, required control boundaries at 3:1, and preserve the independent focus-ring/actual-surface offset pair.

## Hydration and persistence

Do not render a placeholder shell, read storage in a component mount, or key AdminApp by preset, query revision, theme, or authorization state. The server renders the accepted complete shell. AdminApp resolves JSX-bearing models and semantic slots once, omits empty sidebar slots, and keeps the page, sidebar, details, focus, drafts, and scroll owners stable through hydration and background refresh.

Sidebar persistence is explicit. Read the cookie on the server and pass that value to `sidebarPersistence.initialCollapsed`; save proposals through an app endpoint. The cookie must affect the first server render, otherwise the sidebar will jump after hydration.

```tsx
const sidebarPersistence = {
  initialCollapsed: requestCookies.get("admin-sidebar") === "collapsed",
  save: async (collapsed: boolean) => {
    const response = await fetch("/api/preferences/sidebar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ collapsed }),
    });
    if (!response.ok) throw new Error(`Sidebar preference failed (${response.status})`);
  },
  onError: reportPreferenceError,
};
```

For root theme hydration, choose one owner. In `hydration="client"`, the blocking script owns `<html>` theme attributes and the provider adopts them. In `hydration="cookie"`, the server emits authoritative attributes, the script is skipped, and `persist` completes before the provider accepts a change. Nested AdminApp overlays always mount in its contextual ThemeScope portal and inherit the complete effective axes.

## Refresh and authorization

`refreshing` adds busy/progress semantics to accepted content without hiding, dimming, or replacing it. Abort superseded requests and reject stale responses with a monotonic token. Publish accepted query and rows together. If authorization changes, clear unauthorized account, notification, details, and page models synchronously; `authorizationKey` is diagnostic identity, not an authorization mechanism.

Use numbered server pagination for large or expensive remote collections. Use continuous mode only when the client already has one complete bounded dataset and `rows.length === total`. Pagination and virtualization are independent, and AdminApp never walks remote pages for export or select-all.

## Heavy Loupe workload and benchmark

Loupe's default `/admin` route uses the representative fixture with 240 accounts and 720 chart points. Use `/admin?workload=heavy&table=continuous` for an explicit deterministic stress surface with 12,000 accounts, 20,000 one-minute samples across three time series, six summary metrics, regional capacity bars, ten service-health rows, twelve deployment events, the full application chrome, and the integrated continuous DataTable. The heavy fixture is lazy, seeded, clock-independent, and contains no production data. Numbered mode remains available with `table=paged`; the workload and pagination axes are independent.

`pnpm benchmark:admin` builds production Loupe, starts an isolated preview, and runs five fresh 1,200 x 800 Chromium contexts. It measures initial readiness and DOM/heap footprint, then exercises sidebar collapse, a preset change, scoped theme redraw, command-palette opening, exact search across 12,000 rows, a programmatic 10,000px table scroll, docked and responsive Sheet details, and a real delayed refresh. The refresh gate retains accepted shell, page, chart, details, focus, and uncontrolled draft owners. It also rejects stale layout movement while recording transient toast geometry separately.

The sustained scroll gate is p99 at or below 20ms, with no frame above 50ms and no Long Tasks. Every other operation is gated on no frame above 50ms, no Long Tasks, zero underlying layout shift, retained owners, and no more than 10% calibrated regression against the versioned baseline. The artifact at `test-results/bench/admin-app-benchmark.json` includes raw medians, calibration samples, normalized values, environment metadata, footprints, frame summaries, layout-shift source selectors, and every raw run with its frame intervals and Long Tasks.

Accepted model replacements retain action controls by group/action ID and status counts by label. StatGroup updates values in retained metric positions and resolves inline definitions once. The Loupe workload isolates unchanged row/chart counts and reads pending flags through reactive model getters, so a refresh does not rebuild static navigation/action JSX. Browser regressions cover the representative and heavy refresh, intermediate-frame chrome identity, updated immutable model values/callbacks, reordered status counts, and actions changing between native links and buttons.

The 2026-09-09 local production repeat passed. Its median initial ready time was 421ms; each run exposed all 12,000 rows and 20,000 points while mounting 20 table rows, about 2,049 DOM nodes, and 23.1–26.0MB reported JS heap. The 10,000px scroll held a 16.8ms p99. All nine operations reported zero Long Tasks, zero frames above 50ms, zero accepted-layout shift, and retained required owners; the toast entrance accounted for 0.0084 recorded transient shift. These are local WSL2 Chromium diagnostics, not user-facing guarantees or proof of the pinned hosted runner.

## Delivery and bundle boundary

Importing the base patterns entry and AppShell does not retain AdminApp, table, chart, date, Composer, command-palette, or toast-service code. The dedicated Admin entry intentionally includes the complete shell service composition. Its measured M2 production consumer baseline is 76.8 KB gzip with an 80 KB gate; the base AppShell fixture is 32.4 KB gzip. Vite and other ESM-aware bundlers prune unused package modules, but they cannot remove services that AdminApp actually instantiates. Table, chart, date, and Composer remain separate package or route chunks rather than being hidden behind arithmetic in the Admin budget.
