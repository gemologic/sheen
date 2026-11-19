import { createComponent } from "solid-js";
import { createDataTable, defineColumns } from "@gemologic/sheen-table";
import "@gemologic/sheen-table/styles.css";

const rows = [{ id: "one", name: "Outside workspace" }];
const columns = defineColumns([
  { id: "name", header: "Name", accessor: row => row.name, width: "fill", sort: "text" },
]);
const LightDataTable = createDataTable([]);

export function ConsumerLightDataTable() {
  return createComponent(LightDataTable, {
    data: rows,
    columns,
    getRowId: row => row.id,
    caption: "Installed light DataTable",
    pagination: false,
  });
}
