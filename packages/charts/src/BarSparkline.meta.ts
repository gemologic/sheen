import { defineMeta } from "../../ui/src/metadata.ts";
import type { BarSparklineProps } from "./chart-types.ts";

export default defineMeta<BarSparklineProps>({
  name: "BarSparkline", package: "@gemologic/sheen-charts", category: "data", summary: "Renders a dependency-free inline bar trend anchored at zero, leaving empty slots for NaN values.",
  props: {
    values: { description: "Float64 values in display order; NaN leaves an empty bar slot, and negative values extend below zero." },
    label: { description: "Required accessible description of the trend." },
    color: { description: "Semantic chart, market, accent, foreground, or muted token name.", default: "chart-1" },
    width: { description: "Positive finite intrinsic and view-box width.", default: 120 },
    height: { description: "Positive finite intrinsic and view-box height.", default: 28 },
  },
  tokens: ["--sheen-chart-1", "--sheen-color-market-up", "--sheen-color-market-down", "--sheen-color-market-flat", "--sheen-color-accent"],
  a11y: { role: "img", keyboard: [] },
  examples: [{ title: "Daily deploys with a missing day", setup: "const deploys = new Float64Array([3, 5, 2, Number.NaN, 6, 4, 7]);", code: '<BarSparkline values={deploys} label="Deploys per day over the last week" color="chart-2" />' }],
  guidance: { do: ["Use for discrete per-period counts, and Sparkline for continuous trends.", "Describe the trend in label."], dont: ["Do not coerce gaps to zero or use a sparkline as the only representation of important data."] },
});
