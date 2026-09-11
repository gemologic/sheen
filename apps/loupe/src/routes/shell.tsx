import { For, createSignal } from "solid-js";
import { Button, Input, NavItem, NavList, ScrollArea, ShortcutProvider, Switch } from "@gemologic/sheen";
import { AppShell, PageHeader, StatusBar } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

const rows = Array.from({ length: 60 }, (_, index) => index + 1);
export default function ShellFixture(props: { development?: boolean }) {
  const [suffix, setSuffix] = createSignal("initial");
  const [characters, setCharacters] = createSignal(true);
  return <ShortcutProvider development={props.development ?? true} characterShortcuts={characters()}><AppShell label="Workspace content" shortcutHelp
    header={<PageHeader title="Workspace" actions={<Button onClick={() => setSuffix("refreshed")}>Refresh workspace</Button>} />}
    sidebar={<ScrollArea label="Sidebar navigation" style={{ height: "100%" }}><NavList label="Sections"><For each={rows}>{row => <NavItem href={`#section-${row}`} label={`Section ${row}`} />}</For></NavList></ScrollArea>}
    statusBar={<StatusBar connection="connected" counts={[{ label: "Rows", value: rows.length }]}><span>Workspace ready</span></StatusBar>}>
    <Input label="Workspace draft" />
    <Switch label="Character shortcuts" checked={characters()} onCheckedChange={setCharacters} />
    <For each={rows}>{row => <p>Row {row}: {suffix()}</p>}</For>
  </AppShell></ShortcutProvider>;
}
