# Studio application styling

Studio's admin starter defaults to dark surfaces with indigo. The library's global default remains Obsidian with jade. Theme, accent, density, radius, and direction are independent choices; a scoped application must give its overlays the same effective theme.

## Hierarchy and surfaces

Give each page one main working region. An overview may lead with a shared metric strip and one dominant chart, then quieter health, capacity, activity, and account regions. A collection should lead with its toolbar and rows. A registry can pair the list with a create panel. Settings need persistent save/discard controls, while an activity log benefits from day groups. Reuse the existing layout primitives instead of adding these page-specific requirements to the shell.

Use semantic canvas, raised, inset, hover, and selected tokens for content surfaces. `color-bg-overlay` is the translucent backdrop behind a dialog, not a panel background. Static panels are distinguished mainly by luminance and quiet structural borders. Reserve pronounced shadows for floating layers. Required control boundaries, muted text, focus rings, and chart traces still require contrast qualification on their actual surfaces. Quiet styling does not mean low-contrast content.

Use at most one filled accent action per active task surface. A read-only page may have none. A dialog starts its own task; destructive confirmations use danger semantics and name the affected object and consequence. Move infrequent utilities into a named overflow control, preserving native links for navigation and buttons for actions. Do not apply a global JSX count to runtime compositions.

## Typography and numbers

Studio uses locally bundled Inter Variable and retains IBM Plex Mono for code and identifiers. Its variable weights include 400, 510, and 590. Use semantic type roles: 30px metric values, 20px page titles, 14px region titles and dense UI, 16px body text, and a 12px metadata floor. Compact density changes spacing without shrinking these roles. Two-line rows need enough height for both lines and matching virtualization estimates.

`NumberText` uses the scoped locale and `Intl.NumberFormat` parts. It preserves signs, grouping, fraction order, currency placement, and accessible text while styling fractional digits and units more quietly. Set precision deliberately:

- Counts are integers, including request-axis ticks and tooltips.
- Money has an identified currency and an explicit precision. Detail views should retain cents when the table does.
- Percent formatting accepts a fraction: pass `utilization / 100` when the underlying table stores 0–100.
- Summaries may use compact notation; detailed tables, exports, and disclosures must retain the underlying numeric meaning.
- Keep raw numeric accessors for sorting and export. Never sort formatted strings as numbers.

`Stat.trend` describes direction. `Stat.valence` independently describes meaning. A falling review queue can be positive; rising latency can be negative. Omitted valence is neutral. Provide a visible comparison label, and never rely on color alone to explain the change.

The admin fixture has a current account snapshot, not prior-period account totals. Its strip therefore omits historical trend claims. Supply an actual comparison period before adding percentages or “fewer today” labels. Mean utilization is the arithmetic mean across the workspace's accounts; it is not a capacity-weighted regional total. Account navigation, notifications, and the status bar use the same displayed scope, including zero in the empty fixture. Rendering diagnostics belong to the explicit design lab.

Use a named focal chart series with foreground/muted comparisons and distinct strokes when comparing related measures. Preserve the qualified categorical palette for actual categories. Capacity should show used amount once against its full track, with correctly calculated available headroom and a labeled threshold. Missing chart values remain gaps. Keep the accessible data disclosure.

## Forms, copy, and continuity

Compose structured permission or profile fields from `CheckboxGroup` and other existing controls. Show group counts, total selections, explicit unavailable choices, and inline errors. Keep native names and submitted values meaningful; free-form tags are not a replacement for a closed domain. Name, duplicate, and authorization validation belongs to the application and must also run at the server boundary.

Describe facts users can act on. Keep rendering, caching, accepted-snapshot, and benchmark explanations in developer documentation. Counts should identify their scope and reconcile with accepted data. Empty states distinguish first use, no matches, service failure, and denied access; offer only actions that exist and that the user may perform.

Render accepted content completely during SSR. Background refresh retains DOM identity, focus, selection, drafts, expansion, and scroll. On failure, keep accepted content and offer retry without a success notification. Cancel obsolete work when its workspace or authorization changes. Only cold loading may replace an empty region with reserved skeleton geometry.

Do not animate layout content on mount. Brief action-driven overlay transitions may use Studio's motion tokens and must honor reduced motion. Qualify both modes, narrow layouts, RTL, zoom, long labels, keyboard navigation, and loaded/fallback fonts in a browser. A screenshot or unit test alone does not prove these behaviors.

## Enforcement

Keep the shell's structural separator stable while its content pane scrolls. The starter does not add a scroll-dependent shadow or overflow-edge gradient: those layers would obscure content without adding useful information beyond the existing scrollbars and region boundaries. Quiet table hover and selected surfaces remain distinct from the independent keyboard focus ring. Log day headings stay sticky within their own groups; command group headings scroll normally so they do not cover keyboard-highlighted options in short palettes. Use the existing icon system for controls, with accessible names and decorative glyphs hidden from assistive technology.

Reuse the recommended lint rules `sheen/no-raw-color`, `sheen/no-arbitrary-spacing`, `sheen/no-hardcoded-radius`, `sheen/no-unknown-icon`, `sheen/require-icon-label`, and `sheen/no-mount-animation`. These enforce local authoring constraints; rendered browser checks still establish contrast, focus, geometry, and continuity.

The accent budget is a composition review requirement. A static count cannot determine whether conditional controls coexist, whether a portal belongs to a separate task, or whether a colored element conveys status instead of an action. No new global accent-count rule is added. Check the active page and each open dialog independently, including states with no primary action.

Component metadata carries the reusable guidance into the generated manifest and agent context. Run `pnpm manifest` after changing metadata; do not hand-edit `llms.txt`, `llms-full.txt`, or generated examples.

See [admin composition](admin-app.md), [font delivery](fonts.md), [table columns](table-columns.md), [chart display](chart-display.md), and [chart palettes](chart-palette.md).
