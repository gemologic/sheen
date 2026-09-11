import { defineMeta } from "../metadata.ts";
import type { SheetProps } from "./Drawer.tsx";

export default defineMeta<SheetProps>({
  name: "Sheet", package: "@gemologic/sheen", category: "overlays", summary: "Provides the Drawer contract under the common Sheet name for task and detail panels.",
  props: {
    title: { description: "Accessible panel title." }, contentId: { description: "Optional stable content element ID." }, trigger: { description: "Visible label for the opening button." },
    description: { description: "Optional explanatory text associated with the panel." }, open: { description: "Controlled open state." }, defaultOpen: { description: "Uncontrolled initial open state.", default: false },
    onOpenChange: { description: "Requests an open-state change." }, dismissible: { description: "Allows Escape, outside press, and the close action.", default: true }, closeLabel: { description: "Visible and accessible close label." },
    initialFocus: { description: "Resolves an enabled focus target inside the panel." }, returnFocus: { description: "Resolves a surviving focus target after close." }, shortcutScope: { description: "Unique modal shortcut scope ID." },
    class: { description: "Additional classes on panel content." }, footer: { description: "App-owned footer actions beside close." }, side: { description: "Logical viewport edge from which the panel enters.", default: "end", control: { kind: "select", values: ["start", "end"] } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-bg-overlay", "--sheen-elevation-modal", "--sheen-duration-slow"],
  a11y: { role: "dialog", keyboard: ["Tab", "Shift+Tab", "Escape"] },
  examples: [{ title: "Task sheet", code: '<Sheet title="Task details" trigger="Open task"><Text>Current task</Text></Sheet>' }],
  guidance: { do: ["Use Sheet for the same modal side-panel behavior when that name fits the product vocabulary."], dont: ["Do not use it for persistent AppShell navigation."] },
});
