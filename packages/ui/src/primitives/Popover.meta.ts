import { defineMeta } from "../metadata.ts";
import type { PopoverProps } from "./Popover.tsx";
export default defineMeta<PopoverProps>({
  name: "Popover", package: "@gemologic/sheen", category: "overlays", summary: "A labeled nonmodal contextual layer for interactive content.",
  props: {
    trigger: { description: "Visible native opening-button content. It must provide a clear accessible name." }, title: { description: "Required visible and accessible popover title." },
    description: { description: "Optional associated supporting text." }, open: { description: "App-owned open state." },
    defaultOpen: { description: "Uncontrolled initial state; portal content mounts when its theme target is ready.", default: false },
    onOpenChange: { description: "Requested open-state changes; controlled owners may reject them." },
    class: { description: "Additional content classes." },
    placement: { description: "Preferred logical side and alignment, with viewport collision handling.", default: "bottom", control: { kind: "select", values: ["top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end", "left", "right"] } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-focus-ring", "--sheen-duration-fast", "--sheen-elevation-overlay"],
  a11y: { role: "dialog", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{ title: "View options", code: '<Popover title="View options" trigger="View options"><Checkbox label="Show archived" /></Popover>' }],
  guidance: { do: ["Use a stable title and retain owner data while refreshing content."], dont: ["Do not use a popover when the workflow requires a modal decision."] },
});
