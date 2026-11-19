import type { ClientViewState } from "./client-view.ts";
import { parseFilter } from "./filter.ts";
import type { FilterColumn, FilterNode } from "./filter.ts";
import { parsePagination, resetPagination, resizePagination } from "./pagination.ts";
import type { ServerPagination, TablePagination } from "./pagination.ts";
import { parseSorting } from "./sorting.ts";
import type { SortColumn, SortState } from "./sorting.ts";

export interface ClientStateSchema {
  readonly filterColumns: readonly FilterColumn[];
  readonly sortColumns: readonly SortColumn[];
}
export type ClientStateChange<Pagination extends ServerPagination = TablePagination> =
  | { readonly kind: "search"; readonly value: string }
  | { readonly kind: "filter"; readonly value: FilterNode }
  | { readonly kind: "sorting"; readonly value: SortState }
  | { readonly kind: "pagination"; readonly value: Pagination }
  | { readonly kind: "pageSize"; readonly value: number };
/** Query state whose pagination kind is fixed by the parser that validated it. */
export interface QueryState<Pagination extends ServerPagination = TablePagination> extends Omit<ClientViewState, "pagination"> {
  readonly pagination: Pagination;
}

export function parseQueryState<Pagination extends ServerPagination>(value: unknown, schema: ClientStateSchema, readPagination: (value: unknown) => Pagination): QueryState<Pagination> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid client state: expected an object");
  if (Object.keys(value).some(key => !["search", "filter", "sorting", "pagination"].includes(key))) throw new Error("Invalid client state: unknown field");
  if (!("search" in value) || typeof value.search !== "string") throw new Error("Invalid client state: search must be a string");
  if (!("filter" in value) || !("sorting" in value) || !("pagination" in value)) throw new Error("Invalid client state: missing query field");
  return Object.freeze({
    search: value.search,
    filter: parseFilter(value.filter, schema.filterColumns),
    sorting: parseSorting(value.sorting, schema.sortColumns),
    pagination: readPagination(value.pagination),
  });
}

/** Query-state fragment only; column layout, selection, and saved-view envelopes are separate. */
export function parseClientViewState(value: unknown, schema: ClientStateSchema): ClientViewState {
  return parseQueryState(value, schema, parsePagination);
}

export function changeQueryState<Pagination extends ServerPagination>(state: QueryState<Pagination>, change: ClientStateChange<Pagination>, schema: ClientStateSchema, readPagination: (value: unknown) => Pagination): QueryState<Pagination> {
  const current = parseQueryState(state, schema, readPagination);
  const existing: ServerPagination = current.pagination;
  const parse = (next: QueryState<ServerPagination>) => parseQueryState(next, schema, readPagination);
  switch (change.kind) {
    case "search": return parse({ ...current, search: change.value, pagination: resetPagination(existing) });
    case "filter": return parse({ ...current, filter: change.value, pagination: resetPagination(existing) });
    case "sorting": return parse({ ...current, sorting: change.value, pagination: resetPagination(existing) });
    case "pagination": {
      const pagination: ServerPagination = readPagination(change.value);
      const resized = pagination !== false && existing !== false && pagination.pageSize !== existing.pageSize;
      return parse({ ...current, pagination: resized ? resetPagination(pagination) : pagination });
    }
    case "pageSize": {
      if (existing === false) throw new Error("Page-size changes require pagination to be enabled");
      return parse({ ...current, pagination: resizePagination(existing, change.value) });
    }
    default: throw new Error("Unknown client state change");
  }
}

/** Changes requested state only. Accepted rows/state remain owned by the result controller. */
export function changeClientViewState(state: ClientViewState, change: ClientStateChange, schema: ClientStateSchema): ClientViewState {
  return changeQueryState(state, change, schema, parsePagination);
}
