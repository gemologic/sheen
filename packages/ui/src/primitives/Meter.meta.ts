import { defineMeta } from "../metadata.ts";
import type { MeterProps } from "./Progress.tsx";

export default defineMeta<MeterProps>({
  name: "Meter", package: "@gemologic/sheen", category: "data", summary: "Uses the native meter element for a scalar value within a known range.",
  props: {
    label: { description: "Required accessible measurement label." },
    value: { description: "Finite current value within min and max." },
    min: { description: "Finite lower bound.", default: 0 },
    max: { description: "Finite upper bound greater than min.", default: 1 },
    low: { description: "Optional lower threshold within the range." },
    high: { description: "Optional upper threshold within the range and not below low." },
    optimum: { description: "Optional optimal value within the range." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-success", "--sheen-color-warning", "--sheen-color-danger"],
  a11y: { role: "meter", keyboard: [] },
  examples: [{ title: "Storage", code: '<Meter label="Storage used" value={72} min={0} max={100} low={60} high={85} optimum={20} />' }],
  guidance: { do: ["Use for a measurement with meaningful bounds and thresholds."], dont: ["Do not use Meter for task completion; use Progress."] },
});
