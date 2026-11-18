import { defineMeta } from "../metadata.ts";
import type { ListProps } from "./List.tsx";

export default defineMeta<ListProps>({
  name: "List", package: "@gemologic/sheen", category: "data-display",
  summary: "Vertical rows with leading, title, description, and trailing slots. Rows are links, buttons, or static content; ListItem is exported alongside.",
  props: {
    label: { description: "Accessible name when no nearby heading names the list.", control: { kind: "text" } },
    dividers: { description: "Separators between rows.", default: false, control: { kind: "boolean" } },
    density: { description: "Row padding.", default: "default", control: { kind: "select", values: ["compact", "default", "comfortable"] } },
    inset: { description: "Wrap rows in a raised, bordered surface.", default: false, control: { kind: "boolean" } },
  },
  tokens: ["--sheen-color-bg-hover", "--sheen-color-bg-selected", "--sheen-color-focus-ring", "--sheen-color-border-subtle", "--sheen-color-fg-muted", "--sheen-elevation-raised"],
  a11y: { role: "list of listitem; rows are native links or buttons when interactive", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Navigable rows", code: '<List inset dividers>\n  <ListItem href="/incidents/42" title="INC-42 · API latency" description="Investigating · Public API" trailing={<Badge tone="warning">SEV2</Badge>} />\n</List>' }],
  guidance: {
    do: ["Use href for rows that open a page and onSelect for rows that run an action.", "Mark the row that drives an adjacent detail view with selected, and the current page with current."],
    dont: ["Do not put other interactive controls inside an interactive row.", "Do not use List for single or multiple selection; use RadioGroup, CheckboxGroup, or Select.", "Do not disable link rows; render them without href instead."],
  },
});
