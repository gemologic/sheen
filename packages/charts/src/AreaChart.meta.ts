import { defineMeta } from "../../ui/src/metadata.ts";
import type { AreaChartProps } from "./chart-types.ts";

export default defineMeta<AreaChartProps>({
  name: "AreaChart", package: "@gemologic/sheen-charts", category: "data", summary: "Renders bounded SVG area series with honest NaN gaps and optional positive/negative stacking.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." }, xLabel: { description: "Required domain-axis and native-table label." },
    series: { description: "Validated series definitions with semantic colors and optional non-color line encodings." }, data: { description: "Equal-length Float64 columns; NaN terminates line and fill." }, x: { description: "Time or numeric domain formatting." },
    y: { description: "Shared value formatting and optional zero baseline." }, height: { description: "Reserved SVG height, at least 120 CSS pixels." }, legend: { description: "Inline, stacked, or hidden series key.", default: "inline" },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard inspection is enabled.", default: true }, annotations: { description: "Optional labeled domain positions." }, empty: { description: "Optional empty-state content." },
    loading: { description: "Marks retained accepted content busy.", default: false }, table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." },
    curve: { description: "Honest linear or step-after interpolation.", default: "linear", control: { kind: "select", values: ["linear", "step"] } }, stacked: { description: "Stacks positive and negative values independently.", default: false },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-chart-line-width", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "labeled SVG image with visible narrative and native table disclosure", keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect samples.", "Use the native view-as-table disclosure for every exact sample."] },
  examples: [{ title: "Traffic volume", setup: "const trafficSeries = defineSeries([{ key: 'read', label: 'Reads', color: 'chart-1' }, { key: 'write', label: 'Writes', color: 'chart-2' }]);\nconst trafficData = { t: new Float64Array([1, 2, 3]), read: new Float64Array([20, 24, 22]), write: new Float64Array([8, Number.NaN, 12]) };", code: '<AreaChart label="Traffic" summary="Reads remain above writes; one write sample is missing." xLabel="Interval" series={trafficSeries} data={trafficData} x={{ type: "number" }} height={240} stacked />' }],
  guidance: { do: ["Use stacking only when totals and component contribution are meaningful."], dont: ["Do not interpolate or fill across NaN gaps."] },
});
