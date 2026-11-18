import { defineMeta } from "../../ui/src/metadata.ts";
import type { HistogramProps } from "./chart-types.ts";

export default defineMeta<HistogramProps>({
  name: "Histogram", package: "@gemologic/sheen-charts", category: "data", summary: "Bins raw numeric values deterministically and renders the counts as adjacent responsive SVG bars with the BarChart inspection and table contract.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." },
    valueLabel: { description: "Required label for the measured quantity on the bin axis and table header." }, countLabel: { description: "Required label for the count axis and table column." },
    values: { description: "Raw Float64 observations; NaN values are excluded from every bin." },
    bins: { description: "Approximate bin count on nice equal-width boundaries (default Sturges' rule), or explicit strictly increasing edges. Bins are half-open except the closed last bin." },
    color: { description: "Single chart token for the bars.", default: "chart-1" },
    format: { description: "Number formatting for bin edge labels; counts always use integers.", default: "number" },
    height: { description: "Reserved SVG height, at least 160 CSS pixels." },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard bin inspection is enabled.", default: true }, empty: { description: "Optional content when there are no finite values." },
    loading: { description: "Marks retained accepted content busy.", default: false }, table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "labeled SVG image with visible narrative and native bin/count table disclosure", keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect bins.", "Use the native view-as-table disclosure for every exact count."] },
  examples: [{ title: "Response time distribution", setup: "const responseTimes = new Float64Array([112, 140, 151, 163, 170, 188, 201, 214, 236, 262, 310, Number.NaN, 420]);", code: '<Histogram label="Response time distribution" summary="Most responses finish between 100 and 250 ms with a long tail." valueLabel="Response time (ms)" countLabel="Requests" values={responseTimes} height={240} />' }],
  guidance: { do: ["Pass raw observations and let binValues decide reproducible nice edges, or pass explicit edges to compare charts.", "Mention excluded NaN or out-of-range values in summary; binValues reports both counts."], dont: ["Do not pre-aggregate into a categorical BarChart when the bins are numeric ranges.", "Do not request more than 200 bins."] },
});
