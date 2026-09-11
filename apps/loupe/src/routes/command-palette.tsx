import { Button, CommandPalette, Heading, Row, ShortcutProvider, Stack, Text, ThemeScope, useShortcut } from "@gemologic/sheen";
import type { CommandPaletteCommand, CommandPaletteSource } from "@gemologic/sheen";
import { createSignal } from "solid-js";

function remoteRecords(value: unknown): readonly { readonly id: string; readonly label: string }[] {
  if (!Array.isArray(value)) throw new Error("Palette response must be an array");
  return value.map(record => {
    if (typeof record !== "object" || record === null || Array.isArray(record) || !("id" in record) || !("label" in record) || typeof record.id !== "string" || typeof record.label !== "string") {
      throw new Error("Palette response entries require string id and label");
    }
    return { id: record.id, label: record.label };
  });
}

function PaletteWorkspace() {
  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = createSignal("none");
  const [savedRecents, setSavedRecents] = createSignal("none");
  useShortcut({ keys: "mod+j", scope: "global", label: "Jump to inbox", group: "Navigation", run: () => { setSelected("inbox"); } });
  const initialRemote: CommandPaletteCommand = { id: "remote-report", label: "Remote report", group: "Remote", keywords: ["report"], run: () => { setSelected("remote-report"); } };
  const sources: readonly CommandPaletteSource[] = [
    { kind: "static", id: "application", commands: [
      { id: "settings", label: "Open settings", group: "Navigation", keywords: ["preferences", "config"], run: () => { setSelected("settings"); } },
      { id: "new-project", label: "Create project", group: "Actions", run: () => { setSelected("new-project"); } },
    ] },
    { kind: "remote", id: "server", initialCommands: [initialRemote], minimumQueryLength: 6, search: async (query, signal) => {
      const response = await fetch(`/api/palette?query=${encodeURIComponent(query)}`, { signal });
      if (!response.ok) throw new Error(`Palette request failed (${response.status})`);
      return remoteRecords(await response.json()).map(record => ({ id: record.id, label: record.label, group: "Remote", keywords: [query], run: () => { setSelected(record.id); } }));
    } },
  ];
  return <ThemeScope theme="paper" mode="dark" accent="rose">
    <main><Stack>
      <Heading level={1}>Command palette</Heading>
      <Text>Static, remote, recent, and registered shortcut commands share one scoped overlay.</Text>
      <Row><Button onClick={() => setOpen(true)}>Open palette</Button></Row>
      <output aria-label="Selected command">{selected()}</output>
      <output aria-label="Saved recents">{savedRecents()}</output>
      <CommandPalette sources={sources} open={open()} onOpenChange={setOpen}
        recents={{ initialIds: ["settings"], save: ids => { setSavedRecents(ids.join(",")); }, onError: error => { throw error; } }} />
    </Stack></main>
  </ThemeScope>;
}

export default function CommandPaletteRoute() { return <ShortcutProvider development={true} platform="other"><PaletteWorkspace /></ShortcutProvider>; }
