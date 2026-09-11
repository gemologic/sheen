import { defineMeta } from "../metadata.ts";
import type { ResizablePanelProps } from "./Resizable.tsx";

export default defineMeta<ResizablePanelProps>({
  name: "ResizablePanel", package: "@gemologic/sheen", category: "navigation", summary: "Defines a bounded, optionally collapsible pane inside Resizable.",
  props: {
    children: { description: "Retained panel content." },
    index: { description: "Stable zero-based index into the root initial-size snapshot." },
    panelId: { description: "Stable ID used by the separator relationship." },
    initialSize: { description: "Panel-specific initial fraction, overriding the root entry." },
    minSize: { description: "Minimum fraction allowed during resize." },
    maxSize: { description: "Maximum fraction allowed during resize." },
    collapsible: { description: "Allows the panel to collapse past its threshold.", default: false },
    collapsedSize: { description: "Fraction retained while collapsed.", default: 0 },
    collapseThreshold: { description: "Required overdrag fraction before collapse.", default: 0.05 },
    onResize: { description: "Reports current panel fraction." },
    onCollapse: { description: "Reports the final collapsed fraction." },
    onExpand: { description: "Reports the restored expanded fraction." },
  },
  tokens: ["--sheen-color-bg", "--sheen-space-block-md", "--sheen-space-inline-md"],
  a11y: { role: "region controlled by adjacent separator", keyboard: [] },
  examples: [{ title: "Bounded pane", code: '<Resizable><ResizablePanel index={0} minSize={0.2}>Files</ResizablePanel><ResizableHandle index={0} label="Resize files and preview" /><ResizablePanel index={1}>Preview</ResizablePanel></Resizable>' }],
  guidance: { do: ["Keep important controls reachable at the minimum size."], dont: ["Do not use unstable panel IDs across refreshes."] },
});
