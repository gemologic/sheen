import { compileFilter } from "./filter-client.ts";
import type { FilterEvaluation } from "./filter-client.ts";
import type { FilterColumn } from "./filter.ts";
import type { BulkSelection } from "./selection.ts";

export interface ClientSelectionOptions<Row> extends FilterEvaluation<Row> {
  readonly filterColumns: readonly FilterColumn[];
  readonly getRowId: (row: Row) => string;
}

/** Resolve a captured selection against a complete client view, preserving its order and row identity. */
export function selectClientRows<Row>(rows: readonly Row[], selection: BulkSelection, options: ClientSelectionOptions<Row>): readonly Row[] {
  const selected = new Set(selection.kind === "ids" ? selection.ids : selection.excluded);
  for (const id of selected) if (typeof id !== "string" || !id.trim()) throw new Error("Invalid selection ID");
  const matches = selection.kind === "query" ? compileFilter(selection.filter, options.filterColumns, options) : undefined;
  const seen = new Set<string>();
  return rows.filter(row => {
    const id = options.getRowId(row);
    if (typeof id !== "string" || !id.trim() || seen.has(id)) throw new Error("Client row IDs must be unique nonempty strings");
    seen.add(id);
    return selection.kind === "ids" ? selected.has(id) : !selected.has(id) && Boolean(matches?.(row));
  });
}
