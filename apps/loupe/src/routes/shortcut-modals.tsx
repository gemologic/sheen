import { Show, createSignal } from "solid-js";
import { Button, Dialog, ShortcutProvider, createConfirm, useShortcut } from "@gemologic/sheen";

function Workspace() {
  const [last, setLast] = createSignal("none");
  const [innerMounted, setInnerMounted] = createSignal(true);
  const confirmation = createConfirm();
  for (const scope of ["global", "first", "second"]) useShortcut({ keys: "g", scope, label: scope, group: "Actions", run: () => { setLast(scope); } });
  useShortcut({ keys: "x i", scope: "global", label: "Inbox", group: "Navigation", run: () => { setLast("inbox"); } });
  return <main><h1>Modal shortcut ownership</h1>
    <Button onClick={() => setLast("ready")}>Ready</Button>
    <output aria-label="Global action">{last()}</output>
    <Dialog title="First modal" trigger="Open first" shortcutScope="first">
      <output aria-label="First action">{last()}</output>
      <Button onClick={() => { void confirmation.confirm({ title: "Confirm action", description: "Keep background actions suspended." }); }}>Ask confirmation</Button>
      <confirmation.Dialog />
      <Show when={innerMounted()}><Dialog title="Second modal" trigger="Open second" shortcutScope="second">
        <output aria-label="Second action">{last()}</output>
        <Button onClick={() => setInnerMounted(false)}>Remove second modal</Button>
      </Dialog></Show>
      <Button onClick={() => setInnerMounted(true)}>Restore second modal</Button>
    </Dialog>
  </main>;
}

export default function ShortcutModals() { return <ShortcutProvider development={true}><Workspace /></ShortcutProvider>; }
