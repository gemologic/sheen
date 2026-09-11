import { defineMeta } from "@gemologic/sheen/metadata";
import type { WorkspaceSwitcherProps } from "./WorkspaceSwitcher.tsx";

export default defineMeta<WorkspaceSwitcherProps>({
  name: "WorkspaceSwitcher", package: "@gemologic/sheen-patterns", category: "application", summary: "An app-owned workspace selector with consistent topbar, sidebar-header, and sidebar-footer presentations.",
  props: {
    workspace: { description: "Current workspace, ordered choices, and an app-owned accepted-change callback." },
    target: { description: "Semantic chrome target controlling logical menu direction and alignment.", default: "sidebar-header", control: { kind: "select", values: ["topbar-start", "topbar-end", "sidebar-header", "sidebar-footer"] } },
    collapsed: { description: "Icon-rail presentation. The workspace label remains available to assistive technology.", default: false },
  },
  tokens: ["--sheen-color-accent", "--sheen-color-bg-raised"],
  a11y: { role: "button, menu, radio", keyboard: ["Tab", "Enter", "Space", "ArrowDown", "ArrowUp", "Escape"] },
  examples: [{ title: "Sidebar workspace", imports: 'import { ThemeProvider } from "@gemologic/sheen";', code: '<ThemeProvider><WorkspaceSwitcher workspace={{ label: "Workspace", currentId: "alpha", items: [{ id: "alpha", label: "Alpha" }], onChange: () => {} }} /></ThemeProvider>' }],
  guidance: { do: ["Keep currentId app-owned and stable during refresh."], dont: ["Do not persist or fetch workspace state inside the selector."] },
});
