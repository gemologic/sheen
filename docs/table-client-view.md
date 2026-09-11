# Complete client processing

`createClientView(rows, state, options)` composes the client processing contract in one pure, synchronous call:

1. Search the complete supplied dataset with stable relevance ranking.
2. Apply the validated filter AST.
3. Count enum facets across that complete matching result.
4. Apply explicit multi-column sorting, retaining relevance order for equal sort keys.
5. Slice the requested page, or return the entire view when pagination is false.

State contains search, filter, sorting, and pagination. Options contain explicit locale, search/filter/sort column definitions, and the value accessor. This is an intermediate processing interface, not the final branded column API or versioned URL/view-state serializer.

The result separates `view` (all transformed rows) from `rows` (visible page), with total, facets, and effective clamped pagination. Continuous rows share the view array. Row objects retain identity. Invalidated pages clamp to the last valid page; empty results return page zero. Input state is not mutated. The table state owner must reset the requested page on search/filter/sort/page-size changes and adopt accepted effective pagination atomically with results. Export uses view, not rows, before applying export-specific visible-column/selection rules.

Invalid inputs or accessor failures throw rather than return a partial view. Compose this evaluator with the debounced search controller to retain accepted results on errors. The helper itself owns no cache, async transport, subscriptions, or SSR scheduling. It must never be applied to a server page and presented as a globally filtered/sorted result.

Four focused tests cover transform order, full-result facets before pagination, relevance and explicit-sort ties, continuous identity, clamped/empty pages, state immutability, and invalid state. The isolated package consumer exercises the public composition. Loupe's table-search fixture now uses this evaluator behind the debounced controller while retaining deterministic initial SSR results.

The fixture also provides enum filtering, descending sorting, continuous/paginated toggling, and accepted Pagination controls. A composed browser scenario verifies page resets, full-result facet counts while only one row is visible, explicit sort precedence, and returning to continuous mode. Four Chromium cases pass twice, including retained-draft and delayed-hydration regressions. This small fixture uses local signals for requested state; it does not replace the planned versioned table-state owner or FilterBar.

## Query-state transitions

`parseClientViewState(value, schema)` validates the complete search/filter/sorting/pagination fragment, rejects extra or missing fields and invalid column references, and returns frozen copies. `changeClientViewState(state, change, schema)` handles search, filter, sorting, pagination, and pageSize changes without modifying the current state. Search/filter/sort and page-size changes reset page zero; continuous mode remains continuous. Changing page size through a general pagination update also resets. Explicit page navigation preserves its requested index until processing clamps against the actual matching total.

These functions operate on requested state only. Keep accepted state/results visible until evaluation succeeds. The Loupe fixture uses the shared transitions instead of separate reset logic and adopts clamped pagination only after an accepted evaluation. Four tests cover immutable parsing, malformed/unknown state, reset rules, continuous mode, and direct/indirect page-size changes. The state fragment is JSON-compatible but is not the full versioned saved-view/URL envelope, which also needs column layout and migration policy.

DataTable now consumes this pipeline for client rows and exposes header sorting plus independent continuous/numbered presentation. Remaining: complete FilterBar/search UI, grouped/tree rows, export integration, and calibrated processing performance. The processing helpers have not yet been optimized to reuse a persistent index between queries.
