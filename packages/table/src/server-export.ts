import { parseFilter } from "./filter.ts";
import type { BulkSelection } from "./selection.ts";
import { parsePagination } from "./pagination.ts";
import type { ServerPagination, TablePagination } from "./pagination.ts";
import { parseTableStateWith } from "./table-state.ts";
import type { TableState, TableStateSchema } from "./table-state.ts";

export interface TableExportRequest<Pagination extends ServerPagination = TablePagination> {
  readonly format: "csv" | "json";
  readonly state: TableState<Pagination>;
  /** null exports the whole matching view; explicit empty IDs export zero rows. */
  readonly selection: BulkSelection | null;
}
export interface ServerExportSnapshot<Artifact, Pagination extends ServerPagination = TablePagination> {
  readonly accepted: { readonly request: TableExportRequest<Pagination>; readonly artifact: Artifact } | null;
  readonly requested: TableExportRequest<Pagination> | null;
  readonly pending: boolean;
  readonly error: unknown;
}
export type ServerExportOutcome = "accepted" | "failed" | "busy" | "unavailable" | "canceled" | "disposed";

function capture<Pagination extends ServerPagination>(request: TableExportRequest<Pagination>, schema: TableStateSchema, readPagination: (value: unknown) => Pagination): TableExportRequest<Pagination> {
  if (request.format !== "csv" && request.format !== "json") throw new Error("Unsupported table export format");
  const state = parseTableStateWith(request.state, schema, readPagination);
  let selection: BulkSelection | null = null;
  if (request.selection !== null) {
    const source = request.selection;
    if (source.kind !== "ids" && source.kind !== "query") throw new Error("Invalid export selection kind");
    const ids = source.kind === "ids" ? source.ids : source.excluded;
    if (!Array.isArray(ids)) throw new Error("Export selection IDs must be an array");
    const unique = new Set<string>();
    for (const id of ids) {
      if (typeof id !== "string" || !id.trim() || unique.has(id)) throw new Error("Export selection IDs must be unique nonempty strings");
      unique.add(id);
    }
    selection = source.kind === "ids"
      ? Object.freeze({ kind: "ids", ids: Object.freeze([...unique]) })
      : Object.freeze({ kind: "query", filter: parseFilter(source.filter, schema.filterColumns), excluded: Object.freeze([...unique]) });
  }
  return Object.freeze({ format: request.format, state, selection });
}

/** App callback creates the artifact; only the accepted result should be offered for download. */
export function createServerExport<Artifact>(schema: TableStateSchema, onExport?: (request: TableExportRequest, signal: AbortSignal) => Promise<Artifact>) {
  return createServerExportWith(schema, parsePagination, onExport);
}

export function createServerExportWith<Artifact, Pagination extends ServerPagination>(schema: TableStateSchema, readPagination: (value: unknown) => Pagination, onExport?: (request: TableExportRequest<Pagination>, signal: AbortSignal) => Promise<Artifact>) {
  let snapshot: ServerExportSnapshot<Artifact, Pagination> = { accepted: null, requested: null, pending: false, error: null };
  let sequence = 0n;
  let controller: AbortController | undefined;
  let disposed = false;
  let clearing = false;
  async function request(value: TableExportRequest<Pagination>): Promise<ServerExportOutcome> {
    if (disposed) return "disposed";
    if (!onExport) return "unavailable";
    if (clearing) return "canceled";
    if (snapshot.pending) return "busy";
    const token = ++sequence;
    const current = new AbortController();
    controller = current;
    snapshot = { ...snapshot, requested: null, pending: true, error: null };
    try {
      const captured = capture(value, schema, readPagination);
      snapshot = { ...snapshot, requested: captured };
      const artifact = await onExport(captured, current.signal);
      if (disposed) return "disposed";
      if (token !== sequence) return "canceled";
      snapshot = { accepted: { request: captured, artifact }, requested: null, pending: false, error: null };
      return "accepted";
    } catch (error) {
      if (disposed) return "disposed";
      if (token !== sequence) return "canceled";
      snapshot = { ...snapshot, pending: false, error };
      return "failed";
    } finally { if (token === sequence) controller = undefined; }
  }
  function clear() {
    if (clearing) return;
    clearing = true;
    sequence++;
    const previous = controller;
    controller = undefined;
    snapshot = { accepted: null, requested: null, pending: false, error: null };
    try { previous?.abort(); } finally { clearing = false; }
  }
  return {
    available: onExport !== undefined,
    getSnapshot: () => snapshot,
    request,
    retry: () => snapshot.requested ? request(snapshot.requested) : Promise.resolve<ServerExportOutcome>(disposed ? "disposed" : onExport ? "failed" : "unavailable"),
    clear,
    dispose() { disposed = true; clear(); },
  };
}
