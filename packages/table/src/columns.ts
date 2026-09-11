import type { FilterColumn } from "./filter.ts";
import type { SortColumn } from "./sorting.ts";
import type { TableStateSchema } from "./table-state.ts";
import type { JSX } from "solid-js";

export type ColumnValue = string | number | boolean | null;
export type ColumnPin = "start" | "end" | false;
export type ColumnAlign = "start" | "center" | "end";
export type ColumnWidth = number | "fill" | "content";
export type ColumnAggregate = "sum" | "average" | "min" | "max" | "count";
export type ColumnSort = SortColumn["type"] | false;
export type ColumnSearchProjection<Row extends object> = (row: Row) => string | number | null;
interface ColumnEditorBase<Row extends object> {
  readonly nullable?: boolean;
  readonly validate?: (value: ColumnValue, row: Row) => string | null;
}
export type ColumnEditor<Row extends object> =
  | (ColumnEditorBase<Row> & { readonly type: "text" | "number" | "boolean" })
  | (ColumnEditorBase<Row> & { readonly type: "select"; readonly options: readonly string[] });
export type ColumnFilter =
  | { readonly type: "text" }
  | { readonly type: "number" }
  | { readonly type: "date" }
  | { readonly type: "enum"; readonly options: readonly string[]; readonly faceted?: boolean };
export interface UnsafeTanStackColumnOptions { readonly [option: string]: unknown }

interface ColumnBase<Row extends object> {
  readonly id: string;
  readonly header: string;
  readonly footer?: string | ((rows: readonly Row[]) => JSX.Element);
  readonly width?: ColumnWidth;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly align?: ColumnAlign;
  readonly numeric?: boolean;
  readonly pin?: ColumnPin;
  readonly visible?: boolean;
  readonly __unsafe_tanstack?: UnsafeTanStackColumnOptions;
}
export interface SheenAccessorColumn<Row extends object> extends ColumnBase<Row> {
  readonly accessor: (row: Row) => ColumnValue;
  readonly cell?: (value: ColumnValue, row: Row) => JSX.Element;
  /** Search the accessor value, or return a dedicated searchable text/number projection. */
  readonly search?: true | ColumnSearchProjection<Row>;
  /** Sensitive columns cannot participate in global search. */
  readonly sensitive?: boolean;
  readonly editor?: ColumnEditor<Row>;
  readonly filter?: ColumnFilter;
  /** Omit to infer number/date from filter or numeric, otherwise text. */
  readonly sort?: ColumnSort;
  readonly aggregate?: ColumnAggregate;
}
export interface SheenDisplayColumn<Row extends object> extends ColumnBase<Row> {
  readonly accessor?: never;
  /** Display columns receive null because they have no accessor value. */
  readonly cell: (value: ColumnValue, row: Row) => JSX.Element;
  readonly search?: never;
  readonly sensitive?: never;
  readonly filter?: never;
  readonly sort?: never;
  readonly aggregate?: never;
  readonly editor?: never;
}
export type SheenColumnInput<Row extends object> = SheenAccessorColumn<Row> | SheenDisplayColumn<Row>;

interface ResolvedColumn<Row extends object> {
  readonly id: string;
  readonly header: string;
  readonly accessor: ((row: Row) => ColumnValue) | null;
  readonly cell: ((value: ColumnValue, row: Row) => JSX.Element) | null;
  readonly footer: string | ((rows: readonly Row[]) => JSX.Element) | null;
  readonly width: ColumnWidth;
  readonly minWidth: number | null;
  readonly maxWidth: number | null;
  readonly align: ColumnAlign;
  readonly numeric: boolean;
  readonly pin: ColumnPin;
  readonly visible: boolean;
  readonly search: ColumnSearchProjection<Row> | null;
  readonly sensitive: boolean;
  readonly editor: ColumnEditor<Row> | null;
  readonly filter: FilterColumn | null;
  readonly faceted: boolean;
  readonly sort: SortColumn | null;
  readonly aggregate: ColumnAggregate | null;
  readonly unsafeTanStack: UnsafeTanStackColumnOptions | null;
}

