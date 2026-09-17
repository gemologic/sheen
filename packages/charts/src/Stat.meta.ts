import { defineMeta } from "../../ui/src/metadata.ts";
import type { StatProps } from "./chart-types.ts";

export default defineMeta<StatProps>({
  name: "Stat", package: "@gemologic/sheen-charts", category: "data", summary: "Presents one tabular metric with an optional text-labeled directional trend.",
  props: {
    label: { description: "Required visible metric label." },
    value: { description: "Nonempty display text or a finite number." },
    format: { description: "Optional locale-aware Intl.NumberFormat options; requires a numeric value. Fractions and units use muted text." },
    trend: { description: "Optional directional state; requires trendLabel." },
    trendLabel: { description: "Required visible non-color description when trend is supplied." },
    valence: { description: "Meaning of the change, independent of direction; positive, negative, or neutral. Requires a trend and defaults to neutral." },
    visual: { description: "Optional supplementary JSX, such as a labeled Sparkline or Meter based on actual data. The text value remains complete. Preserve the visual node when refreshing its data." },
    class: { description: "Optional class appended to the component root." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-color-success", "--sheen-color-danger", "--sheen-text-stat-size", "--sheen-text-stat-leading", "--sheen-text-stat-weight", "--sheen-text-stat-tracking"],
  a11y: { role: "term and definition", keyboard: [] },
  examples: [{ title: "Improving error rate", code: '<Stat label="Error rate" value="0.18%" trend="down" valence="positive" trendLabel="0.04 points lower" />' }, { title: "Utilization with a track", imports: 'import { Meter } from "@gemologic/sheen";', setup: 'const utilizationVisual = <Meter label="Used capacity" value={65} min={0} max={100} />;', code: '<Stat label="Utilization" value={0.65} format={{ style: "percent" }} visual={utilizationVisual} />' }],
  guidance: { do: ["State the direction and magnitude in trendLabel.", "Set valence from the metric's meaning; lower errors are positive, higher latency is negative."], dont: ["Do not rely on arrow shape or color to communicate a change.", "Do not infer whether a change is good from its direction."] },
});
