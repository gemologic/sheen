import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { createSavedViews } from "@gemologic/sheen-table";
import type { SavedViewOutcome, SavedViewRecord, SavedViewsAdapter, SavedViewsSnapshot, TableState } from "@gemologic/sheen-table";
import { Button, Checkbox, Input } from "@gemologic/sheen";
import { exportSchema, exportState } from "../fixtures/table-export";

function view(value: unknown): SavedViewRecord {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string" || !("name" in value) || typeof value.name !== "string" || !("state" in value) || typeof value.state !== "string") throw new Error("Invalid saved view response");
  return { id: value.id, name: value.name, state: value.state };
}

export default function TableViewsFixture() {
  const session = typeof location === "undefined" ? "demo" : new URLSearchParams(location.search).get("session") ?? "demo";
  const [reject, setReject] = createSignal(false);
  const [name, setName] = createSignal("My view");
  const [state, setState] = createSignal<TableState>(exportState);
  const endpoint = () => `/api/table-views?${new URLSearchParams({ session, reject: String(reject()) })}`;
  const adapter: SavedViewsAdapter = {
    async list(signal) {
      const response = await fetch(endpoint(), { signal });
      if (!response.ok) throw new Error(`View list failed (${response.status})`);
      const value: unknown = await response.json();
      if (!Array.isArray(value)) throw new Error("Invalid saved view list");
      return value.map(view);
    },
    async save(saved, signal) {
      const response = await fetch(endpoint(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(saved), signal });
      if (!response.ok) throw new Error(`View save failed (${response.status})`);
      return view(await response.json());
    },
    async delete(id, signal) {
      const response = await fetch(endpoint(), { method: "DELETE", body: id, signal });
      if (!response.ok) throw new Error(`View delete failed (${response.status})`);
    },
  };
  const controller = createSavedViews(adapter, exportSchema);
  const [snapshot, setSnapshot] = createSignal<SavedViewsSnapshot>(controller.getSnapshot());
  const [ready, setReady] = createSignal(false);
  const [restoreError, setRestoreError] = createSignal(false);
  let alive = true;
  function publish() { if (alive) setSnapshot(controller.getSnapshot()); }
  async function finish(pending: Promise<SavedViewOutcome>) { publish(); await pending; publish(); }
  function restore(saved: SavedViewRecord) {
    const result = controller.restore(saved.id);
    if (result.kind === "accepted") { setState(result.state); setRestoreError(false); }
    else setRestoreError(true);
  }
  onMount(() => setReady(true));
  onCleanup(() => { alive = false; controller.dispose(); });
  return <main>
    <h1>Saved table views</h1>
    <Input label="View name" value={name()} onInput={event => setName(event.currentTarget.value)} />
    <Input label="Current table search" value={state().search} onInput={event => setState(current => ({ ...current, search: event.currentTarget.value }))} />
    <Checkbox label="Reject view operations" checked={reject()} onCheckedChange={setReject} />
    <Button disabled={snapshot().pending !== null} onClick={() => void finish(controller.list())}>List views</Button>
    <Button disabled={snapshot().pending !== null} onClick={() => void finish(controller.save(name(), state()))}>Save view</Button>
    <Show when={snapshot().accepted?.[0]}>{saved => <>
      <Button disabled={snapshot().pending !== null} onClick={() => restore(saved())}>Restore {saved().name}</Button>
      <Button disabled={snapshot().pending !== null} onClick={() => void finish(controller.delete(saved().id))}>Delete {saved().name}</Button>
    </>}</Show>
    <Show when={snapshot().error}><p role="alert">View operation failed. Existing views and current table state were retained.</p><Button onClick={() => void finish(controller.retry())}>Retry view operation</Button></Show>
    <Show when={restoreError()}><p role="alert">This saved view is incompatible with the current table.</p></Show>
    <ul aria-label="Saved views"><For each={snapshot().accepted ?? []}>{saved => <li>{saved.name}</li>}</For></ul>
    <output aria-label="View activity">{snapshot().pending ? "Pending" : "Idle"}</output>
    <output aria-label="Current search state">{state().search}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
