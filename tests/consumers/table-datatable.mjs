import { createComponent } from "solid-js";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import "@gemologic/sheen-table/styles.css";

const rows = [{ id: "one", name: "Outside workspace" }];
const columns = defineColumns([
  { id: "name", header: "Name", accessor: row => row.name, width: "fill", sort: "text" },
]);

export function ConsumerDataTable() {
  return createComponent(DataTable, {
    data: rows,
    columns,
    getRowId: row => row.id,
    caption: "Installed DataTable",
    pagination: false,
  });
}
