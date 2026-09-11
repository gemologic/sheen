import { defineMeta } from "@gemologic/sheen/metadata";
import type { SidebarNavProps } from "./SidebarNav.tsx";
export default defineMeta<SidebarNavProps>({
  name: "SidebarNav", package: "@gemologic/sheen-patterns", category: "application", summary: "Sectioned native navigation with nested disclosure groups and app-supplied active pathname.",
  props: {
    sections: { description: "Named sections containing link/group entries with globally unique nonempty IDs. Links may supply a named action menu rendered beside the destination. Same-ID, same-kind entries retain mounted state across object replacement/reordering within their parent; moving between parents or changing kind creates a new owner." },
    pathname: { description: "Accepted router pathname. Exact matching is default; prefix matching respects path segments. Longest matching destination wins; ties use declaration order. External destinations are never automatically current." },
    headingLevel: { description: "Section heading level, default 3, independent of compact visual size." },
    collapsed: { description: "App-controlled icon rail. All nested destinations remain reachable; disclosure state returns when expanded. Labels remain accessible with tooltips. Supply icons; missing icons use the first label code point. Requires ThemeProvider in both modes." },
    header: { description: "Semantic sidebar-header chrome, resolved once and retained across desktop and phone presentations." },
    footer: { description: "Semantic sidebar-footer chrome, resolved once and retained across desktop and phone presentations." },
  },
  tokens: ["--sheen-space-block-sm", "--sheen-space-inline-sm"],
  a11y: { role: "navigation, heading, link, button", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Workspace routes", code: '<SidebarNav pathname="/orders" sections={[{ id: "workspace", label: "Workspace", items: [{ kind: "link", id: "orders", label: "Orders", href: "/orders", match: "prefix" }] }]} />' }],
  guidance: { do: ["Pass the accepted router location rather than a pending destination.", "Use native links for destinations, disclosure groups for nesting, and named sibling menus for row actions."], dont: ["Do not use menu roles for application navigation.", "Do not place interactive controls inside icon or badge slots."] },
});
