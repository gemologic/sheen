import { defineMeta } from "@gemologic/sheen/metadata";
import type { NotificationCenterProps } from "./NotificationCenter.tsx";

export default defineMeta<NotificationCenterProps>({
  name: "NotificationCenter", package: "@gemologic/sheen-patterns", category: "application", summary: "A compact app-owned notification trigger and contextual list with non-color unread state.",
  props: {
    notifications: { description: "Ordered app-owned notifications plus optional mark-all action. Time copy is preformatted by the app." },
    target: { description: "Topbar dropdown or sidebar-footer dropup placement.", default: "topbar-end", control: { kind: "select", values: ["topbar-end", "sidebar-footer"] } },
  },
  tokens: ["--sheen-color-accent", "--sheen-color-bg-raised", "--sheen-color-fg-muted"],
  a11y: { role: "button, dialog, list", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{ title: "App notifications", imports: 'import { ThemeProvider } from "@gemologic/sheen";', code: '<ThemeProvider><NotificationCenter notifications={{ items: [{ kind: "link", id: "deploy", title: "Deploy finished", href: "/deploys/1" }] }} /></ThemeProvider>' }],
  guidance: { do: ["Format dates and authorization-filter items in the app."], dont: ["Do not fetch, poll, or infer read state in Sheen."] },
});
