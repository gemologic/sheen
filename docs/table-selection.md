# Table selection ownership

`createTableSelection(filter, filterColumns)` owns explicit selected IDs or an inverted filter/exclusion selection. It performs no fetches and never walks pages. `setLoadedIds(ids)` supplies unique nonempty string IDs from the accepted matching page or complete client view, in its displayed order. Never supply IDs from pending-query placeholders. The table remains responsible for mapping stable row identities and validating that rows match the query.

`setSelected(id, selected)` changes only loaded-row membership. `selectLoaded()` selects the supplied page/view, not the entire remote query. Explicit IDs remain selected after their page unloads. `selectRange(anchor, target, selected)` applies an inclusive range in the supplied view order, including reverse ranges, and rejects unloaded endpoints before changing anything. It does not fetch intermediate remote pages.

`selectAllMatching()` switches to the validated immutable filter snapshot plus an exclusion Set. Exclusions survive page changes; selecting an excluded loaded row removes its exclusion. `isSelected` in inverted mode only reports membership for loaded matching rows, since an arbitrary unloaded ID cannot prove it matches the filter. Explicit mode can report retained IDs from earlier pages.

`getPayload()` returns a frozen discriminated snapshot: `{ kind: "ids", ids }` or `{ kind: "query", filter, excluded }`. ID arrays are detached frozen copies of internal Sets. Later selection updates cannot change a bulk operation's captured payload. Apps decide how to execute it and enforce authorization independently.

`setFilter` validates first and clears selection plus loaded-row eligibility when the normalized filter changes. Identical normalized state preserves selection. This compares structure, not logical equivalence. `clear()` deselects while retaining current eligibility; `reset()` also removes eligibility for account/permission changes. Invalid filter/ID updates preserve prior state.

The filter supplied here must represent the entire bulk-operation matching criterion. DataTable therefore hides select-all-matching while separate fuzzy search is active. Use explicit IDs until the full query can be captured correctly; never silently widen a bulk action to the filter AST alone.

Focused tests cover loaded-only eligibility, explicit retention, query/exclusion snapshots, immutability, filter/reset behavior, malformed IDs, atomic validation, inclusive ranges, client export resolution, and complete DataTable integration. Isolated public-package consumers exercise both payload kinds. Chromium coverage exercises native page/row checkboxes, cross-page retention, range/modifier gestures, focus realization, pending-result guards, delayed hydration, and client/server export payloads.

The `/table-selection` Loupe fixture now exercises native checkbox page selection, explicit IDs retained across pages, query exclusions, mixed page-checkbox state, detached captured bulk payloads, and filter-change clearing. Two Chromium cases pass twice, including delayed hydration preserving the native checkbox and Space activation. It uses four in-memory rows, not a server selection integration or virtualized range/focus implementation.

The first interaction run exposed a shared boolean-input ownership warning. Event-time reads of the compiled checked getter could construct an unowned memo. The shared Checkbox/Switch helper now reads that prop through an owned memo. The selection regression rejects ownership warnings; the checkbox/switch keyboard, controlled rejection, form reset, and hydration regressions pass alongside it, twelve Chromium executions total plus four unit/SSR tests. UI build, consumer checks, lint, and typechecks pass.
