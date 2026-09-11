import { defineMeta } from "../metadata.ts";
import type { ResizableHandleProps } from "./Resizable.tsx";

export default defineMeta<ResizableHandleProps>({
  name: "ResizableHandle", package: "@gemologic/sheen", category: "navigation", summary: "Labeled pointer and keyboard separator between panels.",
  props: {
    label: { description: "Required accessible name describing both adjacent panels." },
    index: { description: "Index of the preceding panel." },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-accent-fg", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset"],
  a11y: { role: "separator", keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] },
  examples: [{ title: "Editor separator", code: '<Resizable><ResizablePanel index={0}>Source</ResizablePanel><ResizableHandle index={0} label="Resize source and result" /><ResizablePanel index={1}>Result</ResizablePanel></Resizable>' }],
  guidance: { do: ["Name both adjacent regions in the label."], dont: ["Do not remove the separator from the tab order."] },
});
