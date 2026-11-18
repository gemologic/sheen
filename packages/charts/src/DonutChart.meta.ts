import { defineMeta } from "../../ui/src/metadata.ts";
import type { DonutChartProps } from "./chart-types.ts";

export default defineMeta<DonutChartProps>({
  name: "DonutChart", package: "@gemologic/sheen-charts", category: "data", summary: "Renders up to eight parts of one whole as a responsive SVG donut or pie with a visible center total, legend, and native table.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." },
    categoryLabel: { description: "Required label for the part column in the native table." }, valueLabel: { description: "Required label for part values, the default center caption, and the table value column." },
    series: { description: "One validated definition per part, drawn clockwise from twelve o'clock in declaration order; at most eight." },
    values: { description: "Float64 value per series in series order; non-negative or NaN for a missing part." },
    format: { description: "Value formatting for the center total, tooltip, and table.", default: "number" },
    innerRadius: { description: "Hole radius as a fraction of the outer radius; 0 renders a pie without a center slot.", default: 0.62 },
    center: { description: "Optional content that replaces the default visible total in the donut hole." },
    height: { description: "Reserved SVG height, at least 160 CSS pixels." }, legend: { description: "Inline, stacked, or hidden part key with show/hide toggles.", default: "inline" },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard part inspection is enabled.", default: true }, empty: { description: "Optional content when no part has a positive value." },
    loading: { description: "Marks retained accepted content busy.", default: false }, table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-3", "--sheen-chart-grid", "--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-text-stat-size"],
  a11y: { role: "labeled SVG image with visible narrative, legend, and native part/value/share table disclosure", keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect parts.", "Use the native view-as-table disclosure for every exact value and share."] },
  examples: [{ title: "Storage by tier", setup: "const tierSeries = defineSeries([{ key: 'hot', label: 'Hot', color: 'chart-1' }, { key: 'warm', label: 'Warm', color: 'chart-2' }, { key: 'cold', label: 'Cold', color: 'chart-3' }]);\nconst tierValues = new Float64Array([42, 31, 18]);", code: '<DonutChart label="Storage by tier" summary="Hot storage holds almost half of all data." categoryLabel="Tier" valueLabel="Terabytes" series={tierSeries} values={tierValues} height={240} />' }],
  guidance: { do: ["Use for one whole split into a few parts read at a glance; fold small tails into an Other part.", "Keep shares exact in the native table and summary."], dont: ["Do not compare close values or many parts with a donut; use BarChart.", "Do not pass negative values or more than eight parts."] },
});
