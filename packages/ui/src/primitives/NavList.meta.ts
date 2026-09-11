import { defineMeta } from "../metadata.ts";
import type { NavListProps } from "./NavList.tsx";
export default defineMeta<NavListProps>({
  name: "NavList", package: "@gemologic/sheen", category: "navigation", summary: "A named navigation landmark containing a native list of destination links.",
  props: { label: { description: "Required accessible landmark name, distinguishing separate navigation lists." } },
  tokens: ["--sheen-space-block-xs", "--sheen-space-inline-sm"],
  a11y: { role: "navigation, list", keyboard: ["Tab", "Shift+Tab", "Enter"] },
  examples: [{ title: "Settings navigation", code: '<NavList label="Settings"><NavItem href="/settings/profile" label="Profile" current /><NavItem href="/settings/security" label="Security" /></NavList>' }],
  guidance: { do: ["Use NavItem children and distinguish multiple navigation landmarks."], dont: ["Do not apply menu or tablist semantics to ordinary URL navigation."] },
});
