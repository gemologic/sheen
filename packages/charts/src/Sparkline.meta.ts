import { defineMeta } from "../../ui/src/metadata.ts";
import type { SparklineProps } from "./chart-types.ts";

export default defineMeta<SparklineProps>({
  name: "Sparkline", package: "@gemologic/sheen-charts", category: "data", summary: "Renders a dependency-free inline trend path while preserving NaN gaps.",
  props: {
    values: { description: "Float64 values in display order; NaN creates a visible path break." },
    label: { description: "Required accessible description of the trend." },
    color: { description: "Semantic chart, market, accent, foreground, or muted token name.", default: "chart-1" },
    width: { description: "Positive finite intrinsic and view-box width.", default: 120 },
    height: { description: "Positive finite intrinsic and view-box height.", default: 28 },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-line-width", "--sheen-color-market-up", "--sheen-color-market-down", "--sheen-color-market-flat", "--sheen-color-accent"],
  a11y: { role: "img", keyboard: [] },
  examples: [{ title: "Latency trend with a gap", setup: "const latency = new Float64Array([18, 16, Number.NaN, 15, 12]);", code: '<Sparkline values={latency} label="Latency over five samples" color="chart-3" />' }],
  guidance: { do: ["Use NaN for missing values and describe the trend in label."], dont: ["Do not coerce gaps to zero or use a sparkline as the only representation of important data."] },
});
