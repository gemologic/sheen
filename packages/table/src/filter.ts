export type FilterColumn =
  | { readonly id: string; readonly type: "text" }
  | { readonly id: string; readonly type: "number" }
  | { readonly id: string; readonly type: "date" }
  | { readonly id: string; readonly type: "enum"; readonly options: readonly string[] };
export type FilterNode =
  | { readonly kind: "and"; readonly children: readonly FilterNode[] }
  | { readonly kind: "or"; readonly children: readonly FilterNode[] }
  | { readonly kind: "not"; readonly child: FilterNode }
  | { readonly kind: "empty"; readonly column: string }
  | { readonly kind: "text"; readonly column: string; readonly operator: "eq" | "contains" | "startsWith" | "endsWith"; readonly value: string; readonly caseSensitive: boolean }
  | { readonly kind: "number"; readonly column: string; readonly operator: "eq" | "lt" | "lte" | "gt" | "gte"; readonly value: number }
  | { readonly kind: "number"; readonly column: string; readonly operator: "between"; readonly min: number; readonly max: number }
  | { readonly kind: "date"; readonly column: string; readonly operator: "eq" | "lt" | "lte" | "gt" | "gte"; readonly value: number }
  | { readonly kind: "date"; readonly column: string; readonly operator: "between"; readonly min: number; readonly max: number }
  | { readonly kind: "enum"; readonly column: string; readonly operator: "in"; readonly values: readonly string[] };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function fail(path: string, message: string): never { throw new Error(`Invalid filter at ${path}: ${message}`); }
function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, `unknown field ${key}`);
}
function numeric(value: unknown, path: string, date: boolean): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fail(path, "expected a finite number");
  if (date && Math.abs(value) > 8.64e15) return fail(path, "timestamp is outside the supported epoch-millisecond range");
  return value === 0 ? 0 : value;
}

/** Copy and validate the complete AST against the available filter columns before using it. */
export function parseFilter(value: unknown, columns: readonly FilterColumn[]): FilterNode {
  const schema = new Map<string, FilterColumn>();
  for (const column of columns) {
    if (typeof column.id !== "string" || !column.id.trim() || schema.has(column.id)) throw new Error(`Invalid or duplicate filter column: ${column.id}`);
    if (column.type === "enum") {
      if (!Array.isArray(column.options)) throw new Error(`Invalid enum options for filter column: ${column.id}`);
      for (const option of column.options) if (typeof option !== "string") throw new Error(`Invalid enum options for filter column: ${column.id}`);
    }
    schema.set(column.id, column);
  }
  let count = 0;
  function visit(input: unknown, path: string, depth: number): FilterNode {
    if (++count > 4096 || depth >= 64) return fail(path, "filter exceeds 4096 nodes or 64 levels");
    if (!record(input)) return fail(path, "expected a node object");
    const kind = input.kind;
    if (kind === "and" || kind === "or") {
      keys(input, ["kind", "children"], path);
      if (!Array.isArray(input.children)) return fail(path, "group children must be an array");
      if (input.children.length > 4096) return fail(path, "filter exceeds 4096 nodes");
      return Object.freeze({ kind, children: Object.freeze(Array.from(input.children, (child, index) => visit(child, `${path}.children[${index}]`, depth + 1))) });
    }
    if (kind === "not") {
      keys(input, ["kind", "child"], path);
      return Object.freeze({ kind, child: visit(input.child, `${path}.child`, depth + 1) });
    }
    if (typeof input.column !== "string" || !schema.has(input.column)) return fail(path, "unknown or missing column");
    const column = input.column;
    if (kind === "empty") { keys(input, ["kind", "column"], path); return Object.freeze({ kind, column }); }
    if (kind !== schema.get(column)?.type) return fail(path, `node type does not match column ${column}`);
    const operator = input.operator;
    if (kind === "text") {
      keys(input, ["kind", "column", "operator", "value", "caseSensitive"], path);
      if (operator !== "eq" && operator !== "contains" && operator !== "startsWith" && operator !== "endsWith") return fail(path, "unsupported text operator");
      if (typeof input.value !== "string") return fail(path, "text value must be a string");
      if (input.caseSensitive !== undefined && typeof input.caseSensitive !== "boolean") return fail(path, "caseSensitive must be boolean");
      return Object.freeze({ kind, column, operator, value: input.value, caseSensitive: input.caseSensitive ?? false });
    }
    if (kind === "number" || kind === "date") {
      if (operator === "between") {
        keys(input, ["kind", "column", "operator", "min", "max"], path);
        const min = numeric(input.min, `${path}.min`, kind === "date");
        const max = numeric(input.max, `${path}.max`, kind === "date");
        if (min > max) return fail(path, "range minimum exceeds maximum");
        return Object.freeze({ kind, column, operator, min, max });
      }
      keys(input, ["kind", "column", "operator", "value"], path);
      if (operator !== "eq" && operator !== "lt" && operator !== "lte" && operator !== "gt" && operator !== "gte") return fail(path, "unsupported numeric/date operator");
      return Object.freeze({ kind, column, operator, value: numeric(input.value, `${path}.value`, kind === "date") });
    }
    if (kind === "enum") {
      keys(input, ["kind", "column", "operator", "values"], path);
      const definition = schema.get(column);
      if (operator !== "in" || !Array.isArray(input.values) || definition?.type !== "enum") return fail(path, "enum requires an in operator and values array");
      const options = new Set(definition.options);
      const values: string[] = [];
      for (const option of input.values) {
        if (typeof option !== "string" || !options.has(option)) return fail(path, "unknown enum option");
        if (!values.includes(option)) values.push(option);
      }
      return Object.freeze({ kind, column, operator, values: Object.freeze(values) });
    }
    return fail(path, "unknown node kind");
  }
  return visit(value, "$", 0);
}

export function serializeFilter(filter: FilterNode, columns: readonly FilterColumn[]): string {
  const result = JSON.stringify({ version: 1, filter: parseFilter(filter, columns) });
  if (result.length > 262144) throw new Error("Serialized filter exceeds 262144 characters");
  return result;
}

export function deserializeFilter(serialized: string, columns: readonly FilterColumn[]): FilterNode {
  if (serialized.length > 262144) throw new Error("Serialized filter exceeds 262144 characters");
  let envelope: unknown;
  try { envelope = JSON.parse(serialized); }
  catch { throw new Error("Invalid filter JSON"); }
  if (!record(envelope)) return fail("$", "expected versioned envelope");
  keys(envelope, ["version", "filter"], "$");
  if (envelope.version !== 1) return fail("$", "unsupported filter version");
  return parseFilter(envelope.filter, columns);
}
