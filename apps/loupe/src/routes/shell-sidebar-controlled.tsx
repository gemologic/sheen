import { createSignal } from "solid-js";
import { Button, Input, Select, ShortcutProvider } from "@gemologic/sheen";
import { AppShell } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function ControlledSidebar() {
  const [open, setOpen] = createSignal(true);
  const [accept, setAccept] = createSignal(false);
  const [proposals, setProposals] = createSignal(0);
  return <ShortcutProvider development={true}><AppShell label="Controlled workspace" shortcutHelp sidebarOpen={open()}
    onSidebarOpenChange={next => { setProposals(value => value + 1); if (accept()) setOpen(next); }}
    sidebar={<><Input label="Sidebar draft" /><Select label="Sidebar cadence" defaultValue="live" options={[{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }]} /></>}>
    <Button onClick={() => setAccept(true)}>Accept sidebar changes</Button>
    <output aria-label="Sidebar proposals">{proposals()}</output>
  </AppShell></ShortcutProvider>;
}
