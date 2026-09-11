export type CellEditValue = string | number | boolean | null;

export interface CellCommitRequest<Value extends CellEditValue> {
  readonly commitId: bigint;
  readonly value: Value;
  readonly previous: Value;
}
export type CellCommitResult<Value extends CellEditValue, Conflict> =
  | { readonly kind: "accepted"; readonly value: Value }
  | { readonly kind: "conflict"; readonly current: Value; readonly detail: Conflict };
export type CellCommitAttempt<Value extends CellEditValue> = CellCommitRequest<Value>;
export interface CellEditConflict<Value extends CellEditValue, Conflict> {
  readonly commitId: bigint;
  readonly attempted: Value;
  readonly current: Value;
  readonly detail: Conflict;
}
export interface CellEditSnapshot<Value extends CellEditValue, Conflict> {
  readonly committed: Value;
  readonly draft: { readonly value: Value } | null;
  readonly editing: boolean;
  readonly pending: boolean;
  readonly invalid: string | null;
  readonly stale: boolean;
  readonly error: unknown;
  readonly attempt: CellCommitAttempt<Value> | null;
  readonly conflict: CellEditConflict<Value, Conflict> | null;
}
export type CellCommitOutcome = "accepted" | "conflict" | "invalid" | "failed" | "busy" | "superseded" | "changed" | "inactive" | "disposed";
export interface CellEditOptions<Value extends CellEditValue> {
  readonly validate?: (value: Value) => string | null;
  readonly equals?: (left: Value, right: Value) => boolean;
}

function assertValue(value: unknown): asserts value is CellEditValue {
  if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error("Cell edit values must be strings, finite numbers, booleans, or null");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Cell edit numbers must be finite");
}

/** Framework-neutral single-cell ownership. UIs publish snapshots around awaited methods. */
export function createCellEdit<Value extends CellEditValue, Conflict = unknown>(
  initial: Value,
  onCellCommit: (request: CellCommitRequest<Value>, signal: AbortSignal) => Promise<CellCommitResult<Value, Conflict>>,
  options: CellEditOptions<Value> = {},
) {
  assertValue(initial);
  const equals = options.equals ?? ((left: Value, right: Value) => Object.is(left, right));
  let snapshot: CellEditSnapshot<Value, Conflict> = Object.freeze({ committed: initial, draft: null, editing: false, pending: false, invalid: null, stale: false, error: null, attempt: null, conflict: null });
  let editBase: { readonly value: Value } | null = null;
  let draftRevision = 0n;
  let sequence = 0n;
  let nextCommitId = 0n;
  let retryRevision: bigint | null = null;
  let pendingRevision: bigint | null = null;
  let controller: AbortController | undefined;
  let disposed = false;
  let clearing = false;

  const draft = (value: Value) => Object.freeze({ value });
  const attempt = (commitId: bigint, value: Value, previous: Value) => Object.freeze({ commitId, value, previous });
  function publish(value: CellEditSnapshot<Value, Conflict>): void { snapshot = Object.freeze(value); }

  function begin(): boolean {
    if (disposed || clearing || snapshot.editing) return false;
    editBase = draft(snapshot.committed);
    draftRevision++;
    retryRevision = null;
    publish({ ...snapshot, draft: draft(snapshot.committed), editing: true, invalid: null, stale: false, error: null, attempt: null, conflict: null });
    return true;
  }

  function setDraft(value: Value): void {
    assertValue(value);
    if (disposed || clearing || !snapshot.editing) throw new Error("Cell is not available for editing");
    draftRevision++;
    publish({ ...snapshot, draft: draft(value), invalid: null });
  }

  async function commit(): Promise<CellCommitOutcome> {
    if (disposed) return "disposed";
    if (clearing) return "superseded";
    const candidate = snapshot.draft;
    if (!snapshot.editing || !candidate) return "inactive";
    const candidateRevision = draftRevision;
    if (snapshot.pending && pendingRevision === candidateRevision) return "busy";
    const token = ++sequence;
    const previousController = controller;
    controller = undefined;
    previousController?.abort();
    if (disposed) return "disposed";
    if (token !== sequence) return "superseded";
    let validation: string | null;
    try { validation = options.validate?.(candidate.value) ?? null; }
    catch (error) {
      retryRevision = null;
      pendingRevision = null;
      publish({ ...snapshot, pending: false, error, attempt: null });
      return "failed";
    }
    if (validation !== null) {
      if (typeof validation !== "string" || !validation.trim()) throw new Error("Cell validation messages must be nonempty strings");
      retryRevision = null;
      pendingRevision = null;
      publish({ ...snapshot, pending: false, invalid: validation, error: null, attempt: null });
      return "invalid";
    }
    const commitId = ++nextCommitId;
    const captured = attempt(commitId, candidate.value, snapshot.committed);
    const current = new AbortController();
    controller = current;
    retryRevision = null;
    pendingRevision = candidateRevision;
    publish({ ...snapshot, pending: true, invalid: null, error: null, attempt: captured, conflict: null });
    try {
      const result = await onCellCommit(captured, current.signal);
      if (disposed) return "disposed";
      if (token !== sequence) return "superseded";
      assertValue(result.kind === "accepted" ? result.value : result.current);
      if (result.kind === "conflict") {
        pendingRevision = null;
        retryRevision = candidateRevision;
        publish({ ...snapshot, committed: result.current, pending: false, stale: true, error: null, conflict: Object.freeze({ commitId, attempted: candidate.value, current: result.current, detail: result.detail }) });
        return "conflict";
      }
      const changed = draftRevision !== candidateRevision;
      retryRevision = null;
      pendingRevision = null;
      editBase = changed ? editBase : null;
      publish({ ...snapshot, committed: result.value, draft: changed ? snapshot.draft : null, editing: changed, pending: false, invalid: null, stale: changed, error: null, attempt: null, conflict: null });
      return "accepted";
    } catch (error) {
      if (disposed) return "disposed";
      if (token !== sequence) return "superseded";
      retryRevision = candidateRevision;
      pendingRevision = null;
      publish({ ...snapshot, pending: false, error });
      return "failed";
    } finally {
      if (token === sequence) controller = undefined;
    }
  }

  function retry(): Promise<CellCommitOutcome> {
    if (disposed) return Promise.resolve("disposed");
    if (retryRevision === null || !snapshot.attempt) return Promise.resolve("inactive");
    if (retryRevision !== draftRevision) return Promise.resolve("changed");
    return commit();
  }

  function acceptRefetch(value: Value): boolean {
    assertValue(value);
    if (disposed || clearing) return false;
    if (!snapshot.editing) {
      editBase = null;
      publish({ ...snapshot, committed: value, stale: false });
      return true;
    }
    const stale = editBase !== null && !equals(editBase.value, value);
    publish({ ...snapshot, committed: value, stale: snapshot.stale || stale });
    return true;
  }

  function discard(): void {
    if (clearing) return;
    clearing = true;
    sequence++;
    const previousController = controller;
    controller = undefined;
    retryRevision = null;
    pendingRevision = null;
    editBase = null;
    publish({ ...snapshot, draft: null, editing: false, pending: false, invalid: null, stale: false, error: null, attempt: null, conflict: null });
    try { previousController?.abort(); }
    finally { clearing = false; }
  }

  return {
    getSnapshot: (): CellEditSnapshot<Value, Conflict> => snapshot,
    begin,
    setDraft,
    commit,
    retry,
    acceptRefetch,
    discard,
    dispose(): void { disposed = true; discard(); },
  };
}
