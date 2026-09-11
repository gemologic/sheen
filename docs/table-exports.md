# DataTable export ownership

Client `DataTable` export is enabled by default when at least one visible accessor column exists. Set `export={false}` to hide it, or pass `export={{ formats, filename, resetKey }}` to restrict CSV/JSON, choose the filename base, and define an account or permission boundary. Display-only and hidden columns are excluded because they do not expose exportable values.

Client exports snapshot the accepted complete filtered and sorted in-memory view, not the virtualized rows or current page. With no active selection, every matching row is included. An explicit selection resolves retained IDs against that complete view in view order. An inverted selection re-evaluates its captured filter and exclusions without broadening the current view. Export never changes pagination, fetches data, or reads hidden accessors.

CSV uses CRLF records, quotes every field, doubles embedded quotes, and preserves newlines and Unicode. String headers and values that begin with formula sigils, including after whitespace or invisible control/format characters, receive a leading apostrophe. Negative numeric values remain numeric text. JSON preserves string, finite-number, boolean, and null scalar types. Apps must format objects or domain values into those scalar column accessors before export.

Server mode never serializes the loaded page as though it were complete. It shows export only when `onExport(request, signal)` is supplied. The request contains the accepted versioned table state, format, and either `null`, an immutable explicit-ID selection, or an immutable query/exclusion selection. The app applies the complete query and authorization rules and resolves a `Blob`; DataTable owns the pending state, object URL, download, retry, and revocation. It never walks server pages.

A failed server export retains the last successful download and offers retry for the captured failed request. Concurrent submissions are disabled, superseded or cleared completions cannot publish, and changing `export.resetKey` aborts work and revokes the retained artifact immediately. A table data refresh and an export have separate pending states: accepted rows stay mounted and usable as presentation, while query-changing and export actions remain guarded until their operation settles.

Export triggers are present in deterministic server markup. The menu mounts in the contextual theme portal only after interaction. A click queued before hydration opens one menu against the retained trigger and does not call `onExport` until the user chooses a format. Blob and object-URL work occurs only after a client interaction.

Use continuous client mode for complete bounded local data, client pagination for local page landmarks, and numbered server pagination for large or expensive remote results. Pagination changes presentation, not export scope. See [table pagination](table-pagination.md) and [selection ownership](table-selection.md).
