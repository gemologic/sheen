import { defineMeta } from "../metadata.ts";
import type { NavItemProps } from "./NavList.tsx";
export default defineMeta<NavItemProps>({
  name: "NavItem", package: "@gemologic/sheen", category: "navigation", summary: "A native destination link with explicit current-page presentation inside NavList.",
  props: {
    href: { description: "Required destination URL; browser navigation and modified clicks remain native." },
    label: { description: "Required visible destination label." },
    current: { description: "App-owned current-page state, exposed through aria-current.", default: false },
    icon: { description: "Optional decorative, noninteractive icon. The visible label supplies its accessible meaning." },
    badge: { description: "Optional noninteractive status/count content, included in the link's accessible name. Localize counts in the app." },
    tooltip: { description: "Optional contextual help, requiring ThemeProvider. Keep supplied and toggle tooltipDisabled to retain the anchor across presentation changes." },
    tooltipDisabled: { description: "Disables supplied tooltip help without disabling or replacing the link." },
    actions: { description: "Optional sibling controls rendered beside the link. Use for row actions that must not be nested inside the destination." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-bg-hover", "--sheen-color-focus-ring"],
  a11y: { role: "link, listitem", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{ title: "Current destination", code: '<NavList label="Workspace"><NavItem href="/overview" label="Overview" current /></NavList>' }],
  guidance: { do: ["Let the app/router determine the current page.", "Keep identities stable when labels refresh.", "Render optional row actions as sibling controls through actions."], dont: ["Do not use the destination itself for an action or nest interactive controls in icon and badge slots."] },
});
