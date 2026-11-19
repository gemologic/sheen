import { assessCursorPage, assessServerPage, parseServerPagination } from "./pagination.ts";
import type { CursorPageAssessment, CursorPageResult, PageResult, ServerPageAssessment, ServerPagination } from "./pagination.ts";

export interface TableRequestState { readonly pagination: ServerPagination }
export interface TableRequestSnapshot<State, Result> {
  readonly accepted: { readonly state: State; readonly result: Result } | null;
  readonly requested: State | null;
  readonly pending: boolean;
  readonly error: unknown;
}
export type TableRequestOutcome = "accepted" | "failed" | "superseded" | "disposed";
export interface InitialTableResult<State, Result> { readonly state: State; readonly result: Result }

function cursorResult(result: PageResult<unknown> | CursorPageResult<unknown>): result is CursorPageResult<unknown> {
  return "nextCursor" in result && "previousCursor" in result;
}

/** The pagination kind selects the response contract; a mismatched shape fails instead of being coerced. */
function assess(pagination: ServerPagination, result: PageResult<unknown> | CursorPageResult<unknown>): ServerPageAssessment<unknown> | CursorPageAssessment<unknown> {
  const parsed = parseServerPagination(pagination);
  if (parsed !== false && "kind" in parsed) {
    if (!cursorResult(result)) throw new Error("Cursor pagination results require nextCursor and previousCursor");
    return assessCursorPage(parsed, result);
  }
  if (cursorResult(result)) throw new Error("Numbered and complete server results must report total instead of cursors");
  return assessServerPage(parsed, result);
}

/** Framework-neutral request ownership. Read snapshots before/after awaiting request in the UI adapter. */
export function createTableRequests<State extends TableRequestState, Result extends PageResult<unknown> | CursorPageResult<unknown>>(
  onStateChange: (state: State, signal: AbortSignal) => Promise<Result>,
  initial?: InitialTableResult<State, Result>,
) {
  let snapshot: TableRequestSnapshot<State, Result> = { accepted: null, requested: null, pending: false, error: null };
  if (initial) {
    const state = structuredClone(initial.state);
    const assessment = assess(state.pagination, initial.result);
    if (assessment.kind !== "accepted") throw new Error("Initial table results must describe a valid accepted page, not a page requiring refetch");
    snapshot = { accepted: { state: { ...state, pagination: assessment.pagination }, result: initial.result }, requested: null, pending: false, error: null };
  }
  let sequence = 0n;
  let controller: AbortController | undefined;
  let disposed = false;
  let clearing = false;

  async function request(value: State): Promise<TableRequestOutcome> {
    if (disposed) return "disposed";
    if (clearing) return "superseded";
    const token = ++sequence;
    controller?.abort();
    if (disposed) return "disposed";
    if (token !== sequence) return "superseded";
    const current = new AbortController();
    controller = current;
    snapshot = { ...snapshot, requested: null, pending: true, error: null };
    try {
      // Separate transport state from both the caller and the publicly readable snapshot.
      let state: State = structuredClone(value);
      parseServerPagination(state.pagination);
      snapshot = { ...snapshot, requested: structuredClone(state), pending: true, error: null };
      for (let attempt = 0; attempt < 4; attempt++) {
        const result = await onStateChange(structuredClone(state), current.signal);
        if (disposed) return "disposed";
        if (token !== sequence) return "superseded";
        const assessment = assess(state.pagination, result);
        state = { ...state, pagination: assessment.pagination };
        if (assessment.kind === "accepted") {
          snapshot = { accepted: { state, result }, requested: null, pending: false, error: null };
          return "accepted";
        }
      }
      throw new Error("Server page kept moving during clamping; retry the latest query");
    } catch (error) {
      if (disposed) return "disposed";
      if (token !== sequence) return "superseded";
      snapshot = { ...snapshot, pending: false, error };
      return "failed";
    } finally { if (token === sequence) controller = undefined; }
  }

  function clear(): void {
    if (clearing) return;
    clearing = true;
    sequence++;
    const previous = controller;
    controller = undefined;
    snapshot = { accepted: null, requested: null, pending: false, error: null };
    try { previous?.abort(); }
    finally { clearing = false; }
  }

  return {
    getSnapshot: (): TableRequestSnapshot<State, Result> => snapshot,
    request,
    retry: (): Promise<TableRequestOutcome> => snapshot.requested ? request(snapshot.requested) : Promise.resolve(disposed ? "disposed" : "failed"),
    clear,
    dispose: (): void => { disposed = true; clear(); },
  };
}
