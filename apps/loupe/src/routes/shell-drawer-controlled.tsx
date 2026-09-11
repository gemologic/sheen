import { createSignal } from "solid-js";
import { Input, ShortcutProvider, Switch } from "@gemologic/sheen";
import { AppShell } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function ControlledDrawer() {
  const [open, setOpen] = createSignal(false);
  const [acceptClose, setAcceptClose] = createSignal(false);
  const [proposals, setProposals] = createSignal(0);
  return <ShortcutProvider development={true}><AppShell label="Drawer workspace" shortcutHelp mobileSidebarOpen={open()}
    onMobileSidebarOpenChange={next => { setProposals(value => value + 1); if (next || acceptClose()) setOpen(next); }}
    sidebar={<><Input label="Controlled drawer draft" /><Switch label="Accept drawer closure" checked={acceptClose()} onCheckedChange={setAcceptClose} /></>}>
    <Input label="Main drawer fixture draft" />
    <output aria-label="Drawer proposals">{proposals()}</output>
  </AppShell></ShortcutProvider>;
}
