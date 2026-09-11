import { defineMeta } from "@gemologic/sheen/metadata";
import type { AccountMenuProps } from "./AccountMenu.tsx";

export default defineMeta<AccountMenuProps>({
  name: "AccountMenu", package: "@gemologic/sheen-patterns", category: "application", summary: "An app-owned account identity and action menu that aligns to its topbar or sidebar placement.",
  props: {
    account: { description: "App-owned identity copy, optional avatar, and Sheen menu items. No authentication or fetching is performed." },
    target: { description: "Semantic chrome target controlling logical dropdown or dropup alignment.", default: "topbar-end", control: { kind: "select", values: ["topbar-end", "sidebar-header", "sidebar-footer"] } },
    collapsed: { description: "Icon-rail presentation. The composite button retains its explicit accessible name.", default: false },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control"],
  a11y: { role: "button, menu", keyboard: ["Tab", "Enter", "Space", "ArrowDown", "ArrowUp", "Escape"] },
  examples: [{ title: "Topbar account", imports: 'import { ThemeProvider } from "@gemologic/sheen";', code: '<ThemeProvider><AccountMenu account={{ id: "ada", name: "Ada Lovelace", items: [{ kind: "action", id: "sign-out", label: "Sign out", onSelect: () => {} }] }} /></ThemeProvider>' }],
  guidance: { do: ["Clear the model immediately when authorization changes."], dont: ["Do not put authentication or account transport in the component."] },
});
