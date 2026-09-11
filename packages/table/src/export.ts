export type ExportValue = string | number | boolean | null;
export interface ExportColumn<Row> {
  readonly id: string;
  readonly header: string;
  readonly visible?: boolean;
  readonly value: (row: Row) => ExportValue;
}

function checkedValue(value: unknown, row: number, column: string): ExportValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  throw new Error(`Invalid export value at row ${row}, column ${column}: expected string, finite number, boolean, or null`);
}
function csvCell(value: ExportValue): string {
  let text = value === null ? "" : String(value);
  if (typeof value === "string" && (/^[\s\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(text) || /^[\p{Cc}\p{Cf}]/u.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Snapshot selected rows from the complete client view and visible export columns before downloading. */
export function createClientExport<Row>(rows: readonly Row[], columns: readonly ExportColumn<Row>[]) {
  const ids = new Set<string>();
  const visible = Array.from(columns).filter(column => {
    if (!column) throw new Error("Invalid export column: missing entry");
    if (typeof column.id !== "string" || !column.id.trim() || ids.has(column.id)) throw new Error("Export column IDs must be unique nonempty strings");
    ids.add(column.id);
    if (typeof column.header !== "string" || typeof column.value !== "function" || (column.visible !== undefined && typeof column.visible !== "boolean")) throw new Error(`Invalid export column: ${column.id}`);
    return column.visible !== false;
  });
  if (visible.length === 0) throw new Error("Export requires at least one visible column");
  const headings = visible.map(column => column.header);
  const keys = Object.freeze(visible.map(column => column.id));
  const values = Array.from(rows, (row, index) => visible.map(column => checkedValue(column.value(row), index, column.id)));
  return Object.freeze({
    rowCount: values.length,
    columnIds: keys,
    toCSV: () => [headings.map(csvCell).join(","), ...values.map(row => row.map(csvCell).join(","))].join("\r\n") + "\r\n",
    toJSON: () => JSON.stringify(values.map(row => Object.fromEntries(keys.map((key, index) => [key, row[index]])))),
  });
}
