import { defineMeta } from "../metadata.ts";
import type { TreeProps } from "./Tree.tsx";

export default defineMeta<TreeProps>({
  name: "Tree", package: "@gemologic/sheen", category: "navigation", summary: "A hierarchical treeview with explicit selection, retained expansion state, roving focus, and typeahead.",
  props: {
    label: { description: "Required accessible name for the tree.", control: { kind: "text" } },
    selectionMode: { description: "Whether items are unselectable, singly selected, or independently selected.", default: "single", control: { kind: "select", values: ["none", "single", "multiple"] } },
    selectedValues: { description: "Controlled stable item values selected by the app." },
    defaultSelectedValues: { description: "Initially selected values for uncontrolled operation." },
    onSelectionChange: { description: "Receives requested selection; controlled owners may reject it." },
    expandedValues: { description: "Controlled stable branch values that expose their child groups." },
    defaultExpandedValues: { description: "Initially expanded branch values for uncontrolled operation." },
    onExpandedChange: { description: "Receives requested expansion; controlled owners may reject it." },
    onActivate: { description: "Handles Enter or the default item action without changing selection or focus." },
  },
  tokens: ["--sheen-color-bg-hover", "--sheen-color-bg-selected", "--sheen-color-focus-ring", "--sheen-space-inline-sm"],
  a11y: { role: "tree", keyboard: ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End", "Enter", "Space", "*", "typeahead"] },
  examples: [{ title: "Workspace tree", code: '<Tree label="Workspace" defaultExpandedValues={["src"]}><TreeItem value="src" label="Source"><TreeItem value="app" label="App" /></TreeItem><TreeItem value="readme" label="README" /></Tree>' }],
  guidance: { do: ["Use stable unique values and preserve item ownership while labels or data refresh.", "Keep focus, selection, expansion, and activation as separate states."], dont: ["Do not use Tree for a flat list or remount it to publish refreshed data."] },
});
