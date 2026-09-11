import type { TableState, TableStateSchema } from "@gemologic/sheen-table";

export const exportSchema: TableStateSchema = {
  columns: ["name"],
  filterColumns: [{ id: "name", type: "text" }],
  sortColumns: [{ id: "name", type: "text" }],
};
export const exportState: TableState = {
  search: "Alpha", filter: { kind: "and", children: [] }, sorting: [],
  pagination: { pageIndex: 0, pageSize: 1 },
  columns: [{ id: "name", visible: true, width: null, pin: false }],
};
