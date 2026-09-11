import type { FilterNode } from "./filter.ts";

export type FilterCondition = Extract<FilterNode, { readonly column: string }>;
export type FilterPathSegment = number | "child";

export interface FilterConditionEntry {
  readonly path: readonly FilterPathSegment[];
  readonly condition: FilterCondition;
  readonly directNegated: boolean;
  readonly inheritedNegated: boolean;
  readonly groups: readonly ("and" | "or")[];
}

function isCondition(node: FilterNode): node is FilterCondition {
  return node.kind !== "and" && node.kind !== "or" && node.kind !== "not";
}

/** Project editable leaf conditions without flattening or changing the source expression. */
export function listFilterConditions(filter: FilterNode): readonly FilterConditionEntry[] {
  const result: FilterConditionEntry[] = [];
  function visit(node: FilterNode, path: readonly FilterPathSegment[], inheritedNegated: boolean, groups: readonly ("and" | "or")[]): void {
    if (node.kind === "and" || node.kind === "or") {
      const nextGroups = Object.freeze([...groups, node.kind]);
      for (let index = 0; index < node.children.length; index++) visit(node.children[index]!, Object.freeze([...path, index]), inheritedNegated, nextGroups);
      return;
    }
    if (node.kind === "not") {
      if (isCondition(node.child)) {
        result.push(Object.freeze({ path: Object.freeze([...path]), condition: node.child, directNegated: true, inheritedNegated, groups: Object.freeze([...groups]) }));
      } else visit(node.child, Object.freeze([...path, "child"]), !inheritedNegated, groups);
      return;
    }
    if (!isCondition(node)) throw new Error("Filter condition traversal reached a non-leaf node");
    result.push(Object.freeze({ path: Object.freeze([...path]), condition: node, directNegated: false, inheritedNegated, groups: Object.freeze([...groups]) }));
  }
  visit(filter, Object.freeze([]), false, Object.freeze([]));
  return Object.freeze(result);
}

function replacement(condition: FilterCondition, negated: boolean): FilterNode {
  return negated ? Object.freeze({ kind: "not", child: condition }) : condition;
}

function replaceNode(node: FilterNode, path: readonly FilterPathSegment[], offset: number, next: FilterNode): FilterNode {
  if (offset === path.length) return next;
  const segment = path[offset];
  if (typeof segment === "number") {
    if ((node.kind !== "and" && node.kind !== "or") || segment < 0 || segment >= node.children.length) throw new Error("Filter condition path does not match the expression");
    const children = node.children.map((child, index) => index === segment ? replaceNode(child, path, offset + 1, next) : child);
    return Object.freeze({ kind: node.kind, children: Object.freeze(children) });
  }
  if (node.kind !== "not") throw new Error("Filter condition path does not match the expression");
  return Object.freeze({ kind: "not", child: replaceNode(node.child, path, offset + 1, next) });
}

/** Replace one leaf, optionally wrapped in a direct not, while preserving surrounding groups. */
export function replaceFilterCondition(filter: FilterNode, path: readonly FilterPathSegment[], condition: FilterCondition, negated: boolean): FilterNode {
  return replaceNode(filter, path, 0, replacement(condition, negated));
}

function removeNode(node: FilterNode, path: readonly FilterPathSegment[], offset: number): FilterNode | null {
  if (offset === path.length) return null;
  const segment = path[offset];
  if (typeof segment === "number") {
    if ((node.kind !== "and" && node.kind !== "or") || segment < 0 || segment >= node.children.length) throw new Error("Filter condition path does not match the expression");
    const children: FilterNode[] = [];
    for (let index = 0; index < node.children.length; index++) {
      const child = index === segment ? removeNode(node.children[index]!, path, offset + 1) : node.children[index]!;
      if (child) children.push(child);
    }
    if (children.length === 0) return null;
    if (children.length === 1) return children[0]!;
    return Object.freeze({ kind: node.kind, children: Object.freeze(children) });
  }
  if (node.kind !== "not") throw new Error("Filter condition path does not match the expression");
  const child = removeNode(node.child, path, offset + 1);
  return child ? Object.freeze({ kind: "not", child }) : null;
}

/** Remove one leaf and simplify empty or single-child groups without changing truth semantics. */
export function removeFilterCondition(filter: FilterNode, path: readonly FilterPathSegment[]): FilterNode {
  return removeNode(filter, path, 0) ?? Object.freeze({ kind: "and", children: Object.freeze([]) });
}

/** Add a new condition to the root conjunction, wrapping a non-conjunction expression intact. */
export function appendFilterCondition(filter: FilterNode, condition: FilterCondition, negated = false): FilterNode {
  const next = replacement(condition, negated);
  if (filter.kind === "and") return Object.freeze({ kind: "and", children: Object.freeze([...filter.children, next]) });
  return Object.freeze({ kind: "and", children: Object.freeze([filter, next]) });
}

function withoutColumn(node: FilterNode, column: string): FilterNode | null {
  if (node.kind === "and" || node.kind === "or") {
    const children = node.children.flatMap(child => {
      const next = withoutColumn(child, column);
      return next ? [next] : [];
    });
    if (children.length === 0) return null;
    if (children.length === 1) return children[0]!;
    return Object.freeze({ kind: node.kind, children: Object.freeze(children) });
  }
  if (node.kind === "not") {
    const child = withoutColumn(node.child, column);
    return child ? Object.freeze({ kind: "not", child }) : null;
  }
  if (!isCondition(node)) throw new Error("Facet traversal reached a non-leaf node");
  return node.column === column ? null : node;
}

/** Remove every condition for one facet column while preserving all other constraints. */
export function removeFilterColumnConditions(filter: FilterNode, column: string): FilterNode {
  if (typeof column !== "string" || !column.trim()) throw new Error("Facet column must be a nonempty string");
  return withoutColumn(filter, column) ?? Object.freeze({ kind: "and", children: Object.freeze([]) });
}
