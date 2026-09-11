import { children, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Button, Dialog, Input, Select, ShortcutProvider } from "@gemologic/sheen";

/** Qualification fixture for a retained sidebar owner with transient modal chrome. */
function Handoff() {
  const [phone, setPhone] = createSignal(false);
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;
  const content = children(() => <div data-sidebar-content=""><Input label="Sidebar draft" /><Select label="Sidebar choice" defaultValue="alpha" options={[{ value: "alpha", label: "Alpha" }, { value: "beta", label: "Beta" }]} /></div>);
  onMount(() => {
    const media = matchMedia("(max-width: 767px)");
    const update = () => { setOpen(false); setPhone(media.matches); };
    update();
    media.addEventListener("change", update);
    onCleanup(() => media.removeEventListener("change", update));
  });
  return <main><h1>Sidebar owner handoff</h1><Button ref={trigger} onClick={() => setOpen(true)}>Open sidebar</Button>
    <Input label="Main draft" />
    <output aria-label="Layout mode">{phone() ? "phone" : "desktop"}</output>
    <Show when={phone()} fallback={<aside>{content()}</aside>}>
      <Dialog title="Sidebar" open={open()} onOpenChange={setOpen} returnFocus={() => trigger}>{content()}</Dialog>
    </Show>
  </main>;
}

export default function SidebarHandoff() { return <ShortcutProvider development={true}><Handoff /></ShortcutProvider>; }
