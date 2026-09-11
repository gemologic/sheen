import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { ClientDataTableProps, DataTableResult, ServerDataTableProps } from "@gemologic/sheen-table";

interface Row {
  readonly id: string;
  readonly name: string;
}

const rows: readonly Row[] = [{ id: "one", name: "One" }];
const columns = defineColumns<Row>([{ id: "name", header: "Name", accessor: row => row.name }]);
const client = { data: rows, columns, getRowId: (row: Row) => row.id, caption: "Client", pagination: false } satisfies ClientDataTableProps<Row>;
const request = async (): Promise<DataTableResult<Row>> => ({ rows, total: rows.length });
const server = { mode: "server", pagination: { pageIndex: 0, pageSize: 20 }, columns, getRowId: (row: Row) => row.id, caption: "Server", onStateChange: request } satisfies ServerDataTableProps<Row>;

export const validConsumers = [() => DataTable(client), () => DataTable(server)];
// @ts-expect-error Server ownership requires an explicit pagination choice.
export const missingServerPagination = () => DataTable({ mode: "server", columns, getRowId: (row: Row) => row.id, caption: "Invalid", onStateChange: request });
// @ts-expect-error Client ownership requires a complete data array.
export const missingClientData = () => DataTable({ columns, getRowId: (row: Row) => row.id, caption: "Invalid" });
// @ts-expect-error Client ownership cannot provide a server request callback.
export const mixedOwnership = () => DataTable({ data: rows, columns, getRowId: (row: Row) => row.id, caption: "Invalid", onStateChange: request });
