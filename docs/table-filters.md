# DataTable filters

FilterBar is a controlled editor for the same versioned `FilterNode` used by client evaluation, delegated server requests, URL state, saved views, selection snapshots, and export. It does not maintain or serialize a second filter representation.

## Accepted state and drafts

`value` is the last accepted immutable AST. Opening a chip or choosing a column creates a local editor draft. Typing, selecting enum values, and changing operators do not call `onChange`; Apply validates the complete condition and publishes one new immutable AST. Escape or Close discards the draft. This prevents half-entered numeric and date ranges from becoming query state and avoids a server request per keystroke.

Existing `and`, `or`, and `not` groups are preserved when a leaf is edited. Removing a leaf simplifies empty and single-child groups without changing their truth semantics. A new condition is appended to a root `and`; any other root expression is kept intact and wrapped with the new condition in an `and`. The chip summary identifies direct negation and inherited excluded groups rather than presenting every imported expression as a flat conjunction.

FilterBar reconciles chip identity across the validated AST copies. Editing a condition retains its trigger. Removing a focused chip moves focus to the next surviving removal action, then the previous one, then `+ Filter`. A controlled owner may delay or reject an update; accepted chips remain visible while it decides.

## Typed editors

- Text supports equals, contains, starts-with, ends-with, case sensitivity, empty, and direct negation.
- Number supports equality and ordered comparisons, an inclusive between range, empty, and direct negation. Inputs must be finite and a range minimum cannot exceed its maximum.
- Enum supports one or more declared values, empty, and direct negation. Option counts come from the accepted `facets` result, never from the currently mounted page. A facet count applies search and every other filter but omits conditions on its own column, so adding an option reports the result it would actually make available.
- Date supports the numeric date operators plus an inclusive range. The dependency-free default uses native date inputs; applications may inject `dateFilterEditor` from `@gemologic/sheen-date` through `filterBar.dateEditor` for the segmented popup selector. Both use `YYYY-MM-DD` machine values and FilterBar converts them to UTC epoch milliseconds. A range begins at 00:00:00.000 UTC on the start date and ends at 23:59:59.999 UTC on the end date. This deterministic boundary avoids browser-local timezone drift in SSR, URLs, saved views, and server requests. Applications needing market-session or user-timezone days should define and expose that domain conversion explicitly instead of relabeling this UTC editor.

New text, enum, number, and date drafts begin with contains, any-of, equals, and between respectively, but publish nothing until Apply. Invalid or incomplete values remain local and show an error.

## Columns, facets, and delegation

Only accessor columns with a `filter` declaration appear in the searchable column chooser. The chooser is a labeled search field followed by ordinary action buttons. It does not claim combobox or listbox behavior before the dedicated Combobox component exists.

Client DataTable calculates each enum facet from the complete searched result with all filters except that facet column's own conditions, before pagination. Server DataTable accepts `facets` only from the response paired with the accepted rows and query, and servers should use the same self-excluding rule. Applying a delegated filter retains the previous accepted rows and their DOM while the request is pending, marks that presentation busy and previous, and then accepts query, rows, total, and facets atomically. Filter and bulk actions are unavailable during that previous-query interval. AbortSignal cancels work where possible, while the request token rejects a late response even if abort is ignored.

## Hydration

Accepted chips and native triggers render in the server document. Editor popovers wait for the contextual theme portal to become ready. A trigger click before JavaScript is queued by Solid and opens exactly one editor after hydration on the retained server button. No initial client filter request is issued when an authoritative server `initialResult` is present.
