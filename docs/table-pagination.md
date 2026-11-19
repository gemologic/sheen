# Table pagination state

The `@gemologic/sheen-table/core` entry exports dependency-free pagination state helpers, complete client processing, and a [server request controller](table-requests.md). The root package adds the Solid `DataTable`. Pagination is an explicit independent axis: client mode defaults to continuous, while server mode requires numbered state, cursor state, or explicit `false` for a complete result.

- parsePagination validates false or a closed { pageIndex, pageSize } object, rejects invalid numeric values and unknown fields, and copies/freezes paginated state.
- resolvePagination defaults client mode to false. Server mode requires explicit configuration, including explicit false.
- resetPagination resets a paginated request to page zero (or a cursor request to its first page) for filter/sort changes. resizePagination validates a new positive page size and resets the requested index or cursor.
- parseCursorPagination validates a closed `{ kind: "cursor", pageSize, cursor }` object whose cursor is null or `{ direction: "after" | "before", value }` with a nonempty opaque value. parseServerPagination accepts any of the three server choices and dispatches on `kind`.
- getPageRange validates totals and clamps the requested page before calculating offsets, avoiding unsafe multiplication of an arbitrarily large requested index. Empty results have index zero and pageCount zero.
- paginateClientRows accepts the complete already-transformed client dataset. Continuous mode preserves array identity; paginated mode slices without replacing row objects. It reports matching total and clamped state.
- assessServerPage validates one response. Continuous server results must contain exactly total rows. Numbered pages must contain the exact requested range, including a shorter final page. An empty out-of-range response with a positive total returns a refetch decision for the last valid page. A zero-total response is accepted at page zero without another request. Inconsistent nonempty out-of-range pages and truncated responses fail.
- assessCursorPage validates one cursor response: at most pageSize rows, nonempty-or-null `nextCursor`/`previousCursor`, and an optional `total` of `{ kind: "exact" | "estimate" | "atLeast", value }`. An empty page reached through a cursor (for example after deletions) returns a refetch decision for the first page; an empty first page is accepted as an empty result. The request controller rejects a numbered result for cursor state and a cursor result for numbered state.

These helpers do not fetch, concatenate pages, mutate input state, or publish results. The server controller retains accepted rows, rejects superseded responses, and acts on refetch decisions without treating them as newly accepted data. `DataTable` integrates the same state machine, shared Pagination component, client processing, delegated server requests, and element-scoped row virtualization. Counts and ranges refer to the processed dataset, not virtualized DOM nodes.

## Choosing a mode

- Use continuous client mode for complete, bounded datasets that are already in memory. Virtualization limits DOM work, but it does not limit transfer, parsing, sorting, or memory cost.
- Use client pagination when users benefit from stable page landmarks, short review batches, or shareable page state even though the complete dataset is local.
- Prefer numbered server pagination for large, expensive, or authorization-sensitive remote queries. The server must apply the full filter and a stable total ordering, including a deterministic tie-breaker, before slicing a page.
- Use continuous server mode only when one response is complete and explicitly bounded. `rows.length` must equal `total`; DataTable never walks hidden pages to manufacture an unpaginated result.
- Use cursor server pagination when the API pages with opaque keyset cursors and cannot address page numbers or count the full query cheaply. It is neither numbered pagination nor a complete continuous result.
- Infinite append-on-scroll loading remains a separate, unimplemented fetching contract. Cursor mode replaces one accepted page at a time; it never concatenates pages.

## Cursor server pagination

Pass `pagination={{ kind: "cursor", pageSize, cursor: null }}` in server mode. The `kind` selects the result contract at the type level, so `onStateChange` receives `TableState<CursorPagination>` and must return `DataTableCursorResult<Row>`: `{ rows, nextCursor, previousCursor, total? }`. Either cursor may be null; null disables the matching control. `total` is optional and states its own precision: `exact`, `estimate` (announced as "About N results"), or `atLeast` for a capped count ("N+ results"). Without a total the result count is omitted rather than guessed.

```tsx
async function loadAccounts(state: TableState<CursorPagination>, signal: AbortSignal): Promise<DataTableCursorResult<Account>> {
  const query = new URLSearchParams({ limit: String(state.pagination.pageSize) });
  if (state.pagination.cursor) query.set(state.pagination.cursor.direction, state.pagination.cursor.value);
  const body = parseAccountPage(await (await fetch(`/admin/api/accounts?${query}`, { signal })).json());
  return { rows: body.rows, nextCursor: body.next_cursor, previousCursor: body.prev_cursor, ...(body.total === undefined ? {} : { total: { kind: body.total_capped ? "atLeast" : "exact", value: body.total } }) };
}

<DataTable mode="server" columns={columns} getRowId={row => row.id} caption="Accounts"
  pagination={{ kind: "cursor", pageSize: 50, cursor: null }} onStateChange={loadAccounts} />
```

