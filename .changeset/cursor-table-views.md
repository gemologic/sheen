---
"@gemologic/sheen-table": minor
---

Saved views and table URL state accept cursor pagination. Pass a `CursorTableStateSchema` (`{ ...schema, pagination: "cursor" }`) to `createSavedViews`, `createTableUrlState`, `parseTableState`, `serializeState`, `deserializeState`, or `changeTableState` to read and write `TableState<CursorPagination>`. Cursor tokens are short-lived, so persisted state always stores `cursor: null` (the first page) and restoring a stored token, or a numbered envelope under a cursor schema, fails closed. Schemas without `pagination` keep the existing complete/numbered contract.
