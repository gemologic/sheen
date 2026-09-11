# DataTablePage

`DataTablePage` composes page-level structure around one app-owned `DataTable`. It owns the `PageHeader`, application action `Toolbar`, compact saved-view switcher, loading/error replacement, and status footer. The nested table remains the only owner of search, filters, results, columns, export, row actions, selection state, pagination, query processing, and accepted rows.

## Pagination choices

Pagination and client/server processing are independent decisions:

- Use `pagination={false}` for a complete, bounded client dataset when continuous scanning is useful. Desktop rows are still virtualized, so continuous mode does not mount every row.
- Use numbered client pagination when users need stable landmarks, smaller visible result sets, or page-addressable state even though all rows are already local.
- Prefer numbered server pagination for large, expensive, frequently changing, or authorization-sensitive remote datasets. Filtering, sorting, totals, facets, and pagination must be evaluated together by the server.
- Use `pagination={false}` in server mode only when one response is the complete bounded match set and `rows.length === total`. DataTable rejects a partial response and never walks hidden pages to assemble it.
- Do not treat virtualization as a network or memory bound. It limits realized DOM only. Payload bytes, row width, client processing cost, freshness, and user navigation needs matter more than a universal row-count threshold.
- Cursor-based infinite fetching is a separate deferred mode. It must not be represented as continuous complete data.

Pass the choice directly to `DataTable`; `DataTablePage` neither adds page controls nor changes the table state. The full state, including numbered pagination, can therefore round-trip through URL and saved-view adapters without a second page-level pagination owner.

## Loading, refresh, and authorization

Use `loadingPhase="cold"` only when there is no accepted result. The layout-matched `loadingFallback` is present in deterministic server markup and appears after the shared cold-load delay. Use `loadingPhase="refresh"` for revalidation. The accepted table remains mounted and opaque, including row identity, focus, edit drafts, selection, and scroll; a delayed progress indicator supplies feedback without replacing it with a skeleton.

Regional `not-found`, `server-error`, and `permission-denied` states replace the content. In particular, permission loss removes table content immediately even if a refresh is pending. Retry behavior remains app-owned.

Server output must select the same initial `state`, loading phase, accepted table data, and pagination value that the client will hydrate. Do not branch initial markup on browser width or storage. Theme client mode is applied by the blocking prepaint script, defaults to dark, and leaves root attributes outside Solid ownership. Cookie mode emits request-authoritative attributes instead. `DataTablePage` and `DataTable` retain their reusable server nodes through hydration.

## Saved views and actions

The `views` model is controlled. Supply validated app-backed records plus save, restore, delete, and exact-operation retry callbacks. Keep persistence per user and cross-device; there is no localStorage default. Applying a view must restore one validated table state rather than independently mutating search, filters, sorting, pagination, and columns.

Put page commands such as refresh or create in `toolbarGroups`. Define query controls through DataTable columns and its `search` and `filterBar` options. Define row and bulk commands once through `DataTable.actions`; duplicating either family in the page toolbar creates inconsistent authorization, pending, and selection behavior.

The Loupe `/data-table-page` fixture exercises both continuous and numbered client presentation, real saved-view HTTP operations, retained background refresh, immediate permission removal, delayed-script dark hydration, and page/table/row identity checks.
