import { defineMeta } from "../../ui/src/metadata.ts";
import type { StatProps } from "./chart-types.ts";

export default defineMeta<StatProps>({
  name: "Stat", package: "@gemologic/sheen-charts", category: "data", summary: "Presents one tabular metric with an optional text-labeled directional trend.",
  props: {
    label: { description: "Required visible metric label." },
    value: { description: "Nonempty display text or a finite number." },
    trend: { description: "Optional directional state; requires trendLabel." },
    trendLabel: { description: "Required visible non-color description when trend is supplied." },
    class: { description: "Optional class appended to the component root." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-color-market-up", "--sheen-color-market-down", "--sheen-color-market-flat", "--sheen-text-h2-size"],
  a11y: { role: "term and definition", keyboard: [] },
  examples: [{ title: "Directional metric", code: '<Stat label="Error rate" value="0.18%" trend="down" trendLabel="0.04 points lower" />' }],
  guidance: { do: ["State the direction and magnitude in trendLabel."], dont: ["Do not rely on arrow shape or color to communicate a change."] },
});
