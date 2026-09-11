# Loupe Application Composer

The Application Composer at `/composer` is a design-time workbench for assembling a credible Sheen application shell. It starts with the compact `AdminApp` baseline rather than a blank canvas. The starter includes product and workspace identity, primary and secondary navigation, global search, application actions, notifications, an account menu, page content, a searchable and filterable `DataTable`, a details panel, status, and scoped transient layers.

Use the global theme, mode, accent, density, radius, motion, direction, locale, and viewport controls to inspect the same retained preview under another brand or device condition. AdminApp adds independent `chrome`, `navigation`, and `actions` appearance axes. Its semantic placement controls can move product, workspace, navigation, current view, search, command trigger, primary and utility actions, notifications, help, and account among their supported topbar or left-sidebar locations. In particular, account and workspace menus can live at either the top or bottom of the left rail; footer menus open upward.

The palette and inspector expose only components whose metadata, validated props, deterministic fixture adapter, renderer, and generator adapter are complete. Pointer dragging is an optional convenience loaded only on this Loupe route. Add before, Add after, Move up, Move down, Move to region, Duplicate, Configure, and Remove provide the same outcomes without dragging, with focus restoration and live announcements.

## Document boundary

Composer documents are private, versioned editor state. They contain semantic regions, AdminApp placement nodes, component nodes, scalar safe props, and deterministic fixture names. They cannot contain callbacks, expressions, arbitrary CSS, application data fetching, or executable source. Import validates the entire document and either accepts one coherent result or reports path-specific errors. The current reader migrates schema version 0 to version 1; unsupported versions fail closed.

Local drafts are recoverable work in progress. The server always renders the complete polished starter, then the editor offers a stored draft after hydration rather than silently replacing the visible application. Corrupt or unavailable storage leaves the starter usable. Reset removes the owned draft. Undo and redo retain at most 100 document snapshots, preventing an indefinitely open design session from accumulating unbounded history.

Do not ship the JSON document as an application runtime or treat its schema as semver-stable. The durable output is the generated TSX.

## Generated TSX

Self-contained output includes a `ThemeProvider`, deterministic application models and fixtures, and the complete AdminApp composition. Structure-only output keeps the shell and component structure but exposes named application slots for product-specific content. Both forms use only public `@gemologic/sheen*` imports. They contain no Composer runtime, metadata, arbitrary style attributes, unsafe escape hatch, or drag dependency.

`pnpm manifest` regenerates both checked-in fixtures, checks Composer metadata against the validated model, and typechecks every component example. Browser qualification SSR-renders and hydrates both generated modes. `pnpm check:consumers` builds copied published-package artifacts and rejects Composer or Pragmatic Drag and Drop reachability from both the base patterns entry and the dedicated AdminApp entry.

`pnpm benchmark:composer` builds production Loupe and runs five fresh Chromium contexts. It measures property configuration, structural add/remove, theme switching, desktop-to-phone presentation, and shared QueryBuilder/DataTable editing. Medians are divided by a same-context calibration and fail above the versioned 10-percent allowance. Three consecutive increases also fail even when each individual increase is smaller. Every operation additionally gates p99 frames at 20ms, frames at 50ms, Long Tasks, unexpected layout shift, and surviving owner identity. A phone card presentation may replace a desktop table because that target no longer survives; the iframe, AdminApp, editor, QueryBuilder, and draft may not be replaced. The committed local capture is diagnostic until deliberately replaced by the first accepted pinned `ubuntu-24.04` CI artifact.

The generated code is intentionally a starting point. Copy it into an application, replace deterministic fixtures with app-owned models and adapters, then keep navigation, persistence, authorization, data requests, exports, and optimistic operations outside Sheen.

## Hydration and refresh

The parent editor and isolated preview both render complete deterministic server markup. The preview reconciles incoming cloned documents by stable node ID, preserving unchanged component and ancestor identities. Changing a theme axis, placement, or neighboring component therefore does not remount retained inputs, tables, the shell, or the iframe. Preview-only axes are excluded from document undo history.

Apply the same rule in generated applications: keep accepted content visible during refresh, abort superseded work, reject stale responses, and publish query and data state together. Cold skeletons are only for regions with no accepted content. Authorization changes must clear newly unauthorized content immediately.

## Qualification boundary

Automated checks cover validation, migrations, deterministic serialization, all structural operations, bounded history, unavailable storage, delayed-script hydration, retained drafts, semantic placements, upward footer menus, real pointer dragging, keyboard alternatives, generated-code SSR/hydration, responsive RTL and reduced-motion states, WCAG A/AA rules, and published-package isolation. Manual NVDA/Firefox and VoiceOver/Safari release-candidate sessions remain a separate release gate and must be recorded before publication.
