import { DataTable } from "./DataTable.tsx";
import type { ClientDataTableProps, ServerDataTableProps } from "./DataTable.tsx";
import metadata from "./DataTable.meta.ts";

interface DemoRow { readonly id: string; readonly name: string }

export const controls = metadata.props;
export default function DataTableDemo(props: ClientDataTableProps<DemoRow> | ServerDataTableProps<DemoRow>) {
  return props.mode === "server" ? <DataTable {...props} /> : <DataTable {...props} />;
}
