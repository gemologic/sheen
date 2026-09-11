import type { ColumnAggregate, ColumnValue } from "./columns.ts";

export interface GroupAggregateColumn<Row extends object> {
  readonly id: string;
  readonly aggregate: ColumnAggregate;
  readonly getValue: (row: Row) => ColumnValue;
}

export interface GroupAggregateValue {
  readonly column: string;
  readonly value: number | null;
}

export interface ClientRowGroup<Row extends object> {
  readonly id: string;
  readonly value: ColumnValue;
  readonly rows: readonly Row[];
  /** Full matching leaf count. Equals rows.length for client groups. */
  readonly count: number;
  readonly aggregates: readonly GroupAggregateValue[];
}

export interface ServerRowGroup {
  readonly value: ColumnValue;
  readonly rowIds: readonly string[];
  readonly count: number;
  readonly aggregates: readonly GroupAggregateValue[];
}

export interface ClientGroupingOptions<Row extends object> {
  readonly column: string;
  readonly getValue: (row: Row) => ColumnValue;
  readonly aggregates?: readonly GroupAggregateColumn<Row>[];
}

function validateValue(value: unknown, label: string): ColumnValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error(`${label} must be a string, finite number, boolean, or null`);
}

function groupKey(value: ColumnValue): string {
  if (value === null) return "null";
  return `${typeof value}:${JSON.stringify(value)}`;
}

function aggregateRows<Row extends object>(rows: readonly Row[], column: GroupAggregateColumn<Row>): GroupAggregateValue {
  let count = 0;
  let total = 0;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < rows.length; index++) {
    const value = validateValue(column.getValue(rows[index]!), `Aggregate ${column.id} row ${index}`);
    if (value === null) continue;
    count++;
    if (column.aggregate === "count") continue;
    if (typeof value !== "number") throw new Error(`Aggregate ${column.id} ${column.aggregate} requires numeric values`);
    total += value;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const value = column.aggregate === "count" ? count
    : count === 0 ? null
    : column.aggregate === "sum" ? total
    : column.aggregate === "average" ? total / count
    : column.aggregate === "min" ? minimum
    : maximum;
  return Object.freeze({ column: column.id, value });
}

