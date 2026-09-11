import { createSignal } from "solid-js";
import { Button, ThemeScope, Tree, TreeItem } from "@gemologic/sheen";

export default function TreeFixture() {
  const [selected, setSelected] = createSignal<readonly string[]>(["readme"]);
  const [expanded, setExpanded] = createSignal<readonly string[]>(["source"]);
  const [activated, setActivated] = createSignal("None");
  const [pending, setPending] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  async function refresh(): Promise<void> {
    if (pending()) return;
    setPending(true);
    try {
      const response = await fetch(`/api/tree?revision=${revision() + 1}&delay=300`);
      if (!response.ok) throw new Error(`Tree refresh failed (${response.status})`);
      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null || !("revision" in payload) || typeof payload.revision !== "number") throw new Error("Invalid tree response");
      setRevision(payload.revision);
    } finally { setPending(false); }
  }
  return <main class="loupe-tree-page">
    <h1>Tree</h1>
    <div class="actions"><Button disabled={pending()} onClick={() => void refresh()}>Refresh workspace</Button><output role="status" aria-live="polite">{pending() ? "Refreshing workspace" : `Accepted revision ${revision()}`}</output></div>
    <ThemeScope class="loupe-tree-surface">
      <Tree label="Workspace" selectionMode="multiple" selectedValues={selected()} onSelectionChange={setSelected} expandedValues={expanded()} onExpandedChange={setExpanded} onActivate={value => setActivated(value)}>
        <TreeItem value="source" label={`Source r${revision()}`}>
          <TreeItem value="app" label="App" />
          <TreeItem value="tests" label="Tests" />
          {revision() > 0 ? <TreeItem value="worker" label={`Worker r${revision()}`} /> : null}
        </TreeItem>
        <TreeItem value="readme" label="README" />
        <TreeItem value="locked" label="Locked" disabled />
        <TreeItem value="archive" label="Archive">
          <TreeItem value="old" label="Old" />
        </TreeItem>
      </Tree>
      <dl><div><dt>Selected</dt><dd><output aria-label="Selected tree values">{selected().join(",") || "None"}</output></dd></div><div><dt>Activated</dt><dd><output aria-label="Activated tree value">{activated()}</output></dd></div></dl>
    </ThemeScope>
  </main>;
}
