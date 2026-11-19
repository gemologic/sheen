export interface PageState { readonly pageIndex: number; readonly pageSize: number }
export type TablePagination = false | PageState;
export interface PageRange extends PageState { readonly pageCount: number; readonly start: number; readonly end: number }
export interface PageResult<Row> { readonly rows: readonly Row[]; readonly total: number }
export type ServerPageAssessment<Row> =
  | { readonly kind: "accepted"; readonly pagination: TablePagination; readonly result: PageResult<Row> }
  | { readonly kind: "refetch"; readonly pagination: PageState; readonly total: number };
/** Opaque server cursor plus the side of it to read. Null requests the first page. */
export interface CursorPosition { readonly direction: "after" | "before"; readonly value: string }
export interface CursorPagination { readonly kind: "cursor"; readonly pageSize: number; readonly cursor: CursorPosition | null }
/** Every server pagination choice: complete (false), numbered, or cursor. */
export type ServerPagination = TablePagination | CursorPagination;
/** Optional full-query count. Estimates and lower bounds are announced as such, never as exact counts. */
export interface CursorTotal { readonly kind: "exact" | "estimate" | "atLeast"; readonly value: number }
export interface CursorPageResult<Row> {
  readonly rows: readonly Row[];
  /** Null when no later page exists. */
  readonly nextCursor: string | null;
  /** Null when no earlier page exists. */
  readonly previousCursor: string | null;
  readonly total?: CursorTotal;
}
export type CursorPageAssessment<Row> =
  | { readonly kind: "accepted"; readonly pagination: CursorPagination; readonly result: CursorPageResult<Row> }
  | { readonly kind: "refetch"; readonly pagination: CursorPagination };

const explicitServerPagination = "Server mode requires explicit pagination, including explicit false for complete results";

function nonnegativeInteger(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a nonnegative safe integer`);
}

function pageSize(value: unknown): number {
  nonnegativeInteger(value, "pageSize");
  if (value === 0) throw new Error("pageSize must be positive");
  return value;
}

function closed(value: object, fields: readonly string[]): void {
  if (Object.keys(value).some(key => !fields.includes(key))) throw new Error("pagination contains unknown fields");
}

function cursorToken(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${name} must be a nonempty string or null`);
  return value;
}

export function parsePagination(value: unknown): TablePagination {
  if (value === false) return false;
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("pageIndex" in value) || !("pageSize" in value)) throw new Error("pagination must be false or { pageIndex, pageSize }");
  closed(value, ["pageIndex", "pageSize"]);
  nonnegativeInteger(value.pageIndex, "pageIndex");
  return Object.freeze({ pageIndex: value.pageIndex, pageSize: pageSize(value.pageSize) });
}

export function resolvePagination(mode: "client" | "server", value?: TablePagination): TablePagination {
  if (mode !== "client" && mode !== "server") throw new Error("Table mode must be client or server");
  if (value === undefined) {
    if (mode === "server") throw new Error(explicitServerPagination);
    return false;
  }
  return parsePagination(value);
}

export function parseCursorPagination(value: unknown): CursorPagination {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("kind" in value) || value.kind !== "cursor" || !("pageSize" in value) || !("cursor" in value)) throw new Error('cursor pagination must be { kind: "cursor", pageSize, cursor }');
  closed(value, ["kind", "pageSize", "cursor"]);
  const cursor: unknown = value.cursor;
  if (cursor === null) return Object.freeze({ kind: "cursor", pageSize: pageSize(value.pageSize), cursor: null });
  if (typeof cursor !== "object" || !("direction" in cursor) || !("value" in cursor) || (cursor.direction !== "after" && cursor.direction !== "before")) throw new Error("cursor must be null or { direction: after | before, value }");
  closed(cursor, ["direction", "value"]);
  return Object.freeze({ kind: "cursor", pageSize: pageSize(value.pageSize), cursor: Object.freeze({ direction: cursor.direction, value: cursorToken(cursor.value, "cursor value") }) });
}

/** Validates any server choice. Cursor state is distinguished by its kind field. */
export function parseServerPagination(value: unknown): ServerPagination {
  if (value === undefined) throw new Error(explicitServerPagination);
  return typeof value === "object" && value !== null && "kind" in value ? parseCursorPagination(value) : parsePagination(value);
}

/** Filter and sort changes reset the requested page, not accepted rows. Cursor state returns to the first page. */
export function resetPagination(value: TablePagination): TablePagination;
export function resetPagination(value: CursorPagination): CursorPagination;
export function resetPagination(value: ServerPagination): ServerPagination;
export function resetPagination(value: ServerPagination): ServerPagination {
  const parsed = parseServerPagination(value);
  return parsed === false ? false : resizePagination(parsed, parsed.pageSize);
}

export function resizePagination(value: PageState, pageSize: number): PageState;
export function resizePagination(value: CursorPagination, pageSize: number): CursorPagination;
export function resizePagination(value: PageState | CursorPagination, pageSize: number): PageState | CursorPagination;
export function resizePagination(value: PageState | CursorPagination, size: number): PageState | CursorPagination {
  const parsed = parseServerPagination(value);
  if (parsed === false) throw new Error("Page-size changes require paginated state");
  return "kind" in parsed ? Object.freeze({ kind: "cursor", pageSize: pageSize(size), cursor: null }) : Object.freeze({ pageIndex: 0, pageSize: pageSize(size) });
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

/** Validate a single cursor response. An empty later page (for example after deletions) refetches the first page. */
export function assessCursorPage<Row>(value: CursorPagination, result: CursorPageResult<Row>): CursorPageAssessment<Row> {
  const parsed = parseCursorPagination(value);
  if (!Array.isArray(result.rows)) throw new Error("Server rows must be an array");
  if (result.rows.length > parsed.pageSize) throw new Error("Cursor page contains more rows than pageSize");
  if (result.nextCursor !== null) cursorToken(result.nextCursor, "nextCursor");
  if (result.previousCursor !== null) cursorToken(result.previousCursor, "previousCursor");
  if (result.total !== undefined) {
    if (typeof result.total !== "object" || result.total === null || (result.total.kind !== "exact" && result.total.kind !== "estimate" && result.total.kind !== "atLeast")) throw new Error("Cursor total must be { kind: exact | estimate | atLeast, value }");
    nonnegativeInteger(result.total.value, "total value");
  }
  if (result.rows.length === 0 && parsed.cursor !== null) return { kind: "refetch", pagination: resetPagination(parsed) };
  return { kind: "accepted", pagination: parsed, result };
}
