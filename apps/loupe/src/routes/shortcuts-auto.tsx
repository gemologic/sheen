import { Show, createSignal } from "solid-js";
import { Button, Input, ShortcutPending, ShortcutProvider, useShortcut, useShortcutBindings } from "@gemologic/sheen";

function Bindings(props: { run: () => void }) {
  useShortcut({ keys: "mod+j", scope: "global", label: "Jump", group: "Navigation", run: () => props.run() });
  const bindings = useShortcutBindings();
  return <><output aria-label="Automatic binding">{bindings().map(binding => binding.displayKeys).join("; ")}</output><ShortcutPending /></>;
}

export default function AutomaticShortcuts() {
  const [mounted, setMounted] = createSignal(true);
  const [count, setCount] = createSignal(0);
  return <main><h1>Automatic shortcut platform</h1>
    <Button onClick={() => setMounted(value => !value)}>Toggle automatic provider</Button>
    <Input label="Automatic draft" />
    <output aria-label="Automatic count">{count()}</output>
    <Show when={mounted()}><ShortcutProvider development={true}><Bindings run={() => setCount(value => value + 1)} /></ShortcutProvider></Show>
  </main>;
}
