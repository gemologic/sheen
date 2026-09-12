import { parseFilter } from "./filter.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { createTextNormalizer } from "./text-normalization.ts";

export interface FilterEvaluation<Row> {
  readonly locale: string;
  readonly getValue: (row: Row, column: string) => unknown;
}

/** Validate and compile once per filter/schema/locale change, not once per row. */
export function compileFilter<Row>(filter: FilterNode, columns: readonly FilterColumn[], options: FilterEvaluation<Row>): (row: Row) => boolean {
  const locale = Intl.getCanonicalLocales(options.locale)[0] ?? "";
  if (!locale) throw new Error("Filter evaluation requires an explicit locale");
  const getValue = options.getValue;
  function compile(node: FilterNode): (row: Row) => boolean {
    switch (node.kind) {
      case "and": {
        const predicates = node.children.map(compile);
        return row => predicates.every(predicate => predicate(row));
      }
      case "or": {
        const predicates = node.children.map(compile);
        return row => predicates.some(predicate => predicate(row));
      }
      case "not": {
        const predicate = compile(node.child);
        return row => !predicate(row);
      }
      case "empty": return row => {
        const value = getValue(row, node.column);
        return value === null || value === undefined || value === "";
      };
      case "text": {
        const normalize = createTextNormalizer(locale, node.caseSensitive);
        const needle = normalize(node.value);
        const match = (value: string) => {
          switch (node.operator) {
            case "eq": return value === needle;
            case "contains": return value.includes(needle);
            case "startsWith": return value.startsWith(needle);
            case "endsWith": return value.endsWith(needle);
          }
        };
        return row => {
          const value = getValue(row, node.column);
          return typeof value === "string" && match(normalize(value));
        };
      }
      case "enum": {
        const selected = new Set(node.values);
        return row => {
          const value = getValue(row, node.column);
          return typeof value === "string" && selected.has(value);
        };
      }
      case "date":
      case "number": return row => {
        const value = getValue(row, node.column);
        if (typeof value !== "number" || !Number.isFinite(value) || (node.kind === "date" && Math.abs(value) > 8.64e15)) return false;
        switch (node.operator) {
          case "eq": return value === node.value;
          case "lt": return value < node.value;
          case "lte": return value <= node.value;
          case "gt": return value > node.value;
          case "gte": return value >= node.value;
          case "between": return value >= node.min && value <= node.max;
        }
      };
    }
  }
  return compile(parseFilter(filter, columns));
}

/** Operates on the complete client dataset and preserves surviving row identities/order. */
export function filterClientRows<Row>(rows: readonly Row[], filter: FilterNode, columns: readonly FilterColumn[], options: FilterEvaluation<Row>): readonly Row[] {
  const predicate = compileFilter(filter, columns, options);
  if (filter.kind === "and" && filter.children.length === 0) return rows;
  return rows.filter(predicate);
}