- Next requests `{ direction: "after", value: nextCursor }`, Previous requests `{ direction: "before", value: previousCursor }`, and First requests `cursor: null`. There is no Last control and no page-number list, because neither can be known without a count.
- Search, filter, and sort changes reset the cursor to null, the same rule that resets a numbered request to page zero. Page-size changes also return to the first page.
- The pager keeps the numbered pager's semantics: a labeled `navigation`, `aria-disabled` controls that stay in Tab order and keep focus through a request, `aria-busy` while pending, and a polite atomic status. The status reads "Page N", where N is counted from accepted navigation and resets to 1 whenever the request cursor is null or the server reports no previous cursor. When a table starts from a restored non-null cursor the ordinal is unknown, so the status reports the rows on the page instead of inventing a number.
- Rows report `aria-rowcount="-1"` and page-relative `aria-rowindex`, because a cursor page has no known absolute offset.
- Select all matching is offered only when the page reports an exact total, because its count is displayed. Server grouping and `summarizeColumns` require full-query metadata and are rejected in cursor mode. Client mode rejects cursor state.
- Pass `initialResult` with one cursor page for SSR, exactly as in numbered mode. A cursor the app still holds can be passed as the initial `pagination.cursor`, and `onAcceptedStateChange` receives the accepted cursor. Saved views and `createTableUrlState` accept cursor state through a `CursorTableStateSchema` (`pagination: "cursor"`); because cursor tokens are short-lived, they persist and restore only `cursor: null`, the first page. See [table-views.md](./table-views.md).

In every mode, use stable row IDs. During server revalidation, DataTable keeps the accepted result and disables query-changing controls until the request settles, then accepts the next query and rows atomically. Failures retain the accepted result and offer retry. When SSR already has a server result, pass `initialResult` for the exact initial state so hydration reuses that markup and skips the duplicate mount request.

## Phone card presentation

`mobileLayout` is a presentation choice, not a fifth data mode. Leave it off when a horizontally scrollable table is acceptable on phones. Enable it with `true` for the defaults, or pass `{ pageSize, titleColumn }` when each card needs an explicit heading field or a different continuous-page bound.

- Continuous client and complete-server results keep `pagination={false}` as their accepted query contract. The phone card view adds only a local page, default 20 and limited to 100 cards, so export, selection, totals, and URL state still describe the complete accepted result.
- Numbered client and server tables use the accepted page directly. Their existing Pagination changes the actual table state; mobileLayout does not add nested pagination.
- Filters and column controls remain in the shared toolbar. A phone Sort menu cycles the visible sortable columns and resets a continuous card page to zero. Each card exposes the same selection controller, cell renderer, row activation, and row action model as the table. The visible overflow action is primary on touch; native long-press remains available.
- The server and client emit the same bounded card window and virtual table. A 767px CSS media query chooses which one is visible. Do not branch on `window`, `matchMedia`, or a mount signal, because doing so replaces server content and creates a flash during hydration.
- Retained server cards follow the same refresh contract as desktop rows: no clearing or opacity fade, no indicator before 500ms, disabled stale-query actions, atomic acceptance, and retained error/retry state.

See [Phone DataTable cards](table-mobile.md) for the complete interaction and hydration contract.

The complete interaction and resource tradeoffs are documented in [DataTable chrome and refresh states](table-chrome.md). In short, there is no universal row-count threshold: choose from payload bytes, row width, transform cost, freshness, shareable page landmarks, and backend expense. Continuous server mode is not infinite loading, and neither is cursor mode.

Pagination changes only the rendered slice. Client export uses the complete accepted filtered/sorted in-memory view and selection, not the current page. Server export delegates the accepted state and selection to `onExport`; DataTable never concatenates pages. See [DataTable export ownership](table-exports.md).

Ten pagination unit tests cover validation, resets, identity, clamping, extreme numeric bounds, complete-result validation, page lengths, deletion/empty decisions, and cursor state and page validation. Five client-state tests and eleven real HTTP request tests cover page and cursor resets, accepted clamping, empty totals, continuous completeness, after/before cursor walks, emptied cursor pages, mismatched result shapes, supersession, and retained results. Cursor SSR cases cover the pager's disabled ends, estimated totals, restored cursors, and rejected combinations; one Chromium case walks a real after/before endpoint to its last page, checks pager focus and status, and restarts on sort. DataTable SSR and Chromium cases cover client continuous virtualization, fixed and variable heights, scroll anchoring, offscreen focus realization, client clamping, atomic server presentation, real failure/retry, bounded phone cards, and delayed-script hydration with retained row/card DOM and no duplicate fetch. Isolated built and Solid-source consumers verify the published DataTable, CSS, and dependency-free core entry outside the workspace.
