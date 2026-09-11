# QueryBuilder

`QueryBuilder` is the keyboard-complete editor for Sheen's existing `FilterNode` AST. It does not introduce a second query language. The same validated value can drive a `DataTable`, a URL, or an app-owned saved-view adapter.

```tsx
import { createSignal } from "solid-js";
import { DataTable, QueryBuilder, defineColumns } from "@gemologic/sheen-table";
import type { FilterNode, QueryBuilderColumn } from "@gemologic/sheen-table/core";

const queryColumns = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["active", "paused"] },
] satisfies readonly QueryBuilderColumn[];

const [filter, setFilter] = createSignal<FilterNode>({ kind: "and", children: [] });

<QueryBuilder columns={queryColumns} value={filter()} onChange={setFilter} />
<DataTable
  data={rows}
  columns={columns}
  getRowId={row => row.id}
  caption="Accounts"
  pagination={false}
  filter={filter()}
  onAcceptedStateChange={state => setFilter(state.filter)}
/>
```

Use `serializeFilter` and `deserializeFilter` for URLs and saved views. They use a versioned deterministic envelope, reject unknown fields and columns, and enforce size and depth limits. Do not persist executable predicates.

Groups support `and`, `or`, and `not`. Every structural operation has a visible button, including add, remove, move before, move after, exclude, and include. Dragging may be added by an application, but it must remain an optional accelerator.

`DataTable.filter` is the reactive app-owned seam. Updating it preserves the table owner and surviving row DOM. In server mode, it uses the table's existing abort and monotonic stale-response protection. Keep `onAcceptedStateChange` wired when table-authored filtering is also enabled so both editors share one accepted state.

Number and date ranges are committed only when their bounds are valid. Dates are UTC epoch milliseconds in the AST; the native date editor is a deterministic `YYYY-MM-DD` projection. Enum values must come from the declared closed option set.
