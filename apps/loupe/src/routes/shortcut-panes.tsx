import { Show, createSignal } from "solid-js";
import { Button, Dialog, DropdownMenu, Input, Select, ShortcutPending, ShortcutProvider, ShortcutScope, useShortcut } from "@gemologic/sheen";

function Workspace() {
  const [last, setLast] = createSignal("none");
  const [right, setRight] = createSignal(true);
  for (const scope of ["global", "view", "left", "right"]) {
    useShortcut({ keys: "g", scope, label: scope, group: "Navigation", run: () => { setLast(scope); } });
    useShortcut({ keys: "mod+j", scope, label: `Jump ${scope}`, group: "Navigation", run: () => { setLast(`jump ${scope}`); } });
  }
  useShortcut({ keys: "x i", scope: "left", label: "Left inbox", group: "Navigation", run: () => { setLast("inbox"); } });
  return <main><h1>Focus shortcut scopes</h1>
    <Button onClick={() => setLast("ready")}>Outside scope</Button>
    <Button onClick={() => setRight(value => !value)}>Toggle right pane</Button>
    <output aria-label="Scope action">{last()}</output>
    <ShortcutScope scope="view"><Button>View control</Button>
      <ShortcutScope scope="left"><Button>Left control</Button><Input label="Left draft" />
        <DropdownMenu trigger="Pane menu" items={[
          { id: "alpha", kind: "action", label: "Alpha", onSelect: () => setLast("alpha") },
          { id: "gamma", kind: "action", label: "Gamma", onSelect: () => setLast("gamma") },
          { id: "nested", kind: "submenu", label: "Nested actions", items: [
            { id: "beta", kind: "action", label: "Beta", onSelect: () => setLast("beta") },
            { id: "garden", kind: "action", label: "Garden", onSelect: () => setLast("garden") },
          ] },
        ]} />
        <Select label="Pane choice" defaultValue="alpha" options={[{ value: "alpha", label: "Alpha" }, { value: "gamma", label: "Gamma" }]} />
        <Dialog title="Pane modal" trigger="Open pane modal"><p>Background scopes are suspended.</p></Dialog>
      </ShortcutScope>
      <Show when={right()}><ShortcutScope scope="right"><Button>Right control</Button></ShortcutScope></Show>
    </ShortcutScope>
    <ShortcutPending />
  </main>;
}

export default function ShortcutPanes() { return <ShortcutProvider platform="other" development={true}><Workspace /></ShortcutProvider>; }
