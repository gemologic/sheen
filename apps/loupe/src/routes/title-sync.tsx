import { A } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { Button, Input } from "@gemologic/sheen";
import { AppShell, useUnsavedChanges } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import "@gemologic/sheen-patterns/styles.css";

function DirtyEditor() {
  const [draft, setDraft] = createSignal("");
  const [saved, setSaved] = createSignal("");
  useUnsavedChanges(() => draft() !== saved());
  return <>
    <Input label="Title fixture draft" value={draft()} onInput={event => setDraft(event.currentTarget.value)} />
    <Button onClick={() => setSaved(draft())}>Save title fixture</Button>
  </>;
}

export default function TitleSyncFixture() {
  const router = useSolidRouterAdapter();
  const [mounted, setMounted] = createSignal(true);
  const title = () => new URLSearchParams(router.location().search).get("view") === "orders"
    ? "Orders · Sheen"
    : 'Overview <Sheen> & "quotes"';
  return <div>
    <Button onClick={() => setMounted(value => !value)}>{mounted() ? "Unmount shell" : "Mount shell"}</Button>
    <Show when={mounted()}><AppShell router={router} label="Title synchronization fixture" documentTitle={title()}>
      <A class="loupe-title-sync-link" href="/title-sync?view=orders">Open orders</A>
      <DirtyEditor />
    </AppShell></Show>
  </div>;
}
