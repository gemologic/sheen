import { createClientView } from "@gemologic/sheen-table/core";
import type { TableState, TableStateSchema } from "@gemologic/sheen-table/core";

export interface ConstrainedRow { readonly id: string; readonly name: string; readonly status: string; readonly sequence: number }
export const constrainedRows: readonly ConstrainedRow[] = ["Active", "Active", "Active", "Paused", "Review", "Active"].map((status, index) => ({ id: `record-${index + 1}`, name: `Record ${index + 1}`, status, sequence: index + 1 }));
export const constrainedSchema: TableStateSchema = {
  columns: ["name", "status", "sequence"],
  filterColumns: [{ id: "status", type: "enum", options: ["Active", "Paused", "Review"] }, { id: "sequence", type: "number" }],
  sortColumns: [{ id: "name", type: "text" }, { id: "status", type: "text" }, { id: "sequence", type: "number" }],
};
export const constrainedInitialState: TableState = {
  search: "", filter: { kind: "and", children: [] }, sorting: [], pagination: { pageIndex: 0, pageSize: 3 },
  columns: [{ id: "name", visible: true, width: null, pin: false }, { id: "status", visible: true, width: 140, pin: "end" }, { id: "sequence", visible: true, width: null, pin: false }],
};
export function constrainedView(state: TableState) {
  return createClientView(constrainedRows, state, {
    locale: "en-US", searchColumns: [], filterColumns: constrainedSchema.filterColumns, sortColumns: constrainedSchema.sortColumns,
    getValue: (row, column) => column === "name" ? row.name : column === "status" ? row.status : row.sequence,
  });
}
