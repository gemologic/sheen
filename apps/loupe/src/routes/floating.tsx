import { createSignal } from "solid-js";
import { Button, Dialog, Input, Popover, ShortcutProvider, Stack, ThemeScope, Tooltip } from "@gemologic/sheen";
import type { ShortcutAction } from "@gemologic/sheen";

const saveShortcut = { keys: "mod+s", scope: "global", label: "Save workspace", group: "Editing" } satisfies ShortcutAction;
const unavailableShortcut = { keys: "mod+u", scope: "global", label: "Unavailable action", group: "Editing" } satisfies ShortcutAction;

function FloatingFixture() {
  const [saved, setSaved] = createSignal(0);
  const [description, setDescription] = createSignal("Change the current view.");
  const [requests, setRequests] = createSignal(0);
  return <main><h1>Floating layer qualification</h1><Stack>
    <span id="save-help">Save local changes.</span>
    <Tooltip content="Save the workspace" shortcut={saveShortcut} aria-describedby="save-help" onClick={() => setSaved(value => value + 1)} variant="outline">Save workspace</Tooltip>
    <Tooltip content="Unavailable action" shortcut={unavailableShortcut} onClick={() => setSaved(value => value + 1)} disabled>Disabled action</Tooltip>
    <output aria-label="Saved count">{saved()}</output>
    <Button>Outside action</Button>
    <Popover title="View options" trigger="Open view options" description={description()}>
      <Input label="View name" />
      <Button onClick={() => setDescription("Updated without replacing your draft.")}>Refresh description</Button>
      <Popover title="Nested options" trigger="Open nested options"><Input label="Nested value" /></Popover>
    </Popover>
    <Popover title="Rejected options" trigger="Request open" open={false} onOpenChange={() => setRequests(value => value + 1)}>Rejected opening</Popover>
    <output aria-label="Open requests">{requests()}</output>
    <ThemeScope theme="paper" mode="light" direction="rtl">
      <Dialog title="Scoped settings" trigger="Open scoped settings">
        <Tooltip content="Inspect the nested layer" shortcut="?">Scoped help</Tooltip>
        <Popover title="Scoped options" trigger="Open scoped options"><Input label="Scoped value" /></Popover>
      </Dialog>
    </ThemeScope>
  </Stack></main>;
}

export default function FloatingRoute() { return <ShortcutProvider development={true}><FloatingFixture /></ShortcutProvider>; }
