import { defineMeta } from "../../ui/src/metadata.ts";
import type { LineChartProps } from "./chart-types.ts";

export default defineMeta<LineChartProps>({
  name: "LineChart", package: "@gemologic/sheen-charts", category: "data", summary: "Renders a responsive token-themed SVG line chart for bounded time or numeric data with explicit gaps.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." }, xLabel: { description: "Required domain-axis and native-table label." },
    series: { description: "Validated series definitions with semantic colors and optional non-color line encodings." }, data: { description: "Equal-length Float64 columns; NaN breaks a path." }, x: { description: "Time or numeric domain formatting." },
    y: { description: "Shared value formatting and optional zero baseline." }, height: { description: "Reserved SVG height, at least 120 CSS pixels." }, legend: { description: "Inline, stacked, or hidden series key.", default: "inline" },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard inspection is enabled.", default: true }, annotations: { description: "Optional labeled domain positions." }, empty: { description: "Optional empty-state content." },
    loading: { description: "Marks retained accepted content busy.", default: false }, table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." },
    curve: { description: "Honest linear or step-after interpolation.", default: "linear", control: { kind: "select", values: ["linear", "step"] } },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-chart-line-width", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "labeled SVG image with visible narrative and native table disclosure", keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect samples.", "Use the native view-as-table disclosure for every exact sample."] },
  examples: [{ title: "Request latency", setup: "const requestSeries = defineSeries([{ key: 'p50', label: 'p50', color: 'chart-1' }, { key: 'p99', label: 'p99', color: 'chart-3' }]);\nconst requestData = { t: new Float64Array([1704067200000, 1704067260000, 1704067320000]), p50: new Float64Array([18, 16, 15]), p99: new Float64Array([42, Number.NaN, 34]) };", code: '<LineChart label="Request latency" summary="Latency declined; one p99 sample is missing." xLabel="Time" series={requestSeries} data={requestData} x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} height={240} />' }],
  guidance: { do: ["Use for complete bounded data under 2,000 marks and retain NaN gaps."], dont: ["Do not use SVG for high-volume or streaming time series; use TimeSeries."] },
});
