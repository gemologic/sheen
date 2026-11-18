import { defineMeta } from "../../ui/src/metadata.ts";
import type { ScatterChartProps } from "./chart-types.ts";

export default defineMeta<ScatterChartProps>({
  name: "ScatterChart", package: "@gemologic/sheen-charts", category: "data", summary: "Plots bounded numeric x/y points per series in responsive SVG with distinct point shapes and an optional area-proportional size channel.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." },
    xLabel: { description: "Required horizontal axis and table column label." }, yLabel: { description: "Required vertical axis and table column label." },
    series: { description: "Validated series definitions; each series also receives a distinct point shape." },
    data: { description: "Per-series equal-length Float64 x, y, and optional size columns. A NaN x or y omits that point." },
    x: { description: "Horizontal value formatting and optional zero inclusion." }, y: { description: "Vertical value formatting and optional zero inclusion." },
    size: { description: "Optional size channel label, formatting, and marker radius range; area scales with the square root of the value." },
    height: { description: "Reserved SVG height, at least 160 CSS pixels." }, legend: { description: "Inline, stacked, or hidden series key with show/hide toggles.", default: "inline" },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard point inspection is enabled.", default: true }, empty: { description: "Optional content when no point is defined." },
    loading: { description: "Marks retained accepted content busy.", default: false }, table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "labeled SVG image with visible narrative, shape-encoded legend, and native point table disclosure", keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect points in ascending x order.", "Use the native view-as-table disclosure for every exact point."] },
  examples: [{ title: "Latency against load", setup: "const hostSeries = defineSeries([{ key: 'east', label: 'East', color: 'chart-1' }, { key: 'west', label: 'West', color: 'chart-4' }]);\nconst hostData = { east: { x: new Float64Array([120, 240, 380, 510]), y: new Float64Array([18, 22, 31, 44]) }, west: { x: new Float64Array([90, 210, Number.NaN, 470]), y: new Float64Array([16, 19, 25, 37]) } };", code: '<ScatterChart label="Latency against load" summary="Latency rises with request rate in both regions." xLabel="Requests per second" yLabel="p95 latency" series={hostSeries} data={hostData} y={{ format: "duration" }} height={260} />' }],
  guidance: { do: ["Keep series to three or fewer when points overlap so shapes and colors stay distinct.", "Describe the relationship in summary rather than relying on the visual pattern."], dont: ["Do not exceed 2,000 SVG points or use a second y scale.", "Do not encode a quantity only through marker size without the table."] },
});
