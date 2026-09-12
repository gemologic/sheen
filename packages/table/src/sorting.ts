export interface SortColumn {
  readonly id: string;
  readonly type: "text" | "number" | "date";
}
export interface SortEntry {
  readonly column: string;
  readonly direction: "asc" | "desc";
}
export type SortState = readonly SortEntry[];
export interface SortEvaluation<Row> {
  readonly locale: string;
  readonly getValue: (row: Row, column: string) => unknown;
}

/** Validate URL/app state without exposing an upstream table state shape. */
export function parseSorting(value: unknown, columns: readonly SortColumn[]): SortState {
  const ids = new Set<string>();
  for (const column of columns) {
    if (typeof column.id !== "string" || !column.id.trim() || ids.has(column.id)) throw new Error("Invalid or duplicate sort column");
    if (column.type !== "text" && column.type !== "number" && column.type !== "date") throw new Error(`Invalid sort type for ${column.id}`);
    ids.add(column.id);
  }
  if (!Array.isArray(value) || value.length > ids.size) throw new Error("Invalid sorting: expected at most one entry per column");
  const used = new Set<string>();
  return Object.freeze(Array.from(value, (entry: unknown, index): SortEntry => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) throw new Error(`Invalid sorting at [${index}]: expected an entry`);
    if (Object.keys(entry).some(key => key !== "column" && key !== "direction")) throw new Error(`Invalid sorting at [${index}]: unknown field`);
    if (!("column" in entry) || typeof entry.column !== "string" || !ids.has(entry.column) || used.has(entry.column)) throw new Error(`Invalid sorting at [${index}]: unknown or duplicate column`);
    if (!("direction" in entry) || (entry.direction !== "asc" && entry.direction !== "desc")) throw new Error(`Invalid sorting at [${index}]: expected asc or desc`);
    used.add(entry.column);
    return Object.freeze({ column: entry.column, direction: entry.direction });
  }));
}

/** Sort the complete filtered view before pagination, retaining row identity and stable ties. */
export function sortClientRows<Row>(rows: readonly Row[], sorting: SortState, columns: readonly SortColumn[], options: SortEvaluation<Row>): readonly Row[] {
  const state = parseSorting(sorting, columns);
  const locale = Intl.getCanonicalLocales(options.locale)[0];
  if (!locale) throw new Error("Sorting requires an explicit locale");
  if (Intl.Collator.supportedLocalesOf([locale]).length === 0) throw new Error(`Unsupported sort locale: ${locale}`);
  if (state.length === 0) return rows;
  const compareText = new Intl.Collator(locale, { usage: "sort", sensitivity: "variant", numeric: true }).compare;
  const schema = new Map(columns.map(column => [column.id, column.type]));
  const keys = state.map(entry => ({ ...entry, type: schema.get(entry.column) }));
  const decorated = rows.map((row, index) => ({ row, index, values: keys.map(key => {
    const value = options.getValue(row, key.column);
    if (key.type === "text") return typeof value === "string" && value !== "" ? value.normalize("NFC") : null;
    return typeof value === "number" && Number.isFinite(value) && (key.type !== "date" || Math.abs(value) <= 8.64e15) ? value : null;
  }) }));
  decorated.sort((a, b) => {
    for (let index = 0; index < keys.length; index++) {
      const left = a.values[index];
      const right = b.values[index];
      if (left === right) continue;
      if (left === null || left === undefined) { if (right !== null && right !== undefined) return 1; continue; }
      if (right === null || right === undefined) return -1;
      const order = typeof left === "string" && typeof right === "string" ? compareText(left, right) : left < right ? -1 : left > right ? 1 : 0;
      if (order !== 0) return keys[index]?.direction === "desc" ? -order : order;
    }
    return a.index - b.index;
  });
  return decorated.map(entry => entry.row);
}
