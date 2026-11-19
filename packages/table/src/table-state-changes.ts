import { changeQueryState } from "./client-state.ts";
import type { ClientStateChange, QueryState } from "./client-state.ts";
import { parseCursorPagination, parsePagination } from "./pagination.ts";
import type { CursorPagination, ServerPagination, TablePagination } from "./pagination.ts";
import type { SortEntry, SortState } from "./sorting.ts";
import { parseTableStateWith, schemaPagination } from "./table-state.ts";
import type { ColumnState, CursorTableStateSchema, TableState, TableStateSchema, TableStateSchemaFields } from "./table-state.ts";

export type TableStateChange<Pagination extends ServerPagination = TablePagination> =
  | { readonly kind: "query"; readonly change: ClientStateChange<Pagination> }
  | { readonly kind: "sortCycle"; readonly column: string; readonly multiple: boolean }
  | { readonly kind: "columnOrder"; readonly ids: readonly string[] }
  | { readonly kind: "columnVisibility"; readonly column: string; readonly visible: boolean }
  | { readonly kind: "columnWidth"; readonly column: string; readonly width: number | null }
  | { readonly kind: "columnPin"; readonly column: string; readonly pin: ColumnState["pin"] };

/** Pure requested-state update. Apply accepted layout/query/results atomically in the table owner. */
export function changeTableState(value: TableState<CursorPagination>, change: TableStateChange<CursorPagination>, schema: CursorTableStateSchema): TableState<CursorPagination>;
export function changeTableState(value: TableState, change: TableStateChange, schema: TableStateSchema): TableState;
export function changeTableState(value: TableState<ServerPagination>, change: TableStateChange<ServerPagination>, schema: TableStateSchema | CursorTableStateSchema): TableState<ServerPagination> {
  return schemaPagination(schema) === "cursor" ? changeTableStateWith(value, change, schema, parseCursorPagination) : changeTableStateWith(value, change, schema, parsePagination);
}

export function changeTableStateWith<Pagination extends ServerPagination>(value: TableState<Pagination>, change: TableStateChange<Pagination>, schema: TableStateSchemaFields, readPagination: (value: unknown) => Pagination): TableState<Pagination> {
  const parse = (next: unknown) => parseTableStateWith(next, schema, readPagination);
  const changeQuery = (query: QueryState<Pagination>, queryChange: ClientStateChange<Pagination>) => changeQueryState(query, queryChange, schema, readPagination);
  const state = parse(value);
  const query = { search: state.search, filter: state.filter, sorting: state.sorting, pagination: state.pagination };
  switch (change.kind) {
    case "query": return parse({ ...changeQuery(query, change.change), columns: state.columns });
    case "sortCycle": {
      if (!schema.sortColumns.some(column => column.id === change.column)) throw new Error(`Column does not support sorting: ${change.column}`);
      const current = state.sorting.find(entry => entry.column === change.column);
      const next: SortEntry | null = current?.direction === "desc" ? null : { column: change.column, direction: current ? "desc" : "asc" };
      let sorting: SortState;
      if (!change.multiple) sorting = next ? [next] : [];
      else if (!current && next) sorting = [...state.sorting, next];
      else sorting = state.sorting.flatMap(entry => entry.column === change.column ? next ? [next] : [] : [entry]);
      return parse({ ...changeQuery(query, { kind: "sorting", value: sorting }), columns: state.columns });
    }
    case "columnOrder": {
      const columns = new Map(state.columns.map(column => [column.id, column]));
      return parse({ ...state, columns: Array.from(change.ids, id => columns.get(id)) });
    }
    case "columnVisibility":
    case "columnWidth":
    case "columnPin": {
      if (!state.columns.some(column => column.id === change.column)) throw new Error(`Unknown table column: ${change.column}`);
      const columns = state.columns.map(column => {
        if (column.id !== change.column) return column;
        switch (change.kind) {
          case "columnVisibility": return { ...column, visible: change.visible };
          case "columnWidth": return { ...column, width: change.width };
          case "columnPin": return { ...column, pin: change.pin };
        }
      });
      return parse({ ...state, columns });
    }
    default: throw new Error("Unknown table state change");
  }
}
