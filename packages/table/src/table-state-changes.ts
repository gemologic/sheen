import { changeClientViewState } from "./client-state.ts";
import type { ClientStateChange } from "./client-state.ts";
import type { SortEntry, SortState } from "./sorting.ts";
import { parseTableState } from "./table-state.ts";
import type { ColumnState, TableState, TableStateSchema } from "./table-state.ts";

export type TableStateChange =
  | { readonly kind: "query"; readonly change: ClientStateChange }
  | { readonly kind: "sortCycle"; readonly column: string; readonly multiple: boolean }
  | { readonly kind: "columnOrder"; readonly ids: readonly string[] }
  | { readonly kind: "columnVisibility"; readonly column: string; readonly visible: boolean }
  | { readonly kind: "columnWidth"; readonly column: string; readonly width: number | null }
  | { readonly kind: "columnPin"; readonly column: string; readonly pin: ColumnState["pin"] };

/** Pure requested-state update. Apply accepted layout/query/results atomically in the table owner. */
export function changeTableState(value: TableState, change: TableStateChange, schema: TableStateSchema): TableState {
  const state = parseTableState(value, schema);
  const query = { search: state.search, filter: state.filter, sorting: state.sorting, pagination: state.pagination };
  switch (change.kind) {
    case "query": return parseTableState({ ...changeClientViewState(query, change.change, schema), columns: state.columns }, schema);
    case "sortCycle": {
      if (!schema.sortColumns.some(column => column.id === change.column)) throw new Error(`Column does not support sorting: ${change.column}`);
      const current = state.sorting.find(entry => entry.column === change.column);
      const next: SortEntry | null = current?.direction === "desc" ? null : { column: change.column, direction: current ? "desc" : "asc" };
      let sorting: SortState;
      if (!change.multiple) sorting = next ? [next] : [];
      else if (!current && next) sorting = [...state.sorting, next];
      else sorting = state.sorting.flatMap(entry => entry.column === change.column ? next ? [next] : [] : [entry]);
      return parseTableState({ ...changeClientViewState(query, { kind: "sorting", value: sorting }, schema), columns: state.columns }, schema);
    }
    case "columnOrder": {
      const columns = new Map(state.columns.map(column => [column.id, column]));
      return parseTableState({ ...state, columns: Array.from(change.ids, id => columns.get(id)) }, schema);
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
      return parseTableState({ ...state, columns }, schema);
    }
    default: throw new Error("Unknown table state change");
  }
}
