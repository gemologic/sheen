# DataTable grouping and hierarchy

Grouping and hierarchy render related rows as a treegrid while keeping data ownership explicit. They are mutually exclusive because a grouped aggregate tree and an application hierarchy have different identities, loading rules, and bulk-action scopes.

## Client grouping

Set `grouping={{ by: "column-id" }}` on a complete continuous client table. The grouping column must be an accessor column whose value is a string, finite number, boolean, or null. Groups retain first-seen order. Add `aggregate` to accessor column definitions to calculate `sum`, `average`, `min`, `max`, or `count`; null values are ignored and an empty aggregate is null except for count.

Client grouping rejects numbered pagination. Calculating an aggregate after slicing a local page would produce a page subtotal with the visual authority of a full-group total. If a bounded local dataset needs both grouping and page-sized presentation, keep it continuous and let virtualization bound mounted DOM, or delegate grouping and pagination together to the server.

## Delegated server grouping

Server mode may combine grouping with numbered pagination. Every accepted `DataTableResult` must include a `groups` array:

```ts
{
  rows: acceptedPageRows,
  total: 55,
  groups: [{
    value: "Alpha",
    rowIds: ["server-0", "server-1"],
    count: 30,
    aggregates: [{ column: "amount", value: 4350 }],
  }],
}
```

`rowIds` are the contiguous members present on that accepted page. Across the response, they must cover every page row exactly once and in server order. `count` is the number of matching rows in the full query group and cannot be smaller than the page segment. `aggregates` must contain exactly one finite number or null for every configured aggregate column and must also describe the full query group. Group values are unique within a response.

The server adapter is the authority for grouping, ordering, totals, and aggregates. DataTable validates the response atomically and retains the previous accepted groups while a new page or query is pending. It disables group and selection actions during that previous-query presentation. AbortSignal limits wasted work; the request token prevents a late response from becoming current even when its producer ignores abort.

## Hierarchical rows

Use `hierarchy.getChildren(row)` for static children. Return `undefined` for a subtree that is not loaded, rather than an empty array. To load it, also provide `hasChildren(row)` and `onLoadChildren(row, signal)`. The predicate is application authority that distinguishes an unloaded parent from a known leaf.

Each node owns an independent load generation and AbortSignal. Collapsing the node, changing roots or `resetKey`, or disposing the table aborts its request. A completion from an older generation is discarded. A failed request leaves the parent visible and retryable; a valid retry replaces the failed state atomically. Loaded data is rejected as a unit if IDs are empty, duplicate, changed for the same object, or cyclic.

`defaultExpanded` may be a boolean or stable row-ID list. Static descendants can render in the server document. Default-expanded remote descendants wait for mount before loading, preserving deterministic SSR and preventing a duplicate hydration request. Use `resetKey` for account or permission changes so expansion and loaded descendants cannot cross an authorization boundary.

## Keyboard and selection

Rows use roving focus. Up and Down move between visible rows. Right expands a closed parent, then moves into its first child when already expanded. Left collapses an open parent, then moves to its parent when already collapsed. Enter and Space toggle group rows. The rendered treegrid publishes level, position, set size, expansion, selection, and busy state where applicable.

Explicit selection still refers only to accepted loaded row IDs. All-matching selection is not offered for hierarchy because its flat filter snapshot cannot represent unloaded subtree membership. Applications that need query-wide hierarchical bulk actions should expose a separate app-owned action with a payload and authorization model that can represent that scope.
