import { deserializeState, serializeState } from "./table-state.ts";
import type { TableState, TableStateSchema } from "./table-state.ts";

export interface SavedViewRecord { readonly id: string; readonly name: string; readonly state: string }
export interface SavedViewSave { readonly id: string | null; readonly name: string; readonly state: string }
export interface SavedViewsAdapter {
  readonly list: (signal: AbortSignal) => Promise<readonly SavedViewRecord[]>;
  readonly save: (view: SavedViewSave, signal: AbortSignal) => Promise<SavedViewRecord>;
  readonly delete: (id: string, signal: AbortSignal) => Promise<void>;
}
export type SavedViewOperation =
  | { readonly kind: "list" }
  | { readonly kind: "save"; readonly view: SavedViewSave }
  | { readonly kind: "delete"; readonly id: string };
export interface SavedViewsSnapshot {
  readonly accepted: readonly SavedViewRecord[] | null;
  readonly pending: SavedViewOperation | null;
  readonly failed: SavedViewOperation | null;
  readonly error: unknown;
}
export type SavedViewOutcome = "accepted" | "failed" | "superseded" | "disposed";
export type SavedViewRestore =
  | { readonly kind: "accepted"; readonly state: TableState }
  | { readonly kind: "missing" }
  | { readonly kind: "invalid"; readonly error: unknown };

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || value.trim() !== value) throw new Error(`${label} must be a nonempty trimmed string`);
  return value;
}
function record(value: SavedViewRecord, label: string): SavedViewRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const keys = Object.keys(value);
  if (keys.length !== 3 || !keys.includes("id") || !keys.includes("name") || !keys.includes("state")) throw new Error(`${label} must contain exactly id, name, and state`);
  const id = text(value.id, `${label}.id`);
  const name = text(value.name, `${label}.name`);
  if (typeof value.state !== "string" || !value.state) throw new Error(`${label}.state must be a nonempty serialized string`);
  return Object.freeze({ id, name, state: value.state });
}
function records(value: readonly SavedViewRecord[]): readonly SavedViewRecord[] {
  if (!Array.isArray(value)) throw new Error("Saved view list must be an array");
  const result: SavedViewRecord[] = [];
  const ids = new Set<string>();
  let index = 0;
  for (const item of value) {
    const next = record(item, `views[${index}]`);
    if (ids.has(next.id)) throw new Error(`views[${index}] duplicates ID ${next.id}`);
    ids.add(next.id);
    result.push(next);
    index++;
  }
  return Object.freeze(result);
}
function operation(value: SavedViewOperation): SavedViewOperation {
  if (value.kind === "save") return Object.freeze({ kind: "save", view: Object.freeze({ ...value.view }) });
  return Object.freeze({ ...value });
}

/** Async saved-view ownership. Persistence and authorization stay in the app adapter. */
export function createSavedViews(adapter: SavedViewsAdapter, schema: TableStateSchema) {
  let snapshot: SavedViewsSnapshot = Object.freeze({ accepted: null, pending: null, failed: null, error: null });
  let sequence = 0n;
  let controller: AbortController | undefined;
  let disposed = false;
  let clearing = false;
  async function run(source: SavedViewOperation): Promise<SavedViewOutcome> {
    if (disposed) return "disposed";
    if (clearing) return "superseded";
    const requested = operation(source);
    const token = ++sequence;
    const prior = controller;
    controller = undefined;
    prior?.abort();
    if (disposed) return "disposed";
    if (token !== sequence) return "superseded";
    const current = new AbortController();
    controller = current;
    snapshot = Object.freeze({ ...snapshot, pending: requested, failed: null, error: null });
    try {
      if (requested.kind === "list") {
        const listed = records(await adapter.list(current.signal));
        if (disposed) return "disposed";
        if (token !== sequence) return "superseded";
        snapshot = Object.freeze({ accepted: listed, pending: null, failed: null, error: null });
        return "accepted";
      }
      if (requested.kind === "save") {
        const saved = record(await adapter.save(requested.view, current.signal), "saved view");
        if (disposed) return "disposed";
        if (token !== sequence) return "superseded";
        if (requested.view.id !== null && requested.view.id !== saved.id) throw new Error("Saved view adapter changed the requested ID");
        deserializeState(saved.state, schema);
        const existing = snapshot.accepted ?? [];
        const index = existing.findIndex(view => view.id === saved.id);
        const accepted = index < 0 ? [...existing, saved] : existing.map(view => view.id === saved.id ? saved : view);
        snapshot = Object.freeze({ accepted: Object.freeze(accepted), pending: null, failed: null, error: null });
        return "accepted";
      }
      await adapter.delete(requested.id, current.signal);
      if (disposed) return "disposed";
      if (token !== sequence) return "superseded";
      snapshot = Object.freeze({ accepted: snapshot.accepted ? Object.freeze(snapshot.accepted.filter(view => view.id !== requested.id)) : null, pending: null, failed: null, error: null });
      return "accepted";
    } catch (error) {
      if (disposed) return "disposed";
      if (token !== sequence) return "superseded";
      snapshot = Object.freeze({ ...snapshot, pending: null, failed: requested, error });
      return "failed";
    } finally { if (token === sequence) controller = undefined; }
  }
  function save(name: string, state: TableState, id: string | null = null): Promise<SavedViewOutcome> {
    const view = Object.freeze({ id: id === null ? null : text(id, "Saved view ID"), name: text(name, "Saved view name"), state: serializeState(state, schema) });
    return run({ kind: "save", view });
  }
  function restore(id: string): SavedViewRestore {
    try {
      const checked = text(id, "Saved view ID");
      const view = snapshot.accepted?.find(candidate => candidate.id === checked);
      if (!view) return Object.freeze({ kind: "missing" });
      return Object.freeze({ kind: "accepted", state: deserializeState(view.state, schema) });
    } catch (error) { return Object.freeze({ kind: "invalid", error }); }
  }
  function clear(): void {
    if (clearing) return;
    clearing = true;
    sequence++;
    const prior = controller;
    controller = undefined;
    snapshot = Object.freeze({ accepted: null, pending: null, failed: null, error: null });
    try { prior?.abort(); }
    finally { clearing = false; }
  }
  return {
    getSnapshot: (): SavedViewsSnapshot => snapshot,
    list: (): Promise<SavedViewOutcome> => run({ kind: "list" }),
    save,
    delete: (id: string): Promise<SavedViewOutcome> => run({ kind: "delete", id: text(id, "Saved view ID") }),
    restore,
    retry: (): Promise<SavedViewOutcome> => snapshot.failed ? run(snapshot.failed) : Promise.resolve(disposed ? "disposed" : "failed"),
    clear,
    dispose(): void { disposed = true; clear(); },
  };
}
