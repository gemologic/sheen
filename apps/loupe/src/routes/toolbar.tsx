import { createSignal } from "solid-js";
import { Button, Input, Stack, ThemeScope } from "@gemologic/sheen";
import { Toolbar } from "@gemologic/sheen-patterns";
import type { ToolbarGroup } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function ToolbarFixture() {
  const [narrow, setNarrow] = createSignal(false);
  const [tiny, setTiny] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [light, setLight] = createSignal(false);
  const [checked, setChecked] = createSignal(false);
  const [action, setAction] = createSignal("None");
  const [removed, setRemoved] = createSignal(false);
  const [cleared, setCleared] = createSignal(false);
  const [reversed, setReversed] = createSignal(false);
  const [copyDisabled, setCopyDisabled] = createSignal(false);
  const baseGroups = (): readonly ToolbarGroup[] => cleared() ? [] : [
    { id: "file", label: "File", items: [
      { kind: "action", id: "save", label: "Save document", onSelect: () => setAction("Saved") },
      { kind: "action", id: "disabled", label: "Unavailable", disabled: true, onSelect: () => setAction("Invalid") },
    ] },
    { id: "edit", label: "Edit", items: [
      ...(!removed() ? [{ kind: "action", id: "copy", label: "Copy selection", disabled: copyDisabled(), onSelect: () => setAction("Copied") } satisfies ToolbarGroup["items"][number]] : []),
      { kind: "action", id: "paste", label: "Paste selection", onSelect: () => setAction("Pasted") },
    ] },
    { id: "view", label: "View", items: [{ kind: "checkbox", id: "wrap", label: "Wrap lines", checked: checked(), onCheckedChange: setChecked }] },
  ];
  const groups = () => reversed() ? baseGroups().toReversed() : baseGroups();
  return <main><h1>Toolbar qualification</h1><Stack>
    <Button onClick={() => setNarrow(value => !value)}>Toggle toolbar width</Button>
    <Button onClick={() => setTiny(value => !value)}>Toggle tiny toolbar</Button>
    <Button onClick={() => setRtl(value => !value)}>Toggle toolbar direction</Button>
    <Button onClick={() => setLight(value => !value)}>Toggle toolbar theme</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setRemoved(true);
    }}>Remove copy after request</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setCleared(true);
    }}>Clear actions after request</Button>
    <Button onClick={() => setCleared(false)}>Restore actions</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setReversed(true);
    }}>Reverse groups after request</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setCopyDisabled(true);
    }}>Disable copy after request</Button>
    <ThemeScope theme={light() ? "paper" : "obsidian"} mode={light() ? "light" : "dark"} direction={rtl() ? "rtl" : "ltr"}>
      <div style={{ width: tiny() ? "80px" : narrow() ? "180px" : "800px", "max-width": "100%" }}>
        <Toolbar label="Document actions" groups={groups()} filter={<Input label="Filter documents" />} />
      </div>
    </ThemeScope>
    <output aria-label="Last action">{action()}</output>
    <output aria-label="Wrapped">{String(checked())}</output>
    <Input label="Outside toolbar" />
  </Stack></main>;
}
