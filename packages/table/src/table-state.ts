import { parseClientViewState } from "./client-state.ts";
import type { ClientStateSchema } from "./client-state.ts";
import type { ClientViewState } from "./client-view.ts";

export interface ColumnState {
  readonly id: string;
  readonly visible: boolean;
  /** Explicit resized width in CSS pixels; null uses the column definition's sizing policy. */
  readonly width: number | null;
  readonly pin: "start" | "end" | false;
}
export interface TableState extends ClientViewState {
  /** Array order is the user-defined column order. Every available column occurs once. */
  readonly columns: readonly ColumnState[];
}
export interface TableStateSchema extends ClientStateSchema {
  readonly columns: readonly string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, fields: readonly string[], path: string) {
  for (const key of Object.keys(value)) if (!fields.includes(key)) throw new Error(`Invalid table state at ${path}: unknown field ${key}`);
  for (const key of fields) if (!Object.hasOwn(value, key)) throw new Error(`Invalid table state at ${path}: missing ${key}`);
}

/** Strictly validate before applying saved/URL state, never partially restore it. */
export function parseTableState(value: unknown, schema: TableStateSchema): TableState {
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
  const query = parseClientViewState({ search: value.search, filter: value.filter, sorting: value.sorting, pagination: value.pagination }, schema);
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

export function serializeState(state: TableState, schema: TableStateSchema): string {
  const serialized = JSON.stringify({ version: 1, state: parseTableState(state, schema) });
  if (serialized.length > 262144) throw new Error("Serialized table state exceeds 262144 characters");
  return serialized;
}

export function deserializeState(serialized: string, schema: TableStateSchema): TableState {
  if (serialized.length > 262144) throw new Error("Serialized table state exceeds 262144 characters");
  let envelope: unknown;
  try { envelope = JSON.parse(serialized); }
  catch { throw new Error("Invalid table state JSON"); }
  if (!record(envelope)) throw new Error("Invalid table state envelope");
  exact(envelope, ["version", "state"], "$");
  if (envelope.version !== 1) throw new Error("Unsupported table state version");
  return parseTableState(envelope.state, schema);
}
