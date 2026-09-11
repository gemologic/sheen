import type { ClientViewState } from "./client-view.ts";
import { parseFilter } from "./filter.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { parsePagination, resetPagination, resizePagination } from "./pagination.ts";
import type { TablePagination } from "./pagination.ts";
import { parseSorting } from "./sorting.ts";
import type { SortColumn, SortState } from "./sorting.ts";

export interface ClientStateSchema {
  readonly filterColumns: readonly FilterColumn[];
  readonly sortColumns: readonly SortColumn[];
}
export type ClientStateChange =
  | { readonly kind: "search"; readonly value: string }
  | { readonly kind: "filter"; readonly value: FilterNode }
  | { readonly kind: "sorting"; readonly value: SortState }
  | { readonly kind: "pagination"; readonly value: TablePagination }
  | { readonly kind: "pageSize"; readonly value: number };

/** Query-state fragment only; column layout, selection, and saved-view envelopes are separate. */
export function parseClientViewState(value: unknown, schema: ClientStateSchema): ClientViewState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid client state: expected an object");
  if (Object.keys(value).some(key => !["search", "filter", "sorting", "pagination"].includes(key))) throw new Error("Invalid client state: unknown field");
  if (!("search" in value) || typeof value.search !== "string") throw new Error("Invalid client state: search must be a string");
  if (!("filter" in value) || !("sorting" in value) || !("pagination" in value)) throw new Error("Invalid client state: missing query field");
  return Object.freeze({
    search: value.search,
    filter: parseFilter(value.filter, schema.filterColumns),
    sorting: parseSorting(value.sorting, schema.sortColumns),
    pagination: parsePagination(value.pagination),
  });
}

/** Changes requested state only. Accepted rows/state remain owned by the result controller. */
export function changeClientViewState(state: ClientViewState, change: ClientStateChange, schema: ClientStateSchema): ClientViewState {
  const current = parseClientViewState(state, schema);
  switch (change.kind) {
    case "search": return parseClientViewState({ ...current, search: change.value, pagination: resetPagination(current.pagination) }, schema);
    case "filter": return parseClientViewState({ ...current, filter: change.value, pagination: resetPagination(current.pagination) }, schema);
    case "sorting": return parseClientViewState({ ...current, sorting: change.value, pagination: resetPagination(current.pagination) }, schema);
    case "pagination": {
      const pagination = parsePagination(change.value);
      const resized = pagination !== false && current.pagination !== false && pagination.pageSize !== current.pagination.pageSize;
      return parseClientViewState({ ...current, pagination: resized ? resetPagination(pagination) : pagination }, schema);
    }
    case "pageSize": {
      if (current.pagination === false) throw new Error("Page-size changes require pagination to be enabled");
      return parseClientViewState({ ...current, pagination: resizePagination(current.pagination, change.value) }, schema);
    }
    default: throw new Error("Unknown client state change");
  }
}
