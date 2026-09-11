import { Show, createSignal } from "solid-js";
import { Button, Input } from "@gemologic/sheen";
import { AppShell, useUnsavedChanges } from "@gemologic/sheen-patterns";
import { A, useBeforeLeave } from "@solidjs/router";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";

function Editor(props: { secondary?: boolean }) {
  const [draft, setDraft] = createSignal("");
  const [saved, setSaved] = createSignal("");
  useUnsavedChanges(() => draft() !== saved());
  return <><Input label={props.secondary ? "Secondary draft" : "Unsaved draft"} value={draft()} onInput={event => setDraft(event.currentTarget.value)} />
    <Button onClick={() => setSaved(draft())}>{props.secondary ? "Save secondary" : "Save draft"}</Button>
    <output aria-label={props.secondary ? "Secondary dirty" : "Editor dirty"}>{String(draft() !== saved())}</output></>;
}

export default function UnsavedFixture() {
  const router = useSolidRouterAdapter();
  const [blocked, setBlocked] = createSignal(false);
  useBeforeLeave(event => { if (blocked()) event.preventDefault(); });
  const [editor, setEditor] = createSignal(true);
  const [secondary, setSecondary] = createSignal(false);
  return <AppShell router={router} label="Unsaved changes qualification" header={<h1>Unsaved changes</h1>}>
    <A href="/browser-status">Open browser status</A>
    <Button onClick={() => setBlocked(value => !value)}>Toggle app blocker</Button>
    <Button onClick={() => setEditor(value => !value)}>Toggle editor</Button>
    <Show when={editor()}><Editor /></Show>
    <Button onClick={() => setSecondary(value => !value)}>Toggle secondary</Button>
    <Show when={secondary()}><Editor secondary /></Show>
  </AppShell>;
}
