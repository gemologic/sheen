import { defineMeta } from "@gemologic/sheen/metadata";
import type { ToolbarProps } from "./Toolbar.tsx";
export default defineMeta<ToolbarProps>({
  name: "Toolbar", package: "@gemologic/sheen-patterns", category: "application", summary: "Measured whole-group actions with scoped overflow and independent filter controls.",
  props: {
    label: { description: "Required nonempty accessible action-toolbar name." },
    groups: { description: "Ordered groups with stable IDs and labels, each containing sheen action or checkbox menu items. Whole trailing groups overflow together." },
    filter: { description: "Persistent filter controls outside the action toolbar's arrow-key navigation." },
  },
  tokens: ["--sheen-space-inline-sm", "--sheen-color-border", "--sheen-control-h-md"],
  a11y: { role: "toolbar, group, menu", keyboard: ["Tab", "Shift+Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Space", "Escape"] },
  examples: [{ title: "Document actions", code: '<Toolbar label="Document actions" groups={[{ id: "file", label: "File", items: [{ kind: "action", id: "save", label: "Save", onSelect: () => {} }] }]} />' }],
  guidance: { do: ["Keep IDs stable across state updates.", "Provide three or more actions when using toolbar navigation."], dont: ["Do not put text inputs into action groups; use the filter slot.", "Do not use action items for URL navigation."] },
});
