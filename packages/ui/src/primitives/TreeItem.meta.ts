import { defineMeta } from "../metadata.ts";
import type { TreeItemProps } from "./Tree.tsx";

export default defineMeta<TreeItemProps>({
  name: "TreeItem", package: "@gemologic/sheen", category: "navigation", summary: "A stable leaf or retained branch within a Tree.",
  props: {
    value: { description: "Required stable identity, unique within the owning tree." },
    label: { description: "Required visible and accessible item label." },
    disabled: { description: "Keeps the item focusable while preventing selection, activation, and expansion.", default: false },
    children: { description: "Nested TreeItems; providing children makes this item an expandable branch." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-bg-hover", "--sheen-color-focus-ring", "--sheen-space-inline-sm"],
  a11y: { role: "treeitem", keyboard: ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Enter", "Space"] },
  examples: [{ title: "Retained branch", code: '<Tree label="Files"><TreeItem value="src" label="Source"><TreeItem value="index" label="index.ts" /></TreeItem></Tree>' }],
  guidance: { do: ["Keep each value stable across background refresh and reordering."], dont: ["Do not put unrelated interactive controls inside an item label."] },
});
