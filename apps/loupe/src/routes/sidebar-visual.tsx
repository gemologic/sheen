import { Surface, ThemeScope } from "@gemologic/sheen";
import { SidebarNav } from "@gemologic/sheen-patterns";
import type { SidebarNavSection } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

const sections: readonly SidebarNavSection[] = [{ id: "workspace", label: "Workspace", items: [
  { kind: "link", id: "home", label: "Home", href: "/sidebar/home", icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 7l6-5 6 5v7H9v-4H7v4H2z" fill="none" stroke="currentColor" /></svg> },
  { kind: "group", id: "team", label: "Team", items: [
    { kind: "link", id: "people", label: "People", href: "/sidebar/people", badge: "3 members" },
    { kind: "group", id: "admin", label: "Administration", items: [
      { kind: "link", id: "settings", label: "Settings", href: "/sidebar/settings" },
    ] },
  ] },
] }];

export default function SidebarVisual() {
  return <main><h1>Sidebar visual matrix</h1><div style={{ display: "grid", "grid-template-columns": "repeat(4, minmax(0, 1fr))", gap: "16px" }}>
    <ThemeScope theme="obsidian" mode="dark"><Surface padding="lg"><h2>Dark expanded</h2><SidebarNav aria-label="Dark expanded" role="group" sections={sections} pathname="/sidebar/settings" /></Surface></ThemeScope>
    <ThemeScope theme="paper" mode="light"><Surface padding="lg"><h2>Light rail</h2><SidebarNav aria-label="Light rail" role="group" sections={sections} pathname="/sidebar/settings" collapsed /></Surface></ThemeScope>
    <ThemeScope theme="obsidian" mode="dark" direction="rtl"><Surface padding="lg"><h2>Dark RTL rail</h2><SidebarNav aria-label="Dark RTL rail" role="group" sections={sections} pathname="/sidebar/settings" collapsed /></Surface></ThemeScope>
    <ThemeScope theme="paper" mode="light" direction="rtl"><Surface padding="lg"><h2>Light RTL expanded</h2><SidebarNav aria-label="Light RTL expanded" role="group" sections={sections} pathname="/sidebar/settings" /></Surface></ThemeScope>
  </div></main>;
}
