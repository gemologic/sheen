# Table pagination state

The `@gemologic/sheen-table/core` entry exports dependency-free pagination state helpers, complete client processing, and a [server request controller](table-requests.md). The root package adds the Solid `DataTable`. Pagination is an explicit independent axis: client mode defaults to continuous, while server mode requires either numbered state or explicit `false` for a complete result.

- parsePagination validates false or a closed { pageIndex, pageSize } object, rejects invalid numeric values and unknown fields, and copies/freezes paginated state.
- resolvePagination defaults client mode to false. Server mode requires explicit configuration, including explicit false.
- resetPagination resets a paginated request to page zero for filter/sort changes. resizePagination validates a new positive page size and resets the requested index.
- getPageRange validates totals and clamps the requested page before calculating offsets, avoiding unsafe multiplication of an arbitrarily large requested index. Empty results have index zero and pageCount zero.
- paginateClientRows accepts the complete already-transformed client dataset. Continuous mode preserves array identity; paginated mode slices without replacing row objects. It reports matching total and clamped state.
- assessServerPage validates one response. Continuous server results must contain exactly total rows. Numbered pages must contain the exact requested range, including a shorter final page. An empty out-of-range response with a positive total returns a refetch decision for the last valid page. A zero-total response is accepted at page zero without another request. Inconsistent nonempty out-of-range pages and truncated responses fail.

These helpers do not fetch, concatenate pages, mutate input state, or publish results. The server controller retains accepted rows, rejects superseded responses, and acts on refetch decisions without treating them as newly accepted data. `DataTable` integrates the same state machine, shared Pagination component, client processing, delegated server requests, and element-scoped row virtualization. Counts and ranges refer to the processed dataset, not virtualized DOM nodes.

## Choosing a mode

- Use continuous client mode for complete, bounded datasets that are already in memory. Virtualization limits DOM work, but it does not limit transfer, parsing, sorting, or memory cost.
- Use client pagination when users benefit from stable page landmarks, short review batches, or shareable page state even though the complete dataset is local.
- Prefer numbered server pagination for large, expensive, or authorization-sensitive remote queries. The server must apply the full filter and a stable total ordering, including a deterministic tie-breaker, before slicing a page.
- Use continuous server mode only when one response is complete and explicitly bounded. `rows.length` must equal `total`; DataTable never walks hidden pages to manufacture an unpaginated result.
- Model cursor-based infinite loading as a separate fetching contract. It is not numbered pagination and it is not a complete continuous result.

In every mode, use stable row IDs. During server revalidation, DataTable keeps the accepted result and disables query-changing controls until the request settles, then accepts the next query and rows atomically. Failures retain the accepted result and offer retry. When SSR already has a server result, pass `initialResult` for the exact initial state so hydration reuses that markup and skips the duplicate mount request.

## Phone card presentation

`mobileLayout` is a presentation choice, not a fifth data mode. Leave it off when a horizontally scrollable table is acceptable on phones. Enable it with `true` for the defaults, or pass `{ pageSize, titleColumn }` when each card needs an explicit heading field or a different continuous-page bound.

- Continuous client and complete-server results keep `pagination={false}` as their accepted query contract. The phone card view adds only a local page, default 20 and limited to 100 cards, so export, selection, totals, and URL state still describe the complete accepted result.
- Numbered client and server tables use the accepted page directly. Their existing Pagination changes the actual table state; mobileLayout does not add nested pagination.
- Filters and column controls remain in the shared toolbar. A phone Sort menu cycles the visible sortable columns and resets a continuous card page to zero. Each card exposes the same selection controller, cell renderer, row activation, and row action model as the table. The visible overflow action is primary on touch; native long-press remains available.
- The server and client emit the same bounded card window and virtual table. A 767px CSS media query chooses which one is visible. Do not branch on `window`, `matchMedia`, or a mount signal, because doing so replaces server content and creates a flash during hydration.
- Retained server cards follow the same refresh contract as desktop rows: no clearing or opacity fade, no indicator before 500ms, disabled stale-query actions, atomic acceptance, and retained error/retry state.

See [Phone DataTable cards](table-mobile.md) for the complete interaction and hydration contract.

The complete interaction and resource tradeoffs are documented in [DataTable chrome and refresh states](table-chrome.md). In short, there is no universal row-count threshold: choose from payload bytes, row width, transform cost, freshness, shareable page landmarks, and backend expense. Continuous server mode is not infinite loading.

Pagination changes only the rendered slice. Client export uses the complete accepted filtered/sorted in-memory view and selection, not the current page. Server export delegates the accepted state and selection to `onExport`; DataTable never concatenates pages. See [DataTable export ownership](table-exports.md).

Eight pagination unit tests cover validation, resets, identity, clamping, extreme numeric bounds, complete-result validation, page lengths, and deletion/empty decisions. Four client-state tests and nine real HTTP request tests cover page resets, accepted clamping, empty totals, continuous completeness, supersession, and retained results. DataTable SSR and Chromium cases cover client continuous virtualization, fixed and variable heights, scroll anchoring, offscreen focus realization, client clamping, atomic server presentation, real failure/retry, bounded phone cards, and delayed-script hydration with retained row/card DOM and no duplicate fetch. Isolated built and Solid-source consumers verify the published DataTable, CSS, and dependency-free core entry outside the workspace.
