export const englishTableMessages = Object.freeze({
  loading: "Loading", refreshing: "Refreshing, showing existing results", noResults: "No results", retry: "Retry", retryFailed: "Retry failed. Try again.", serverError: "Something went wrong",
  searchTable: "Search {caption}", searchMatchMode: "Search match mode", searchRanked: "Smart", searchExact: "Exact", tableShortcuts: "Tables", tableControls: "{caption} table controls", resultCountOne: "{count} result", resultCount: "{count} results",
  previousResults: "Previous results", clearFilters: "Clear filters", clearSearchAndFilters: "Clear search and filters", selectAll: "Select all matching", selectPage: "Select this page", selectRow: "Select row {id}", clearSelection: "Clear selection", selectionActions: "Selection actions", selectedCount: "{count} selected",
  cardView: "{caption}, card view", rowActions: "Actions for row {id}",
  sort: "Sort", sortColumn: "Sort by {column}", sortedAscending: "ascending", sortedDescending: "descending", notSorted: "not sorted", sortPriority: "priority {position} of {count}",
  export: "Export", exportCSV: "Export CSV", exportJSON: "Export JSON", preparingExport: "Preparing export", exportFailed: "Export failed", retryExport: "Retry export", downloadLastExport: "Download last export",
  filters: "Filters", filterAdd: "+ Filter", filterColumns: "Filter columns", filterSearchColumns: "Search filter columns", filterEdit: "Edit filter", filterRemove: "Remove filter", filterApply: "Apply filter",
  filterOperator: "Operator", filterValue: "Value", filterMinimum: "Minimum", filterMaximum: "Maximum", filterDate: "Date", filterStartDate: "Start date", filterEndDate: "End date", filterValues: "Values",
  filterCaseSensitive: "Case sensitive", filterNegated: "Exclude matches", filterInheritedNegation: "This condition is also inside an excluded group.", filterInvalid: "Enter a valid filter value.",
  filterEquals: "is", filterContains: "contains", filterStartsWith: "starts with", filterEndsWith: "ends with", filterLessThan: "is less than", filterAtMost: "is at most", filterGreaterThan: "is greater than", filterAtLeast: "is at least", filterBetween: "is between", filterIsEmpty: "is empty", filterIsAnyOf: "is any of",
  filterSummary: "{column} {operator} {value}", filterNot: "Not: {filter}", filterInheritedNot: "Excluded group: {filter}",
  queryBuilder: "Query builder", queryGroup: "Query group", queryRule: "Query rule", queryMatch: "Match", queryMatchAll: "All rules", queryMatchAny: "Any rule",
  queryColumn: "Column", queryAddRule: "Add rule", queryAddGroup: "Add group", queryNegate: "Exclude", queryRemoveNegation: "Include", queryRemove: "Remove", queryMoveBefore: "Move before", queryMoveAfter: "Move after", queryChanged: "Query updated",
  groupMissing: "No value", loadingChildren: "Loading children",
  columns: "Columns", showColumn: "Show column", moveColumnStart: "Move toward start", moveColumnEnd: "Move toward end",
  pinColumn: "Pin column", pinNone: "Not pinned", pinStart: "Pin to start", pinEnd: "Pin to end",
  autoFitColumn: "Auto-fit width", resetColumnWidth: "Reset width", reorderColumn: "Drag to reorder {column}", resizeColumn: "Resize {column}", columnWidthPixels: "{width} pixels",
  editCell: "Edit {column} for row {id}", cellValueRequired: "A value is required", cellValueInvalid: "Enter a valid value", noValue: "No value",
  cellUpdateFailed: "Cell update failed", cellUpdateFailedDescription: "The committed value was restored and your draft was retained.", cellConflict: "This value changed on the server to {value}. Review your draft or press Escape to discard it.",
  expand: "Expand", collapse: "Collapse",
});

export type TableMessages = Readonly<Record<keyof typeof englishTableMessages, string>>;

/** Layer provider overrides over the table package's tree-shakeable English defaults. */
export function resolveTableMessages(messages: Partial<TableMessages>): TableMessages {
  return Object.freeze({ ...englishTableMessages, ...messages });
}
