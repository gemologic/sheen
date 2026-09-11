import { defineMeta } from "../metadata.ts";
import type { ProgressProps } from "./Progress.tsx";

export default defineMeta<ProgressProps>({
  name: "Progress", package: "@gemologic/sheen", category: "feedback", summary: "Uses the native progress element for determinate or indeterminate task completion.",
  props: {
    label: { description: "Required accessible task label." },
    value: { description: "Finite accepted progress; omit for an indeterminate task." },
    max: { description: "Positive finite completion bound.", default: 1 },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-accent", "--sheen-control-h-xs"],
  a11y: { role: "progressbar", keyboard: [] },
  examples: [{ title: "Upload progress", code: '<Progress label="Upload progress" value={42} max={100} />' }],
  guidance: { do: ["Omit value for truly indeterminate work."], dont: ["Do not invent progress percentages that the operation cannot measure."] },
});
