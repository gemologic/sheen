import { parseQueryState } from "./client-state.ts";
import type { ClientStateSchema, QueryState } from "./client-state.ts";
import { parseCursorPagination, parsePagination } from "./pagination.ts";
import type { CursorPagination, ServerPagination, TablePagination } from "./pagination.ts";

export interface ColumnState {
  readonly id: string;
  readonly visible: boolean;
  /** Explicit resized width in CSS pixels; null uses the column definition's sizing policy. */
  readonly width: number | null;
  readonly pin: "start" | "end" | false;
}
export interface TableState<Pagination extends ServerPagination = TablePagination> extends QueryState<Pagination> {
  /** Array order is the user-defined column order. Every available column occurs once. */
  readonly columns: readonly ColumnState[];
}
/** Shared column and query fields; internal pagination-generic owners accept it. */
export interface TableStateSchemaFields extends ClientStateSchema {
  readonly columns: readonly string[];
}
/** Schema for complete or numbered pagination state. */
export interface TableStateSchema extends TableStateSchemaFields {
  readonly pagination?: never;
}
/** Schema for cursor pagination state. Persisted envelopes always store `cursor: null` because cursor tokens are short-lived. */
export interface CursorTableStateSchema extends TableStateSchemaFields {
  readonly pagination: "cursor";
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, fields: readonly string[], path: string) {
  for (const key of Object.keys(value)) if (!fields.includes(key)) throw new Error(`Invalid table state at ${path}: unknown field ${key}`);
  for (const key of fields) if (!Object.hasOwn(value, key)) throw new Error(`Invalid table state at ${path}: missing ${key}`);
}

/** Cursor schemas read only cursor state; other schemas read complete or numbered state. Unknown schema kinds fail closed. */
export function schemaPagination(schema: TableStateSchema | CursorTableStateSchema): "cursor" | "page" {
  const kind: unknown = schema.pagination;
  if (kind === undefined) return "page";
  if (kind === "cursor") return kind;
  throw new Error("Table state schema pagination must be omitted or cursor");
}

/** Persisted cursor state is always the first page; a stored live token fails closed. */
function parsePersistedCursor(value: unknown): CursorPagination {
  const pagination = parseCursorPagination(value);
  if (pagination.cursor !== null) throw new Error("Persisted cursor pagination must use cursor: null");
  return pagination;
}

/** Strictly validate before applying saved/URL state, never partially restore it. */
export function parseTableState(value: unknown, schema: CursorTableStateSchema): TableState<CursorPagination>;
export function parseTableState(value: unknown, schema: TableStateSchema): TableState;
export function parseTableState(value: unknown, schema: TableStateSchema | CursorTableStateSchema): TableState<ServerPagination> {
  return schemaPagination(schema) === "cursor" ? parseTableStateWith(value, schema, parseCursorPagination) : parseTableStateWith(value, schema, parsePagination);
}

export function parseTableStateWith<Pagination extends ServerPagination>(value: unknown, schema: TableStateSchemaFields, readPagination: (value: unknown) => Pagination): TableState<Pagination> {
  const available = new Set<string>();
  for (const id of schema.columns) {
    if (typeof id !== "string" || !id.trim() || available.has(id)) throw new Error("Invalid or duplicate table schema column");
    available.add(id);
  }
  for (const column of [...schema.filterColumns, ...schema.sortColumns]) {
    if (!available.has(column.id)) throw new Error(`Query schema references unavailable table column: ${column.id}`);
  }
  if (!record(value)) throw new Error("Invalid table state: expected an object");
  exact(value, ["search", "filter", "sorting", "pagination", "columns"], "$");
  const query = parseQueryState({ search: value.search, filter: value.filter, sorting: value.sorting, pagination: value.pagination }, schema, readPagination);
  if (!Array.isArray(value.columns) || value.columns.length !== available.size) throw new Error("Invalid table state: expected one state entry per available column");
  const seen = new Set<string>();
  const columns = Array.from(value.columns, (entry: unknown, index): ColumnState => {
    const path = `$.columns[${index}]`;
    if (!record(entry)) throw new Error(`Invalid table state at ${path}: expected a column object`);
    exact(entry, ["id", "visible", "width", "pin"], path);
    if (typeof entry.id !== "string" || !available.has(entry.id) || seen.has(entry.id)) throw new Error(`Invalid table state at ${path}: unknown or duplicate column`);
    seen.add(entry.id);
    if (typeof entry.visible !== "boolean") throw new Error(`Invalid table state at ${path}: visible must be boolean`);
    if (entry.width !== null && (typeof entry.width !== "number" || !Number.isFinite(entry.width) || entry.width <= 0)) throw new Error(`Invalid table state at ${path}: width must be null or a positive finite pixel value`);
    if (entry.pin !== false && entry.pin !== "start" && entry.pin !== "end") throw new Error(`Invalid table state at ${path}: pin must be false, start, or end`);
    return Object.freeze({ id: entry.id, visible: entry.visible, width: entry.width, pin: entry.pin });
  });
  return Object.freeze({ ...query, columns: Object.freeze(columns) });
}

function toEnvelope(state: TableState<ServerPagination>): string {
  const serialized = JSON.stringify({ version: 1, state });
  if (serialized.length > 262144) throw new Error("Serialized table state exceeds 262144 characters");
  return serialized;
}

/** Cursor state is persisted as its first page: the live cursor token is replaced with null. */
export function serializeState(state: TableState<CursorPagination>, schema: CursorTableStateSchema): string;
export function serializeState(state: TableState, schema: TableStateSchema): string;
export function serializeState(state: TableState<ServerPagination>, schema: TableStateSchema | CursorTableStateSchema): string {
  if (schemaPagination(schema) === "page") return toEnvelope(parseTableStateWith(state, schema, parsePagination));
  const parsed = parseTableStateWith(state, schema, parseCursorPagination);
  return toEnvelope(parseTableStateWith({ ...parsed, pagination: { ...parsed.pagination, cursor: null } }, schema, parsePersistedCursor));
}

export function deserializeState(serialized: string, schema: CursorTableStateSchema): TableState<CursorPagination>;
export function deserializeState(serialized: string, schema: TableStateSchema): TableState;
export function deserializeState(serialized: string, schema: TableStateSchema | CursorTableStateSchema): TableState<ServerPagination> {
  if (serialized.length > 262144) throw new Error("Serialized table state exceeds 262144 characters");
  let envelope: unknown;
  try { envelope = JSON.parse(serialized); }
  catch { throw new Error("Invalid table state JSON"); }
  if (!record(envelope)) throw new Error("Invalid table state envelope");
  exact(envelope, ["version", "state"], "$");
  if (envelope.version !== 1) throw new Error("Unsupported table state version");
  return schemaPagination(schema) === "cursor" ? parseTableStateWith(envelope.state, schema, parsePersistedCursor) : parseTableStateWith(envelope.state, schema, parsePagination);
}
