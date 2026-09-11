import { defineMeta } from "../metadata.ts";
import type { DrawerProps } from "./Drawer.tsx";

export default defineMeta<DrawerProps>({
  name: "Drawer", package: "@gemologic/sheen", category: "overlays", summary: "Opens a modal panel from a logical viewport side using the scoped overlay stack.",
  props: {
    title: { description: "Accessible panel title." }, contentId: { description: "Optional stable content element ID." }, trigger: { description: "Visible label for the opening button." },
    description: { description: "Optional explanatory text associated with the panel." }, open: { description: "Controlled open state." }, defaultOpen: { description: "Uncontrolled initial open state.", default: false },
    onOpenChange: { description: "Requests an open-state change." }, dismissible: { description: "Allows Escape, outside press, and the close action.", default: true }, closeLabel: { description: "Visible and accessible close label." },
    initialFocus: { description: "Resolves an enabled focus target inside the panel." }, returnFocus: { description: "Resolves a surviving focus target after close." }, shortcutScope: { description: "Unique modal shortcut scope ID." },
    class: { description: "Additional classes on panel content." }, footer: { description: "App-owned footer actions beside close." }, side: { description: "Logical viewport edge from which the panel enters.", default: "end", control: { kind: "select", values: ["start", "end"] } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-bg-overlay", "--sheen-elevation-modal", "--sheen-duration-slow"],
  a11y: { role: "dialog", keyboard: ["Tab", "Shift+Tab", "Escape"] },
  examples: [{ title: "End-side drawer", code: '<Drawer title="Filters" trigger="Open filters"><Input label="Query" /></Drawer>' }],
  guidance: { do: ["Use logical start/end sides so the panel follows document direction."], dont: ["Do not mount a second portal or focus trap around Drawer."] },
});
