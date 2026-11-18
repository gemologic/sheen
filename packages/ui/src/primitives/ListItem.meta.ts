import { defineMeta } from "../metadata.ts";
import type { ListItemProps } from "./List.tsx";

export default defineMeta<ListItemProps>({
  name: "ListItem", package: "@gemologic/sheen", category: "data-display",
  summary: "One row of a List: title, optional description, leading media, and trailing metadata or actions. An href makes the row a link; onSelect makes it a button.",
  props: {
    title: { description: "Primary row text.", control: { kind: "text" } },
    description: { description: "Secondary line under the title." },
    leading: { description: "Avatar, icon, or status mark before the text." },
    trailing: { description: "Metadata, badges, or counts after the text." },
    href: { description: "Makes the row a destination; the whole row navigates natively.", control: { kind: "text" } },
    onSelect: { description: "Makes the row a native button for in-place actions such as opening a detail pane. Ignored when href is set." },
    current: { description: "Marks a link row as the current page (aria-current=\"page\").", control: { kind: "boolean" } },
    selected: { description: "Visual selected state for rows that drive a detail view.", control: { kind: "boolean" } },
    disabled: { description: "Disables the row's button; links ignore it.", control: { kind: "boolean" } },
  },
  tokens: ["--sheen-color-bg-hover", "--sheen-color-fg-muted", "--sheen-color-border"],
  a11y: { role: "listitem; the row body is a link or button when interactive", keyboard: ["Tab", "Enter", "Space"] },
  examples: [{ title: "Linked row", code: '<List label="Incidents"><ListItem title="Checkout latency" description="Opened 12 minutes ago" href="/incidents/42" /></List>' }],
  guidance: { do: ["Use href for navigation and onSelect for in-place actions."], dont: ["Do not put buttons or links inside an interactive row; give the row one action."] },
});
