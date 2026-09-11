import { Show, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import { Button, Input } from "@gemologic/sheen";
import { AppShell, PageHeader, useUnsavedChanges } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import "@gemologic/sheen-patterns/styles.css";

function SidebarEditor() {
  const [draft, setDraft] = createSignal("");
  const [saved, setSaved] = createSignal("");
  useUnsavedChanges(() => draft() !== saved());
  return <>
    <Input label="Sidebar editor" value={draft()} onInput={event => setDraft(event.currentTarget.value)} />
    <Button onClick={() => setSaved(draft())}>Save sidebar draft</Button>
    <output aria-label="Sidebar dirty">{String(draft() !== saved())}</output>
    <A href="/browser-status">Leave from sidebar</A>
  </>;
}

export default function SidebarUnsavedFixture() {
  const router = useSolidRouterAdapter();
  const [editor, setEditor] = createSignal(true);
  return <AppShell router={router} label="Sidebar unsaved workspace" header={<PageHeader title="Sidebar unsaved changes" />}
    sidebar={<Show when={editor()} fallback={<p>Sidebar editor removed</p>}><SidebarEditor /></Show>}>
    <A href="/browser-status">Leave sidebar workspace</A>
    <Button onClick={() => setEditor(value => !value)}>Toggle sidebar editor</Button>
  </AppShell>;
}