const columnsBrand: unique symbol = Symbol("sheen-columns");
const inspectColumns: unique symbol = Symbol("inspect-sheen-columns");
export interface SheenColumns<Row extends object> {
  readonly [columnsBrand]: Row;
  readonly [inspectColumns]: () => readonly ResolvedColumn<Row>[];
}

class DefinedColumns<Row extends object> implements SheenColumns<Row> {
  declare readonly [columnsBrand]: Row;
  readonly #definitions: readonly ResolvedColumn<Row>[];
  constructor(definitions: readonly ResolvedColumn<Row>[]) {
    this.#definitions = definitions;
    Object.freeze(this);
  }
  [inspectColumns](): readonly ResolvedColumn<Row>[] { return this.#definitions; }
}

const baseKeys = new Set(["id", "header", "accessor", "cell", "footer", "width", "minWidth", "maxWidth", "align", "numeric", "pin", "visible", "search", "sensitive", "editor", "filter", "sort", "aggregate", "__unsafe_tanstack"]);
function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error(`${label} must be a plain object`);
}
function exact(value: Record<string, unknown>, allowed: ReadonlySet<string>, label: string): void {
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${label} has unknown field ${key}`);
}
function dimension(value: unknown, label: string): number | null {
  if (value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive finite number`);
  return value;
}
function resolveFilter(value: unknown, id: string, label: string): FilterColumn | null {
  if (value === undefined) return null;
  assertRecord(value, label);
  const input = value;
  if (input.type === "text" || input.type === "number" || input.type === "date") {
    exact(input, new Set(["type"]), label);
    return Object.freeze({ id, type: input.type });
  }
  if (input.type !== "enum") throw new Error(`${label}.type is invalid`);
  exact(input, new Set(["type", "options", "faceted"]), label);
  if (!Array.isArray(input.options) || input.options.length === 0) throw new Error(`${label}.options must be a nonempty array`);
  const options = new Set<string>();
  for (const option of input.options) {
    if (typeof option !== "string" || !option || options.has(option)) throw new Error(`${label}.options must contain unique nonempty strings`);
    options.add(option);
  }
  if (input.faceted !== undefined && typeof input.faceted !== "boolean") throw new Error(`${label}.faceted must be boolean`);
  return Object.freeze({ id, type: "enum", options: Object.freeze([...options]) });
}
function resolveSort(value: unknown, accessor: boolean, filter: FilterColumn | null, numeric: boolean, id: string, label: string): SortColumn | null {
  if (!accessor || value === false) return null;
  if (value !== undefined && value !== "text" && value !== "number" && value !== "date") throw new Error(`${label} is invalid`);
  const type = value ?? (filter?.type === "number" || filter?.type === "date" ? filter.type : numeric ? "number" : "text");
  return Object.freeze({ id, type });
}
function isFacetedFilter(value: unknown, label: string): boolean {
  if (value === undefined) return false;
  assertRecord(value, label);
  return value.type === "enum" && value.faceted === true;
}
function resolveEditor<Row extends object>(value: ColumnEditor<Row> | undefined, accessor: boolean, label: string): ColumnEditor<Row> | null {
  if (value === undefined) return null;
  if (!accessor) throw new Error(`${label} requires an accessor column`);
  assertRecord(value, label);
  if (value.type !== "text" && value.type !== "number" && value.type !== "boolean" && value.type !== "select") throw new Error(`${label}.type is invalid`);
  exact(value, new Set(value.type === "select" ? ["type", "options", "nullable", "validate"] : ["type", "nullable", "validate"]), label);
  if (value.nullable !== undefined && typeof value.nullable !== "boolean") throw new Error(`${label}.nullable must be boolean`);
  if (value.type === "boolean" && value.nullable === true) throw new Error(`${label}.boolean editors cannot be nullable`);
  if (value.validate !== undefined && typeof value.validate !== "function") throw new Error(`${label}.validate must be a function`);
  if (value.type !== "select") return Object.freeze({ type: value.type, nullable: value.nullable ?? false, ...(value.validate ? { validate: value.validate } : {}) });
  if (!Array.isArray(value.options) || value.options.length === 0) throw new Error(`${label}.options must be a nonempty array`);
  const options = new Set<string>();
  for (const option of value.options) {
    if (typeof option !== "string" || !option || options.has(option)) throw new Error(`${label}.options must contain unique nonempty strings`);
    options.add(option);
  }
  return Object.freeze({ type: "select", options: Object.freeze([...options]), nullable: value.nullable ?? false, ...(value.validate ? { validate: value.validate } : {}) });
}
function checkedAccessor<Row extends object>(accessor: ((row: Row) => ColumnValue) | null, label: string): ((row: Row) => ColumnValue) | null {
  if (accessor === null) return null;
  return row => {
    const value: unknown = accessor(row);
    if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`${label} returned an unsupported value`);
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${label} returned a nonfinite number`);
    return value;
  };
}
function resolveSearch<Row extends object>(value: true | ColumnSearchProjection<Row> | undefined, accessor: ((row: Row) => ColumnValue) | null, visible: boolean, sensitive: boolean, label: string): ColumnSearchProjection<Row> | null {
  if (value === undefined) return null;
  if (accessor === null) throw new Error(`${label} requires an accessor column`);
  if (!visible) throw new Error(`${label} cannot target an initially hidden column`);
  if (sensitive) throw new Error(`${label} cannot target a sensitive column`);
  if (value !== true && typeof value !== "function") throw new Error(`${label} must be true or a projection function`);
  const project = value === true ? accessor : value;
  return row => {
    const projected: unknown = project(row);
    if (projected === null || typeof projected === "string") return projected;
    if (typeof projected === "number" && Number.isFinite(projected)) return projected;
    if (value === true && typeof projected === "boolean") return null;
    throw new Error(`${label} returned an unsupported search value`);
  };
}
function columnFunctions<Row extends object>(value: SheenColumnInput<Row>): Pick<ResolvedColumn<Row>, "accessor" | "cell" | "footer"> {
  return { accessor: value.accessor ?? null, cell: value.cell ?? null, footer: value.footer ?? null };
}

/** Validate and seal app definitions behind a non-enumerable type/runtime boundary. */
export function defineColumns<Row extends object>(values: readonly SheenColumnInput<Row>[]): SheenColumns<Row> {
  if (!Array.isArray(values) || values.length === 0) throw new Error("defineColumns requires at least one column");
  const ids = new Set<string>();
  const definitions: ResolvedColumn<Row>[] = [];
  let index = 0;
  for (const value of values) {
    const label = `columns[${index}]`;
    const typedValue: SheenColumnInput<Row> = value;
    assertRecord(value, label);
    const input = value;
    const functions = columnFunctions(typedValue);
    exact(input, baseKeys, label);
    if (typeof input.id !== "string" || !input.id || input.id.trim() !== input.id || ids.has(input.id)) throw new Error(`${label}.id must be a unique nonempty trimmed string`);
    ids.add(input.id);
    if (typeof input.header !== "string" || !input.header.trim()) throw new Error(`${label}.header must be a nonempty string`);
    const sourceAccessor = functions.accessor;
    if (sourceAccessor !== null && typeof sourceAccessor !== "function") throw new Error(`${label}.accessor must be a function`);
    const accessor = checkedAccessor(sourceAccessor, `${label}.accessor`);
    const cell = functions.cell;
    if (cell !== null && typeof cell !== "function") throw new Error(`${label}.cell must be a function`);
    if (accessor === null && cell === null) throw new Error(`${label} must define an accessor or display cell`);
    if (accessor === null && (input.filter !== undefined || input.sort !== undefined || input.aggregate !== undefined || input.search !== undefined)) throw new Error(`${label} display columns cannot search, filter, sort, or aggregate`);
    if (input.footer !== undefined && typeof input.footer !== "string" && typeof input.footer !== "function") throw new Error(`${label}.footer must be a string or function`);
    const minWidth = dimension(input.minWidth, `${label}.minWidth`);
    const maxWidth = dimension(input.maxWidth, `${label}.maxWidth`);
    if (minWidth !== null && maxWidth !== null && minWidth > maxWidth) throw new Error(`${label}.minWidth cannot exceed maxWidth`);
    const width = input.width ?? "fill";
    if (width !== "fill" && width !== "content" && (typeof width !== "number" || !Number.isFinite(width) || width <= 0)) throw new Error(`${label}.width is invalid`);
    if (typeof width === "number" && ((minWidth !== null && width < minWidth) || (maxWidth !== null && width > maxWidth))) throw new Error(`${label}.width must be within its bounds`);
    if (input.numeric !== undefined && typeof input.numeric !== "boolean") throw new Error(`${label}.numeric must be boolean`);
    const numeric = input.numeric ?? false;
    const align = input.align ?? (numeric ? "end" : "start");
    if (align !== "start" && align !== "center" && align !== "end") throw new Error(`${label}.align is invalid`);
    const pin = input.pin ?? false;
    if (pin !== false && pin !== "start" && pin !== "end") throw new Error(`${label}.pin is invalid`);
    if (pin !== false && typeof width !== "number") throw new Error(`${label}.width must be numeric when initially pinned`);
    if (input.visible !== undefined && typeof input.visible !== "boolean") throw new Error(`${label}.visible must be boolean`);
    if (input.sensitive !== undefined && typeof input.sensitive !== "boolean") throw new Error(`${label}.sensitive must be boolean`);
    const visible = input.visible ?? true;
    const sensitive = input.sensitive ?? false;
    const search = resolveSearch(typedValue.search, accessor, visible, sensitive, `${label}.search`);
    const editor = resolveEditor(typedValue.editor, accessor !== null, `${label}.editor`);
    const filter = resolveFilter(input.filter, input.id, `${label}.filter`);
    const faceted = isFacetedFilter(input.filter, `${label}.filter`);
    const sort = resolveSort(input.sort, accessor !== null, filter, numeric, input.id, `${label}.sort`);
    const aggregate = input.aggregate ?? null;
    if (aggregate !== null && aggregate !== "sum" && aggregate !== "average" && aggregate !== "min" && aggregate !== "max" && aggregate !== "count") throw new Error(`${label}.aggregate is invalid`);
    if (aggregate !== null && aggregate !== "count" && !numeric && filter?.type !== "number") throw new Error(`${label}.${aggregate} requires a numeric column`);
    let unsafeTanStack: UnsafeTanStackColumnOptions | null = null;
    if (input.__unsafe_tanstack !== undefined) {
      assertRecord(input.__unsafe_tanstack, `${label}.__unsafe_tanstack`);
      unsafeTanStack = Object.freeze({ ...input.__unsafe_tanstack });
    }
    definitions.push(Object.freeze({ id: input.id, header: input.header, accessor, cell, footer: functions.footer, width, minWidth, maxWidth, align, numeric, pin, visible, search, sensitive, editor, filter, faceted, sort, aggregate, unsafeTanStack }));
    index++;
  }
  return new DefinedColumns(Object.freeze(definitions));
}

/** Package-internal bridge used by the DataTable/TanStack adapter. */
export function readColumnDefinitions<Row extends object>(columns: SheenColumns<Row>): readonly ResolvedColumn<Row>[] {
  const inspect = columns[inspectColumns];
  if (typeof inspect !== "function") throw new Error("Expected columns returned by defineColumns");
  return inspect.call(columns);
}

/** Package-internal schema projection; apps never construct TanStack definitions. */
export function columnStateSchema<Row extends object>(columns: SheenColumns<Row>): TableStateSchema {
  const definitions = readColumnDefinitions(columns);
  return Object.freeze({
    columns: Object.freeze(definitions.map(column => column.id)),
    filterColumns: Object.freeze(definitions.flatMap(column => column.filter ? [column.filter] : [])),
    sortColumns: Object.freeze(definitions.flatMap(column => column.sort ? [column.sort] : [])),
  });
}
