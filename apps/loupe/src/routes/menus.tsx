import { createSignal } from "solid-js";
import { Button, Dialog, DropdownMenu, Stack, ThemeScope, useTheme } from "@gemologic/sheen";
import type { MenuItem } from "@gemologic/sheen";

export default function MenuFixture() {
  const theme = useTheme();
  const [rtl, setRtl] = createSignal(false);
  const [saved, setSaved] = createSignal(0);
  const [checked, setChecked] = createSignal(false);
  const [sort, setSort] = createSignal("name");
  const [revision, setRevision] = createSignal(0);
  const [requests, setRequests] = createSignal(0);
  const [exportRemoved, setExportRemoved] = createSignal(false);
  const items = (): readonly MenuItem[] => [
    { kind: "action", id: "save", label: revision() ? "Save revised" : "Save", icon: () => <span data-menu-icon="save">S</span>, shortcut: "mod+s", onSelect: () => setSaved(value => value + 1) },
    { kind: "action", id: "disabled", label: "Unavailable", disabled: true, onSelect: () => setSaved(999) },
    { kind: "checkbox", id: "archived", label: "Show archived", icon: () => <span data-menu-icon="archive">A</span>, checked: checked(), onCheckedChange: setChecked },
    { kind: "separator", id: "separator" },
    { kind: "radio", id: "sort", label: "Sort order", value: sort(), onValueChange: setSort, options: [{ id: "name", label: "Name", icon: () => <span data-menu-icon="name">N</span> }, { id: "date", label: "Date" }] },
    { kind: "submenu", id: "more", label: "More", icon: () => <span data-menu-icon="more">M</span>, items: [
      ...(!exportRemoved() ? [{ kind: "action", id: "export", label: "Export", onSelect: () => setSaved(value => value + 10) } satisfies MenuItem] : []),
      { kind: "submenu", id: "nested", label: "Advanced", items: [{ kind: "action", id: "inspect", label: "Inspect", onSelect: () => setSaved(value => value + 100) }] },
    ] },
  ];
  return <main><h1>Menu qualification</h1><Stack>
    <div style={{ display: "grid", "inline-size": "18rem", "max-inline-size": "100%" }}><DropdownMenu trigger="Workspace actions" matchTriggerWidth items={items()} /></div>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) { await theme.setMode("light"); setRtl(true); }
    }}>Change theme after request</Button>
    <ThemeScope direction={rtl() ? "rtl" : "ltr"}><DropdownMenu trigger="Changing scope actions" items={items()} /></ThemeScope>
    <Button onClick={() => setRevision(value => value + 1)}>Refresh items</Button>
    <Button onClick={() => window.setTimeout(() => setRevision(value => value + 1), 500)}>Schedule refresh</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setExportRemoved(true);
    }}>Remove export after request</Button>
    <output aria-label="Saved count">{saved()}</output>
    <output aria-label="Archive state">{String(checked())}</output>
    <output aria-label="Sort state">{sort()}</output>
    <DropdownMenu trigger="Rejected menu" items={items()} open={false} onOpenChange={() => setRequests(value => value + 1)} />
    <output aria-label="Open requests">{requests()}</output>
    <DropdownMenu trigger="Disabled menu" items={items()} disabled />
    <ThemeScope theme="paper" mode="light" direction="rtl"><Dialog title="Scoped settings" trigger="Open scoped settings">
      <DropdownMenu trigger="Scoped actions" items={items()} />
    </Dialog></ThemeScope>
  </Stack></main>;
}
