import { defineMeta } from "../../ui/src/metadata.ts";
import type { GaugeProps } from "./chart-types.ts";

export default defineMeta<GaugeProps>({
  name: "Gauge", package: "@gemologic/sheen-charts", category: "data", summary: "Shows one bounded value as a radial meter with exact visible text, threshold bands, and a labeled status band.",
  props: {
    label: { description: "Required visible and accessible meter name." },
    value: { description: "Finite reading, or NaN for a missing reading; out-of-range values clamp the arc but keep their exact text." },
    min: { description: "Required finite lower bound." }, max: { description: "Required finite upper bound greater than min." },
    thresholds: { description: "Strictly ascending in-range band starts with a status tone and visible label." },
    thresholdDirection: { description: "Whether bands apply at or above their value (higher is worse) or at or below it (lower is worse).", default: "ascending", control: { kind: "select", values: ["ascending", "descending"] } },
    format: { description: "Value and bound formatting.", default: "number" },
    color: { description: "Fill token while no threshold band is active.", default: "chart-1" },
    summary: { description: "Optional visible description associated with the meter." },
    size: { description: "Maximum inline size in CSS pixels, at least 96.", default: 200 },
    class: { description: "Optional class appended to the figure." },
  },
  tokens: ["--sheen-chart-1", "--sheen-color-success", "--sheen-color-warning", "--sheen-color-danger", "--sheen-chart-axis", "--sheen-text-stat-size"],
  a11y: { role: "meter with aria-valuemin, aria-valuemax, aria-valuenow, and value text that includes the active band label", keyboard: [] },
  examples: [{ title: "Disk usage", code: '<Gauge label="Disk usage" value={0.76} min={0} max={1} thresholds={[{ value: 0.7, tone: "warning", label: "High" }, { value: 0.9, tone: "danger", label: "Critical" }]} format="percent" />' }],
  guidance: { do: ["Use for one bounded reading against known limits; keep the exact value visible.", "Give every threshold a text label so state never depends on color."], dont: ["Do not use a gauge per row; use a Meter list or table.", "Do not use a gauge for unbounded values or trends."] },
});
