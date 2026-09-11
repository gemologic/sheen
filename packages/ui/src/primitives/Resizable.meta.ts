import { defineMeta } from "../metadata.ts";
import type { ResizableProps } from "./Resizable.tsx";

export default defineMeta<ResizableProps>({
  name: "Resizable", package: "@gemologic/sheen", category: "navigation", summary: "Hydration-stable panes with pointer, keyboard and persisted sizing.",
  props: {
    children: { description: "Ordered panels and handles." },
    orientation: { description: "Horizontal side-by-side or vertical stacked panels.", default: "horizontal", control: { kind: "select", values: ["horizontal", "vertical"] } },
    sizes: { description: "Controlled panel fractions summing to one." },
    defaultSizes: { description: "Deterministic initial panel fractions summing to one." },
    onSizesChange: { description: "Reports validated immutable panel fractions." },
    keyboardStep: { description: "Fraction moved by a separator arrow-key action.", default: 0.05 },
    persistence: { description: "App-owned server-known initial sizes, save function, and explicit error handler." },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-accent-fg", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset"],
  a11y: { role: "group containing adjustable separators", keyboard: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] },
  examples: [{ title: "Inspector split", code: '<Resizable defaultSizes={[0.35, 0.65]}><ResizablePanel index={0}>Files</ResizablePanel><ResizableHandle index={0} label="Resize files and preview" /><ResizablePanel index={1}>Preview</ResizablePanel></Resizable>' }],
  guidance: { do: ["Pass the same persisted initialSizes on the server and client."], dont: ["Do not read localStorage on mount and visibly replace server geometry."] },
});
