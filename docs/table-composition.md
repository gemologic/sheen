# DataTable feature composition

`DataTable` bundles every table feature. Apps that do not need some of them can compose a lighter table with `createDataTable(features)` from `@gemologic/sheen-table`:

```tsx
import { createDataTable, filterBarFeature } from "@gemologic/sheen-table";

const AccountsTable = createDataTable([filterBarFeature]);

<AccountsTable data={rows} columns={columns} getRowId={row => row.id} caption="Accounts" pagination={false} />;
```

The returned component takes the same props as `DataTable`, minus the props owned by omitted features, and renders through the same engine. `DataTable` is exactly `createDataTable([filterBarFeature, groupingFeature, hierarchyFeature, cellEditingFeature])`, so the full export is unchanged.

| Feature | Owns | Approximate gzip cost |
| --- | --- | --- |
| `filterBarFeature` | `filterBar` and the toolbar filter UI for columns that declare `filter` | 16,500 bytes |
| `cellEditingFeature` | columns with `editor`, `onCellCommit`, `editResetKey` | 6,300 bytes |
| `groupingFeature` | `grouping` | 3,100 bytes |
| `hierarchyFeature` | `hierarchy` | 2,800 bytes |

`createDataTable([])` measures about 83,200 bytes gzip with its static imports against about 111,000 for `DataTable`; [bundle-budgets.md](./bundle-budgets.md) holds the enforced numbers. The remaining base is the virtualized renderer, search, sorting, pagination (numbered and cursor), selection, actions, column controls, summaries, export, and the UI primitives they use. Those stay in every composition.

Omission fails closed. A composition's prop types reject `filterBar`, `grouping`, `hierarchy`, `onCellCommit`, and `editResetKey` when the owning feature is absent. At render, the same props, or a column that declares an `editor`, throw an error naming the missing feature instead of being silently ignored. Without `filterBarFeature`, columns may still declare `filter` definitions; the app-owned `filter` prop, saved views, and URL state keep applying them, and only the toolbar filter UI is absent. Listing a feature twice throws.

Features are opaque values. Only Sheen's exported features are supported; their context contract is internal and may change between releases.
