---
"@gemologic/sheen-table": minor
---

Add `createDataTable(features)` for lighter DataTable bundles. Compose only the features a table needs from `filterBarFeature`, `groupingFeature`, `hierarchyFeature`, and `cellEditingFeature`; `createDataTable([])` is about 83 KB gzip with its static imports versus about 111 KB for `DataTable`. Props owned by an omitted feature (`filterBar`, `grouping`, `hierarchy`, `onCellCommit`, `editResetKey`, and editor columns) are rejected by the composition's types and throw at render. `DataTable` is unchanged and still includes every feature.
