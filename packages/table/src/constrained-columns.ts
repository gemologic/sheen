import type { FilterNode } from "./filter.ts";
import type { ColumnState } from "./table-state.ts";

export interface ConstrainedColumn {
  readonly column: string;
  readonly kind: "text" | "enum" | "number" | "date";
  readonly value: string | number;
}

function equal(left: ConstrainedColumn, right: ConstrainedColumn | undefined): boolean {
  return right !== undefined && left.kind === right.kind && left.value === right.value;
}

/** Infer only exact values required by the accepted predicate, never by sampled rows or facets. */
export function constrainedColumnValues(filter: FilterNode): ReadonlyMap<string, ConstrainedColumn> {
  if (filter.kind === "and") {
    const values = new Map<string, ConstrainedColumn>();
    const conflicts = new Set<string>();
    for (const child of filter.children) {
      for (const [column, value] of constrainedColumnValues(child)) {
        if (conflicts.has(column)) continue;
        const previous = values.get(column);
        if (previous && !equal(previous, value)) { values.delete(column); conflicts.add(column); }
        else values.set(column, value);
      }
    }
    return values;
  }
  if (filter.kind === "or") {
    const first = filter.children[0];
    const common = new Map(first ? constrainedColumnValues(first) : []);
    for (const child of filter.children.slice(1)) {
      const values = constrainedColumnValues(child);
      for (const [column, value] of common) if (!equal(value, values.get(column))) common.delete(column);
    }
    return common;
  }
  if (filter.kind === "enum" && filter.values.length === 1) {
    const value = filter.values[0];
    if (value !== undefined) return new Map([[filter.column, { column: filter.column, kind: filter.kind, value }]]);
  }
  if ((filter.kind === "number" || filter.kind === "date") && filter.operator === "eq") {
    return new Map([[filter.column, { column: filter.column, kind: filter.kind, value: filter.value }]]);
  }
  if (filter.kind === "text" && filter.operator === "eq" && filter.caseSensitive) {
    return new Map([[filter.column, { column: filter.column, kind: filter.kind, value: filter.value.normalize("NFC") }]]);
  }
  return new Map();
}

/** A temporary presentation projection. Saved visibility, order, widths, and pins remain untouched. */
export function summarizedColumns(columns: readonly ColumnState[], constraints: ReadonlyMap<string, ConstrainedColumn>, eligible: ReadonlySet<string>, restored: ReadonlySet<string>): readonly ConstrainedColumn[] {
  const visible = columns.filter(column => column.visible);
  const summaries = visible.flatMap(column => {
    const constraint = constraints.get(column.id);
    return constraint && eligible.has(column.id) ? [constraint] : [];
  });
  // Retain the first logical column when every visible field is constrained.
  return summaries.filter(summary => !restored.has(summary.column) && (summaries.length !== visible.length || summary.column !== visible[0]?.id));
}
