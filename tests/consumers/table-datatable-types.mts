import { DataTable, createDataTable, defineColumns, filterBarFeature, groupingFeature } from "@gemologic/sheen-table";
import type { ClientDataTableProps, CursorPagination, DataTableCursorResult, DataTableResult, ServerDataTableProps, TableState } from "@gemologic/sheen-table";

interface Row {
  readonly id: string;
  readonly name: string;
}

const rows: readonly Row[] = [{ id: "one", name: "One" }];
const columns = defineColumns<Row>([{ id: "name", header: "Name", accessor: row => row.name }]);
const client = { data: rows, columns, getRowId: (row: Row) => row.id, caption: "Client", pagination: false } satisfies ClientDataTableProps<Row>;
const request = async (): Promise<DataTableResult<Row>> => ({ rows, total: rows.length });
const server = { mode: "server", pagination: { pageIndex: 0, pageSize: 20 }, columns, getRowId: (row: Row) => row.id, caption: "Server", onStateChange: request } satisfies ServerDataTableProps<Row>;

const cursorRequest = async (state: TableState<CursorPagination>): Promise<DataTableCursorResult<Row>> => ({ rows, nextCursor: state.pagination.cursor?.value ?? null, previousCursor: null });
const cursor = { mode: "server", pagination: { kind: "cursor", pageSize: 20, cursor: null }, columns, getRowId: (row: Row) => row.id, caption: "Cursor", onStateChange: cursorRequest } satisfies ServerDataTableProps<Row, CursorPagination>;

export const validConsumers = [() => DataTable(client), () => DataTable(server), () => DataTable(cursor)];
export const inferredNumbered = () => DataTable({ mode: "server", pagination: { pageIndex: 0, pageSize: 20 }, columns, getRowId: row => row.id, caption: "Numbered",
  onStateChange: async state => ({ rows, total: state.pagination === false ? rows.length : state.pagination.pageIndex + rows.length }) });
export const inferredCursor = () => DataTable({ mode: "server", pagination: { kind: "cursor", pageSize: 20, cursor: null }, columns, getRowId: row => row.id, caption: "Cursor",
  onStateChange: async state => ({ rows, nextCursor: state.pagination.cursor?.direction === "after" ? null : "next", previousCursor: null, total: { kind: "atLeast", value: 1000 } }) });
// @ts-expect-error Cursor pagination requires cursor results rather than a numbered total.
export const cursorWithNumberedResult = () => DataTable({ mode: "server", pagination: { kind: "cursor", pageSize: 20, cursor: null }, columns, getRowId: (row: Row) => row.id, caption: "Invalid", onStateChange: request });
// @ts-expect-error Server ownership requires an explicit pagination choice.
export const missingServerPagination = () => DataTable({ mode: "server", columns, getRowId: (row: Row) => row.id, caption: "Invalid", onStateChange: request });
// @ts-expect-error Client ownership requires a complete data array.
export const missingClientData = () => DataTable({ columns, getRowId: (row: Row) => row.id, caption: "Invalid" });
// @ts-expect-error Client ownership cannot provide a server request callback.
export const mixedOwnership = () => DataTable({ data: rows, columns, getRowId: (row: Row) => row.id, caption: "Invalid", onStateChange: request });

const LightTable = createDataTable([]);
const GroupedTable = createDataTable([groupingFeature, filterBarFeature]);
export const composedConsumers = [() => LightTable(client), () => LightTable(cursor), () => GroupedTable({ ...client, grouping: { by: "name" }, filterBar: true })];
// @ts-expect-error A composition without groupingFeature rejects the grouping prop.
export const missingGrouping = () => LightTable({ ...client, grouping: { by: "name" } });
// @ts-expect-error A composition without cellEditingFeature rejects its editing props.
export const missingCellEditing = () => GroupedTable({ ...client, editResetKey: 1 });
