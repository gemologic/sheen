import { defineMeta } from "@gemologic/sheen/metadata";
import type { StatusBarProps } from "./StatusBar.tsx";
export default defineMeta<StatusBarProps>({
  name: "StatusBar", package: "@gemologic/sheen-patterns", category: "application", summary: "App-owned connection and background task status with localized counts and persistent actions.",
  props: {
    label: { description: "Accessible group name; defaults to the scoped application-status message." },
    connection: { description: "App-supplied connection state. Omitted state renders no connection indicator; browser connectivity is never detected." },
    tasks: { description: "Nonnegative safe-integer pending task count. Zero or omission hides the task indicator." },
    counts: { description: "Nonnegative safe-integer counts with unique nonempty app-localized labels, formatted in the scoped locale." },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-color-border", "--sheen-space-inline-sm"],
  a11y: { role: "group, status", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "Workspace status", code: '<StatusBar connection="connected" tasks={2} counts={[{ label: "Rows", value: 1200 }]} />' }],
  guidance: { do: ["Supply backend health from the app.", "Place the bar in AppShell's statusBar slot.", "Localize count labels in the app."], dont: ["Do not infer backend health from navigator.onLine.", "Do not put rapidly changing counts in a live region."] },
});
