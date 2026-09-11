import type { FilterColumn, FilterNode } from "./filter.ts";
import { parseFilter } from "./filter.ts";

export type QueryBuilderColumn =
  | { readonly id: string; readonly label: string; readonly type: "text" }
  | { readonly id: string; readonly label: string; readonly type: "number" }
  | { readonly id: string; readonly label: string; readonly type: "date" }
  | { readonly id: string; readonly label: string; readonly type: "enum"; readonly options: readonly string[] };

export type QueryBuilderPath = readonly number[];

export function queryBuilderFilterColumns(columns: readonly QueryBuilderColumn[]): readonly FilterColumn[] {
  const ids = new Set<string>();
  return Object.freeze(columns.map(column => {
    if (!column.id.trim() || !column.label.trim() || ids.has(column.id)) throw new Error("QueryBuilder columns require unique nonempty IDs and labels");
    ids.add(column.id);
    if (column.type === "enum") {
      const options = [...new Set(column.options)];
      if (options.length === 0 || options.length !== column.options.length || options.some(option => !option.trim())) throw new Error(`QueryBuilder enum column ${JSON.stringify(column.id)} requires unique nonempty options`);
      return Object.freeze({ id: column.id, type: "enum", options: Object.freeze(options) });
    }
    return Object.freeze({ id: column.id, type: column.type });
  }));
}

export function defaultQueryRule(column: QueryBuilderColumn): FilterNode {
  if (column.type === "text") return Object.freeze({ kind: "text", column: column.id, operator: "contains", value: "", caseSensitive: false });
  if (column.type === "number") return Object.freeze({ kind: "number", column: column.id, operator: "eq", value: 0 });
  if (column.type === "date") return Object.freeze({ kind: "date", column: column.id, operator: "eq", value: Date.UTC(2000, 0, 1) });
  const value = column.options[0];
  if (!value) throw new Error(`QueryBuilder enum column ${JSON.stringify(column.id)} requires an option`);
  return Object.freeze({ kind: "enum", column: column.id, operator: "in", values: Object.freeze([value]) });
}

function visit(node: FilterNode, path: QueryBuilderPath, replace: (node: FilterNode) => FilterNode): FilterNode {
  if (path.length === 0) return replace(node);
  const [index, ...rest] = path;
  if (index === undefined || !Number.isSafeInteger(index) || index < 0) throw new Error("QueryBuilder path segments must be nonnegative integers");
  if (node.kind === "and" || node.kind === "or") {
    if (index >= node.children.length) throw new Error("QueryBuilder path is outside the filter tree");
    return Object.freeze({ ...node, children: Object.freeze(node.children.map((child, childIndex) => childIndex === index ? visit(child, rest, replace) : child)) });
  }
  if (node.kind === "not" && index === 0) return Object.freeze({ kind: "not", child: visit(node.child, rest, replace) });
  throw new Error("QueryBuilder path is outside the filter tree");
}

export function queryNodeAt(filter: FilterNode, path: QueryBuilderPath): FilterNode {
  let node = filter;
  for (const index of path) {
    if (!Number.isSafeInteger(index) || index < 0) throw new Error("QueryBuilder path segments must be nonnegative integers");
    if (node.kind === "and" || node.kind === "or") {
      const child = node.children[index];
      if (!child) throw new Error("QueryBuilder path is outside the filter tree");
      node = child;
    } else if (node.kind === "not" && index === 0) node = node.child;
    else throw new Error("QueryBuilder path is outside the filter tree");
  }
  return node;
}

export function replaceQueryNode(filter: FilterNode, path: QueryBuilderPath, replacement: FilterNode, columns: readonly FilterColumn[]): FilterNode {
  return parseFilter(visit(filter, path, () => replacement), columns);
}

export function appendQueryChild(filter: FilterNode, path: QueryBuilderPath, child: FilterNode, columns: readonly FilterColumn[]): FilterNode {
  return parseFilter(visit(filter, path, node => {
    if (node.kind !== "and" && node.kind !== "or") throw new Error("QueryBuilder can add children only to a group");
    return Object.freeze({ ...node, children: Object.freeze([...node.children, child]) });
  }), columns);
}

export function removeQueryNode(filter: FilterNode, path: QueryBuilderPath, columns: readonly FilterColumn[]): FilterNode {
  if (path.length === 0) throw new Error("QueryBuilder cannot remove its root node");
  const parentPath = path.slice(0, -1);
  const index = path.at(-1);
  if (index === undefined) throw new Error("QueryBuilder path is incomplete");
  return parseFilter(visit(filter, parentPath, parent => {
    if (parent.kind !== "and" && parent.kind !== "or") throw new Error("QueryBuilder can remove only group children");
    if (!parent.children[index]) throw new Error("QueryBuilder path is outside the filter tree");
    return Object.freeze({ ...parent, children: Object.freeze(parent.children.filter((_child, childIndex) => childIndex !== index)) });
  }), columns);
}

export function moveQueryNode(filter: FilterNode, path: QueryBuilderPath, offset: -1 | 1, columns: readonly FilterColumn[]): FilterNode {
  if (path.length === 0) throw new Error("QueryBuilder cannot move its root node");
  const parentPath = path.slice(0, -1);
  const index = path.at(-1);
  if (index === undefined) throw new Error("QueryBuilder path is incomplete");
  return parseFilter(visit(filter, parentPath, parent => {
    if (parent.kind !== "and" && parent.kind !== "or") throw new Error("QueryBuilder can move only group children");
    const destination = index + offset;
    if (!parent.children[index] || destination < 0 || destination >= parent.children.length) return parent;
    const children = [...parent.children];
    const current = children[index];
    const adjacent = children[destination];
    if (!current || !adjacent) return parent;
    children[index] = adjacent;
    children[destination] = current;
    return Object.freeze({ ...parent, children: Object.freeze(children) });
  }), columns);
}

export function toggleQueryNegation(filter: FilterNode, path: QueryBuilderPath, columns: readonly FilterColumn[]): FilterNode {
  return parseFilter(visit(filter, path, node => node.kind === "not" ? node.child : Object.freeze({ kind: "not", child: node })), columns);
}
