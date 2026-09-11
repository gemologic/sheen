import { defineMeta } from "../metadata.ts";
import type { CollapsibleProps } from "./Collapsible.tsx";
export default defineMeta<CollapsibleProps>({
  name: "Collapsible", package: "@gemologic/sheen", category: "navigation", summary: "A native disclosure button with persistent, inert-when-closed content.",
  props: {
    label: { description: "Visible disclosure-button label." },
    open: { description: "App-owned expanded state; owners may reject requested changes." },
    defaultOpen: { description: "Initial uncontrolled expanded state, including SSR.", default: false },
    onOpenChange: { description: "Requested expanded-state changes." },
    disabled: { description: "Disables user activation without hiding already expanded content.", default: false },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-space-block-sm", "--sheen-duration-normal", "--sheen-ease-standard"],
  a11y: { role: "button with aria-expanded and aria-controls", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Advanced settings", code: '<Collapsible label="Advanced settings"><Input label="Timeout" /></Collapsible>' }],
  guidance: { do: ["Keep a stable disclosure owner while its content refreshes.", "Use independent disclosures for independent sections."], dont: ["Do not use a disclosure as a substitute for route navigation.", "Do not put interactive elements inside its label."] },
});