/** Group a complete accepted client view in first-seen order and calculate leaf aggregates. */
export function groupClientRows<Row extends object>(rows: readonly Row[], options: ClientGroupingOptions<Row>): readonly ClientRowGroup<Row>[] {
  if (!Array.isArray(rows)) throw new Error("Grouped rows must be an array");
  if (typeof options.column !== "string" || !options.column.trim()) throw new Error("Grouping column must be a nonempty string");
  if (typeof options.getValue !== "function") throw new Error("Grouping requires a value accessor");
  const aggregateColumns = options.aggregates ?? [];
  const aggregateIds = new Set<string>();
  for (const column of aggregateColumns) {
    if (!column || typeof column !== "object" || typeof column.id !== "string" || !column.id.trim() || aggregateIds.has(column.id)) throw new Error("Aggregate columns require unique nonempty IDs");
    if (column.aggregate !== "sum" && column.aggregate !== "average" && column.aggregate !== "min" && column.aggregate !== "max" && column.aggregate !== "count") throw new Error(`Aggregate ${column.id} has an invalid operation`);
    if (typeof column.getValue !== "function") throw new Error(`Aggregate ${column.id} requires a value accessor`);
    aggregateIds.add(column.id);
  }
  const grouped = new Map<ColumnValue, Row[]>();
  for (let index = 0; index < rows.length; index++) {
    if (!Object.hasOwn(rows, index) || typeof rows[index] !== "object" || rows[index] === null) throw new Error(`Grouped row ${index} must be an object`);
    const row = rows[index]!;
    const value = validateValue(options.getValue(row), `Grouping value at row ${index}`);
    const group = grouped.get(value);
    if (group) group.push(row);
    else grouped.set(value, [row]);
  }
  return Object.freeze([...grouped].map(([value, groupRows]) => {
    const acceptedRows = Object.freeze([...groupRows]);
    return Object.freeze({
      id: `group:${options.column}:${groupKey(value)}`,
      value,
      rows: acceptedRows,
      count: acceptedRows.length,
      aggregates: Object.freeze(aggregateColumns.map(column => aggregateRows(acceptedRows, column))),
    });
  }));
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate delegated groups against one accepted server page without recomputing full-query totals locally. */
export function normalizeServerGroups<Row extends object>(rows: readonly Row[], groups: unknown, options: {
  readonly column: string;
  readonly aggregateColumns: readonly string[];
  readonly getRowId: (row: Row) => string;
}): readonly ClientRowGroup<Row>[] {
  const acceptedRows = validatedRowsForServer(rows);
  if (!Array.isArray(groups)) throw new Error("Server grouping requires a groups array");
  const groupValues: readonly unknown[] = groups;
  const expectedAggregates = new Set<string>();
  for (const id of options.aggregateColumns) {
    if (typeof id !== "string" || !id.trim() || expectedAggregates.has(id)) throw new Error("Server aggregate columns must be unique nonempty IDs");
    expectedAggregates.add(id);
  }
  const rowById = new Map<string, Row>();
  const acceptedOrder: string[] = [];
  for (let index = 0; index < acceptedRows.length; index++) {
    const row = acceptedRows[index]!;
    const id = options.getRowId(row);
    if (typeof id !== "string" || !id.trim() || rowById.has(id)) throw new Error(`Server grouped row ${index} has an invalid or duplicate ID`);
    rowById.set(id, row);
    acceptedOrder.push(id);
  }
  const seenRows = new Set<string>();
  const seenGroups = new Set<string>();
  const flattenedOrder: string[] = [];
  const result: ClientRowGroup<Row>[] = [];
  for (let index = 0; index < groupValues.length; index++) {
    const candidate = groupValues[index];
    if (!Object.hasOwn(groupValues, index) || !record(candidate)) throw new Error(`Server group ${index} must be an object`);
    const group = candidate;
    for (const field of Object.keys(group)) if (field !== "value" && field !== "rowIds" && field !== "count" && field !== "aggregates") throw new Error(`Server group ${index} has unknown field ${field}`);
    for (const field of ["value", "rowIds", "count", "aggregates"]) if (!Object.hasOwn(group, field)) throw new Error(`Server group ${index} is missing ${field}`);
    const value = validateValue(group.value, `Server group ${index} value`);
    const id = `group:${options.column}:${groupKey(value)}`;
    if (seenGroups.has(id)) throw new Error(`Duplicate server group value at index ${index}`);
    seenGroups.add(id);
    if (!Array.isArray(group.rowIds) || group.rowIds.length === 0) throw new Error(`Server group ${index} rowIds must be a nonempty array`);
    const rowIds: readonly unknown[] = group.rowIds;
    const groupRows: Row[] = [];
    for (const rowId of rowIds) {
      if (typeof rowId !== "string" || !rowId.trim() || seenRows.has(rowId)) throw new Error(`Server group ${index} has an invalid or duplicate row ID`);
      const row = rowById.get(rowId);
      if (!row) throw new Error(`Server group ${index} references an unavailable page row: ${rowId}`);
      seenRows.add(rowId);
      flattenedOrder.push(rowId);
      groupRows.push(row);
    }
    if (typeof group.count !== "number" || !Number.isSafeInteger(group.count) || group.count < groupRows.length) throw new Error(`Server group ${index} count must cover its accepted page rows`);
    if (!Array.isArray(group.aggregates)) throw new Error(`Server group ${index} aggregates must be an array`);
    const aggregateValues: readonly unknown[] = group.aggregates;
    const aggregates: GroupAggregateValue[] = [];
    const seenAggregates = new Set<string>();
    for (let aggregateIndex = 0; aggregateIndex < aggregateValues.length; aggregateIndex++) {
      const aggregate = aggregateValues[aggregateIndex];
      if (!record(aggregate) || Object.keys(aggregate).some(field => field !== "column" && field !== "value") || !Object.hasOwn(aggregate, "column") || !Object.hasOwn(aggregate, "value")) throw new Error(`Server group ${index} aggregate ${aggregateIndex} is invalid`);
      if (typeof aggregate.column !== "string" || !expectedAggregates.has(aggregate.column) || seenAggregates.has(aggregate.column)) throw new Error(`Server group ${index} has an unknown or duplicate aggregate column`);
      if (aggregate.value !== null && (typeof aggregate.value !== "number" || !Number.isFinite(aggregate.value))) throw new Error(`Server group ${index} aggregate ${aggregate.column} must be finite or null`);
      seenAggregates.add(aggregate.column);
      aggregates.push(Object.freeze({ column: aggregate.column, value: aggregate.value }));
    }
    if (seenAggregates.size !== expectedAggregates.size) throw new Error(`Server group ${index} must provide every configured aggregate`);
    result.push(Object.freeze({ id, value, rows: Object.freeze(groupRows), count: group.count, aggregates: Object.freeze(aggregates) }));
  }
  if (flattenedOrder.length !== acceptedOrder.length || flattenedOrder.some((id, index) => id !== acceptedOrder[index])) throw new Error("Server groups must cover every accepted page row once in server order");
  return Object.freeze(result);
}

function validatedRowsForServer<Row extends object>(rows: readonly Row[]): readonly Row[] {
  if (!Array.isArray(rows)) throw new Error("Server grouped rows must be an array");
  const result: Row[] = [];
  for (let index = 0; index < rows.length; index++) {
    if (!Object.hasOwn(rows, index) || typeof rows[index] !== "object" || rows[index] === null) throw new Error(`Server grouped row ${index} must be an object`);
    result.push(rows[index]!);
  }
  return Object.freeze(result);
}
