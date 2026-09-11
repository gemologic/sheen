export interface PageState { readonly pageIndex: number; readonly pageSize: number }
export type TablePagination = false | PageState;
export interface PageRange extends PageState { readonly pageCount: number; readonly start: number; readonly end: number }
export interface PageResult<Row> { readonly rows: readonly Row[]; readonly total: number }
export type ServerPageAssessment<Row> =
  | { readonly kind: "accepted"; readonly pagination: TablePagination; readonly result: PageResult<Row> }
  | { readonly kind: "refetch"; readonly pagination: PageState; readonly total: number };

function nonnegativeInteger(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a nonnegative safe integer`);
}

export function parsePagination(value: unknown): TablePagination {
  if (value === false) return false;
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("pageIndex" in value) || !("pageSize" in value)) throw new Error("pagination must be false or { pageIndex, pageSize }");
  if (Object.keys(value).some(key => key !== "pageIndex" && key !== "pageSize")) throw new Error("pagination contains unknown fields");
  nonnegativeInteger(value.pageIndex, "pageIndex");
  nonnegativeInteger(value.pageSize, "pageSize");
  if (value.pageSize === 0) throw new Error("pageSize must be positive");
  return Object.freeze({ pageIndex: value.pageIndex, pageSize: value.pageSize });
}

export function resolvePagination(mode: "client" | "server", value?: TablePagination): TablePagination {
  if (mode !== "client" && mode !== "server") throw new Error("Table mode must be client or server");
  if (value === undefined) {
    if (mode === "server") throw new Error("Server mode requires explicit pagination, including explicit false for complete results");
    return false;
  }
  return parsePagination(value);
}

/** Filter and sort changes reset the requested page, not accepted rows. */
export function resetPagination(value: TablePagination): TablePagination {
  const parsed = parsePagination(value);
  return parsed === false ? false : Object.freeze({ ...parsed, pageIndex: 0 });
}

export function resizePagination(value: PageState, pageSize: number): PageState {
  if (parsePagination(value) === false) throw new Error("Page-size changes require paginated state");
  nonnegativeInteger(pageSize, "pageSize");
  if (pageSize === 0) throw new Error("pageSize must be positive");
  return Object.freeze({ pageIndex: 0, pageSize });
}

/** Clamp before multiplying so even extreme valid requested indices cannot overflow the offset. */
export function getPageRange(value: PageState, total: number): PageRange {
  const parsed = parsePagination(value);
  if (parsed === false) throw new Error("Page ranges require paginated state");
  nonnegativeInteger(total, "total");
  const pageCount = Math.ceil(total / parsed.pageSize);
  const pageIndex = Math.min(parsed.pageIndex, Math.max(0, pageCount - 1));
  const start = pageIndex * parsed.pageSize;
  const end = start + Math.min(parsed.pageSize, total - start);
  return Object.freeze({ pageIndex, pageSize: parsed.pageSize, pageCount, start, end });
}

/** Call after transforming the complete client dataset, never on an individual server page. */
export function paginateClientRows<Row>(rows: readonly Row[], value: TablePagination = false): PageResult<Row> & { readonly pagination: TablePagination } {
  const parsed = parsePagination(value);
  if (parsed === false) return { rows, total: rows.length, pagination: false };
  const range = getPageRange(parsed, rows.length);
  return { rows: rows.slice(range.start, range.end), total: rows.length, pagination: Object.freeze({ pageIndex: range.pageIndex, pageSize: range.pageSize }) };
}

/** Validate a single response; never fetch, concatenate pages, or publish an invalid result. */
export function assessServerPage<Row>(value: TablePagination, result: PageResult<Row>): ServerPageAssessment<Row> {
  const parsed = parsePagination(value);
  nonnegativeInteger(result.total, "total");
  if (!Array.isArray(result.rows)) throw new Error("Server rows must be an array");
  if (parsed === false) {
    if (result.rows.length !== result.total) throw new Error("Non-paginated server results must be complete: rows.length must equal total");
    return { kind: "accepted", pagination: false, result };
  }
  const range = getPageRange(parsed, result.total);
  if (range.pageIndex !== parsed.pageIndex && result.total > 0) {
    if (result.rows.length) throw new Error("Out-of-range server page must not contain rows");
    return { kind: "refetch", pagination: Object.freeze({ pageIndex: range.pageIndex, pageSize: range.pageSize }), total: result.total };
  }
  if (result.rows.length !== range.end - range.start) throw new Error("Server page row count does not match the requested page and total");
  return { kind: "accepted", pagination: Object.freeze({ pageIndex: range.pageIndex, pageSize: range.pageSize }), result };
}
