export interface SearchSnapshot<Result> {
  readonly accepted: { readonly query: string; readonly result: Result } | null;
  readonly requested: string | null;
  readonly pending: boolean;
  readonly error: unknown;
}
export type SearchOutcome = "accepted" | "failed" | "superseded" | "cleared" | "disposed";
export interface InitialSearchResult<Result> {
  readonly query: string;
  readonly result: Result;
}

/** Owns trailing scheduling, not a data cache. Evaluate against the current complete client dataset. */
export function createDebouncedSearch<Result>(evaluate: (query: string) => Result, delay = 120, initial?: InitialSearchResult<Result>) {
  if (!Number.isSafeInteger(delay) || delay < 0 || delay > 2147483647) throw new Error("Search delay must be a nonnegative timer-safe integer");
  if (initial && typeof initial.query !== "string") throw new Error("Initial search query must be a string");
  let snapshot: SearchSnapshot<Result> = { accepted: initial ? { query: initial.query, result: initial.result } : null, requested: null, pending: false, error: null };
  let sequence = 0n;
  let disposed = false;
  let task: { timer: ReturnType<typeof setTimeout>; finish: (outcome: SearchOutcome) => void } | undefined;
  function cancel(outcome: SearchOutcome) {
    sequence++;
    const previous = task;
    task = undefined;
    if (previous) { clearTimeout(previous.timer); previous.finish(outcome); }
  }
  function request(query: string): Promise<SearchOutcome> {
    if (disposed) return Promise.resolve("disposed");
    cancel("superseded");
    const token = sequence;
    snapshot = { ...snapshot, requested: query, pending: true, error: null };
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        try {
          const result = evaluate(query);
          if (token !== sequence || disposed) return;
          snapshot = { accepted: { query, result }, requested: null, pending: false, error: null };
          task = undefined;
          resolve("accepted");
        } catch (error) {
          if (token !== sequence || disposed) return;
          snapshot = { ...snapshot, pending: false, error };
          task = undefined;
          resolve("failed");
        }
      }, delay);
      task = { timer, finish: resolve };
    });
  }
  function clear() {
    cancel(disposed ? "disposed" : "cleared");
    snapshot = { accepted: null, requested: null, pending: false, error: null };
  }
  return {
    getSnapshot: () => snapshot,
    request,
    retry: () => snapshot.requested !== null ? request(snapshot.requested) : Promise.resolve<SearchOutcome>(disposed ? "disposed" : "failed"),
    clear,
    dispose: () => { disposed = true; clear(); },
  };
}
