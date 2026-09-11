import { defineMeta } from "@gemologic/sheen/metadata";
import type { SplitLayoutProps } from "./SplitLayout.tsx";

export default defineMeta<SplitLayoutProps>({
  name: "SplitLayout", package: "@gemologic/sheen-patterns", category: "patterns", summary: "Composes two labeled, persisted resizable panes that retain one content owner while stacking in a narrow container.",
  props: {
    label: { description: "Accessible name for the complete split workspace." },
    startLabel: { description: "Accessible name for the logical start pane's scroll region." },
    endLabel: { description: "Accessible name for the logical end pane's scroll region." },
    handleLabel: { description: "Accessible name for the adjustable separator." },
    start: { description: "Persistent logical start-pane content." },
    end: { description: "Persistent logical end-pane content." },
    orientation: { description: "Horizontal side-by-side or vertical stacked split axis.", default: "horizontal", control: { kind: "select", values: ["horizontal", "vertical"] } },
    narrowLayout: { description: "Stacks a horizontal split below the component container breakpoint or retains resizing.", default: "stack", control: { kind: "select", values: ["stack", "split"] } },
    sizes: { description: "Controlled two-pane fractions summing to one." },
    defaultSizes: { description: "Deterministic initial two-pane fractions summing to one." },
    onSizesChange: { description: "Receives validated immutable fractions after pointer or keyboard resizing." },
    keyboardStep: { description: "Fraction moved by each separator arrow-key action.", default: 0.05 },
    persistence: { description: "App-owned server-known initial sizes, async save adapter, and explicit failure callback." },
    startMinSize: { description: "Minimum logical start-pane fraction.", default: 0.2 },
    startMaxSize: { description: "Maximum logical start-pane fraction." },
    endMinSize: { description: "Minimum logical end-pane fraction.", default: 0.2 },
    endMaxSize: { description: "Maximum logical end-pane fraction." },
    refreshing: { description: "Marks retained accepted content busy without hiding or replacing either pane.", default: false },
    class: { description: "Additional class merged onto the layout root." },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-border-control", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset"],
  a11y: { role: "named group containing two named scroll regions and an adjustable separator", keyboard: ["Tab focuses each pane and the separator", "Arrow keys resize the focused separator", "Home and End move it to its bounds"] },
  examples: [{ title: "Source and preview", code: '<SplitLayout label="Editor" startLabel="Source" endLabel="Preview" handleLabel="Resize source and preview" defaultSizes={[0.4, 0.6]} start={<textarea aria-label="Source draft" />} end={<article>Preview</article>} />' }],
  guidance: { do: ["Provide server-known initial sizes and let the application persistence adapter save accepted changes.", "Keep both content slots mounted while refreshing or crossing the narrow breakpoint."], dont: ["Do not read storage on mount and replace server geometry.", "Do not create a second mobile content tree."] },
});
