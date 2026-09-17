# DataTable virtualization

`DataTable` always uses element-scoped TanStack Virtual against its own viewport. Pagination controls how many rows enter the accepted result; virtualization independently controls how many accepted rows have DOM nodes.

Fixed rows are the default. `rowHeight` defaults to `var(--sheen-table-row-h)`, while the numeric estimate follows the active compact, comfortable, or spacious density token. A density change clears measurements and recomputes the virtual range without replacing retained row DOM. Apps using a custom CSS row length can provide `estimatedRowHeight` as the closest numeric first-render estimate.

Set `variableRowHeight` when cell content may wrap or otherwise determine block size. The CSS row length becomes a minimum, realized rows are measured, and ResizeObserver delivery is animation-frame batched. Measurement begins in `onMount`, after Solid has hydrated the deterministic estimate-based server window; ref callbacks never change the virtual range while hydration is matching nodes.

Rows are reconciled by the stable IDs returned from `getRowId`, not by their current virtual indexes. A same-query refresh records the first visible row plus its inset into that row, then restores the equivalent scroll offset after insertions or removals above it. Surviving realized rows are moved rather than recreated, preserving their DOM state and focus. Query or page changes do not apply this refresh anchor; accepted page changes scroll to the first row.

Supplying `onRowActivate` enables one roving row tab stop. Arrow Up/Down, Page Up/Down, Home, and End calculate the target over the accepted row model, scroll it into the virtual range, wait for realization, and then focus it. Enter activates the focused row. Static tables without row activation retain native table reading semantics and add no row tab stops. Selection extension, editable-cell traversal, and a complete interactive grid contract remain separate DataTable work.

The Loupe fixtures verify 28/34/42px density changes for the original themes and 36/40/48px for Studio, wrapped variable heights, row identity, same-query pixel anchoring, retained focus, offscreen End/Home realization, and activation. Both fixed and variable programmatic scroll cases sample every animation frame and require at least one intersecting body row. Delayed-script coverage includes all table modes and proves the authoritative server row survives hydration with no duplicate fetch. Studio also uses its matching numeric estimate in SSR, before any DOM measurement.
