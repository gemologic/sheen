import type { FilterColumn } from "./filter.ts";

export interface FacetOption {
  readonly value: string;
  readonly count: number;
}
export interface ColumnFacet {
  readonly column: string;
  readonly options: readonly FacetOption[];
  readonly missing: number;
}
export interface FacetEvaluation<Row> {
  readonly getValue: (row: Row, column: string) => unknown;
}

/** Count the complete filtered view, before pagination. Never removes AST predicates. */
export function countClientFacets<Row>(rows: readonly Row[], columns: readonly FilterColumn[], evaluation: FacetEvaluation<Row>): readonly ColumnFacet[] {
  const ids = new Set<string>();
  const facets = columns.flatMap(column => {
    if (typeof column.id !== "string" || !column.id.trim() || ids.has(column.id)) throw new Error("Invalid or duplicate facet column");
    ids.add(column.id);
    if (column.type !== "enum") return [];
    if (!Array.isArray(column.options)) throw new Error(`Invalid facet options for ${column.id}`);
    const counts = new Map<string, number>();
    for (const option of column.options) {
      if (typeof option !== "string") throw new Error(`Invalid facet option for ${column.id}`);
      counts.set(option, 0);
    }
    return [{ column: column.id, counts, missing: 0 }];
  });
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row === undefined) throw new Error(`Missing facet row at index ${index}`);
    for (const facet of facets) {
      const value = evaluation.getValue(row, facet.column);
      if (value === null || value === undefined) { facet.missing++; continue; }
      if (typeof value !== "string" || !facet.counts.has(value)) throw new Error(`Invalid enum value for facet ${facet.column} at row ${index}`);
      facet.counts.set(value, (facet.counts.get(value) ?? 0) + 1);
    }
  }
  return Object.freeze(facets.map(facet => Object.freeze({
    column: facet.column,
    options: Object.freeze(Array.from(facet.counts, ([value, count]) => Object.freeze({ value, count }))),
    missing: facet.missing,
  })));
}
