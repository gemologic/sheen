import { Show, createEffect, createSignal, onMount } from "solid-js";
import { createTableUrlState } from "@gemologic/sheen-table";
import type { TableState } from "@gemologic/sheen-table";
import { Button, Input } from "@gemologic/sheen";
import { exportSchema, exportState } from "../fixtures/table-export";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";

export default function TableUrlFixture() {
  const router = useSolidRouterAdapter();
  const url = createTableUrlState(router, "table", exportSchema);
  const initial = url.read();
  const [state, setState] = createSignal<TableState>(initial.kind === "accepted" ? initial.state : exportState);
  const [invalid, setInvalid] = createSignal(initial.kind === "invalid");
  const [ready, setReady] = createSignal(false);
  createEffect(() => {
    const result = url.read();
    if (result.kind === "accepted") { setState(result.state); setInvalid(false); }
    if (result.kind === "absent") { setState(exportState); setInvalid(false); }
    if (result.kind === "invalid") setInvalid(true);
  });
  onMount(() => setReady(true));
  function updateSearch(search: string) { setState(current => ({ ...current, search })); }
  return <main>
    <h1>Versioned table URL state</h1>
    <Input label="Table search state" value={state().search} onInput={event => updateSearch(event.currentTarget.value)} />
    <Button onClick={() => url.write(state())}>Replace URL state</Button>
    <Button onClick={() => url.write(state(), { replace: false })}>Push URL state</Button>
    <Button onClick={() => url.clear()}>Clear URL state</Button>
    <Show when={invalid()}><p role="alert">The saved URL state is invalid. Current table state was retained.</p></Show>
    <output aria-label="Accepted table search">{state().search}</output>
    <output aria-label="Hydration state">{ready() ? "Ready" : "Server"}</output>
  </main>;
}
