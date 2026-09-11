import { SidebarNav } from "@gemologic/sheen-patterns";
import type { SidebarNavEntry, SidebarNavSection } from "@gemologic/sheen-patterns";
import { Button, ThemeScope } from "@gemologic/sheen";
import { createSignal } from "solid-js";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import "@gemologic/sheen-patterns/styles.css";

const sections: readonly SidebarNavSection[] = [{ id: "work", label: "Workspace", items: [
  { kind: "link", id: "home", label: "Home", href: "/sidebar/home" },
  { kind: "group", id: "team", label: "Team", items: [
    { kind: "link", id: "people", label: "People", href: "/sidebar/people", match: "prefix", badge: "3 members" },
    { kind: "group", id: "admin", label: "Administration", items: [
      { kind: "link", id: "settings", label: "Settings", href: "/sidebar/settings" },
    ] },
  ] },
] }];
export default function SidebarFixture() {
  const router = useSolidRouterAdapter();
  const [items, setItems] = createSignal(sections);
  const initial = new URLSearchParams(router.location().search);
  const [collapsed, setCollapsed] = createSignal(initial.get("collapsed") === "true");
  const toggleRail = async () => {
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
    if (response.ok) setCollapsed(value => !value);
  };
  const refresh = async (operation: "refresh" | "reverse" | "remove-team" | "clear" | "restore" = "refresh") => {
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
    const replace = (entries: readonly SidebarNavEntry[]): readonly SidebarNavEntry[] => {
      const next = entries.filter(entry => operation !== "remove-team" || entry.id !== "team").map(entry => entry.kind === "group"
      ? { ...entry, items: replace(entry.items) }
      : { ...entry, label: operation === "refresh" && entry.id === "people" ? "Updated people" : entry.label });
      return operation === "reverse" ? next.reverse() : next;
    };
    if (response.ok) setItems(operation === "clear" ? [] : operation === "restore" ? sections : items().map(section => ({ ...section, items: replace(section.items) })));
  };
  return <main><h1>Sidebar navigation</h1><Button onClick={() => refresh()}>Refresh sidebar</Button>
    <Button onClick={() => refresh("reverse")}>Reverse sidebar</Button><Button onClick={() => refresh("remove-team")}>Remove team</Button>
    <Button onClick={() => refresh("clear")}>Clear sidebar</Button><Button onClick={() => refresh("restore")}>Restore sidebar</Button>
    <Button onClick={toggleRail}>Toggle rail</Button>
    <ThemeScope direction={initial.get("rtl") === "true" ? "rtl" : "ltr"}><SidebarNav role="group" aria-label="Workspace sidebar" sections={items()} pathname={router.location().pathname} collapsed={collapsed()} /></ThemeScope>
    <a href="/sidebar/settings">Open settings directly</a>
  </main>;
}
