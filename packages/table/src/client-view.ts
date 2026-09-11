import { countClientFacets } from "./facets.ts";
import type { ColumnFacet } from "./facets.ts";
import { filterClientRows } from "./filter-client.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { paginateClientRows, parsePagination } from "./pagination.ts";
import type { TablePagination } from "./pagination.ts";
import { searchClientRowValues } from "./search.ts";
import { sortClientRows } from "./sorting.ts";
import { removeFilterColumnConditions } from "./filter-bar-state.ts";
import type { SortColumn, SortState } from "./sorting.ts";

export interface ClientViewState {
  readonly search: string;
  readonly filter: FilterNode;
  readonly sorting: SortState;
  readonly pagination: TablePagination;
}
export interface ClientViewOptions<Row> {
  readonly locale: string;
  readonly searchColumns: readonly string[];
  /** Enables the leading-apostrophe exact-match syntax for global search. */
  readonly exactMatch?: boolean;
  readonly filterColumns: readonly FilterColumn[];
  readonly sortColumns: readonly SortColumn[];
  readonly getValue: (row: Row, column: string) => unknown;
  /** Optional search-only projection. Filters and sorting continue to use getValue. */
  readonly getSearchValue?: (row: Row, column: string) => unknown;
}
export interface ClientView<Row> {
  /** Complete transformed view for export and continuous rendering, never just a page. */
  readonly view: readonly Row[];
  readonly rows: readonly Row[];
  readonly total: number;
  readonly pagination: TablePagination;
  readonly facets: readonly ColumnFacet[];
}

/** Search -> filter -> facets -> explicit sort -> page. No network, cache, or state mutation. */
export function createClientView<Row>(rows: readonly Row[], state: ClientViewState, options: ClientViewOptions<Row>): ClientView<Row> {
  const pagination = parsePagination(state.pagination);
  const searched = searchClientRowValues(rows, state.search, {
    locale: options.locale,
    columns: options.searchColumns,
    getValue: options.getSearchValue ?? options.getValue,
    exactMatch: options.exactMatch ?? false,
  });
  const filtered = filterClientRows(searched, state.filter, options.filterColumns, options);
  const facetGroups = new Map<FilterNode, FilterColumn[]>();
  for (const column of options.filterColumns) {
    if (column.type !== "enum") continue;
    const filter = removeFilterColumnConditions(state.filter, column.id);
    const columns = facetGroups.get(filter);
    if (columns) columns.push(column);
    else facetGroups.set(filter, [column]);
  }
  const facets = Object.freeze([...facetGroups].flatMap(([filter, columns]) =>
    countClientFacets(filterClientRows(searched, filter, options.filterColumns, options), columns, options)));
  const view = sortClientRows(filtered, state.sorting, options.sortColumns, options);
  const page = paginateClientRows(view, pagination);
  return { view, rows: page.rows, total: page.total, pagination: page.pagination, facets };
}
