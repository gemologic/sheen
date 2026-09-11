import { Show, createSignal } from "solid-js";
import { Button, Input, ShortcutPending, ShortcutProvider, ShortcutSheet, Switch, useShortcut } from "@gemologic/sheen";

function Bindings(props: { jumpKey: string; openHelp: () => void; onAction: (action: string) => void }) {
  useShortcut({ keys: "x i", scope: "global", label: "Open inbox", group: "Navigation", run: () => props.onAction("inbox") });
  useShortcut({ keys: "x p", scope: "global", label: "Open projects", group: "Navigation", run: () => props.onAction("projects") });
  useShortcut({ keys: "?", scope: "global", label: "Help", group: "Navigation", run: () => { props.onAction("help"); props.openHelp(); } });
  useShortcut({ keys: "mod+b i", scope: "global", label: "Modified inbox", group: "Navigation", run: () => props.onAction("modified inbox") });
  useShortcut({ keys: "g", scope: "global", label: "Global go", group: "Navigation", run: () => props.onAction("global") });
  useShortcut({ keys: "g", scope: "pane", label: "Pane go", group: "Navigation", run: () => props.onAction("pane") });
  useShortcut({ get keys() { return props.jumpKey; }, scope: "global", label: "Jump", group: "Navigation", run: () => props.onAction("jump") });
  useShortcut({ keys: "mod+e", scope: "global", label: "Fail", group: "Navigation", run: () => { throw new Error("Shortcut failed"); } });
  useShortcut({ keys: "mod+y", scope: "global", label: "Async failure", group: "Actions", run: async () => {
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: true }) });
    await response.text();
    if (!response.ok) throw new Error("Shortcut request rejected");
  } });
  return <><p>Bindings mounted</p><ShortcutPending /></>;
}
export default function ShortcutFixture() {
  const [mounted, setMounted] = createSignal(true);
  const [bindings, setBindings] = createSignal(true);
  const [pane, setPane] = createSignal(false);
  const [count, setCount] = createSignal(0);
  const [last, setLast] = createSignal("none");
  const [errors, setErrors] = createSignal(0);
  const [jumpKey, setJumpKey] = createSignal("mod+j");
  const [refreshing, setRefreshing] = createSignal(false);
  const [characterShortcuts, setCharacterShortcuts] = createSignal(true);
  const [helpOpen, setHelpOpen] = createSignal(false);
  let helpReturn: HTMLElement | undefined;
  const changeHelp = (open: boolean) => {
    if (open && document.activeElement instanceof HTMLElement) helpReturn = document.activeElement;
    setHelpOpen(open);
  };
  const refreshBinding = async (operation: "rebind" | "availability" = "rebind") => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      await response.text();
      if (!response.ok) throw new Error("Binding refresh failed");
      if (operation === "availability") setBindings(value => !value);
      else setJumpKey(key => key === "mod+j" ? "mod+h" : "mod+j");
    } catch { setErrors(value => value + 1); }
    finally { setRefreshing(false); }
  };
  return <main><h1>Shortcut ownership</h1>
    <Button onClick={() => setMounted(value => !value)}>Toggle provider</Button>
    <Button onClick={() => setBindings(value => !value)}>Toggle bindings</Button>
    <Button onClick={() => setPane(value => !value)}>Toggle pane scope</Button>
    <Switch label="Character shortcuts" checked={characterShortcuts()} onCheckedChange={setCharacterShortcuts} />
    <Button disabled={refreshing()} onClick={() => { void refreshBinding(); }}>Refresh jump binding</Button>
    <Button disabled={refreshing()} onClick={() => { void refreshBinding("availability"); }}>Refresh binding availability</Button>
    <output aria-label="Jump binding">{jumpKey()}</output>
    <output aria-label="Refreshing binding">{String(refreshing())}</output>
    <Input label="Shortcut draft" />
    <Input label="Handled shortcut draft" onKeyDown={event => { if (event.ctrlKey && event.key === "j") event.preventDefault(); }} />
    <div class="loupe-shortcut-editor" contentEditable role="textbox" aria-label="Editable shortcut prose" tabIndex={0} />
    <output aria-label="Pane active">{String(pane())}</output>
    <output aria-label="Action count">{count()}</output><output aria-label="Last action">{last()}</output><output aria-label="Errors">{errors()}</output>
    <Show when={mounted()}><ShortcutProvider platform="other" development={true} characterShortcuts={characterShortcuts()} activeScopes={pane() ? ["global", "pane"] : ["global"]} onError={() => setErrors(value => value + 1)}>
      <Show when={bindings()}><Bindings jumpKey={jumpKey()} openHelp={() => changeHelp(true)} onAction={action => { setLast(action); setCount(value => value + 1); }} /></Show>
      <ShortcutSheet title="Keyboard shortcuts" trigger="Keyboard shortcuts" open={helpOpen()} onOpenChange={changeHelp} returnFocus={() => helpReturn} />
    </ShortcutProvider></Show>
  </main>;
}
