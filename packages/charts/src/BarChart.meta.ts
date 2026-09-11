import { defineMeta } from "../../ui/src/metadata.ts";
import type { BarChartProps } from "./chart-types.ts";

export default defineMeta<BarChartProps>({
  name: "BarChart", package: "@gemologic/sheen-charts", category: "data", summary: "Renders bounded grouped or stacked categorical bars in vertical or horizontal responsive SVG layouts.",
  props: {
    label: { description: "Required visible and accessible chart name." }, summary: { description: "Required narrative interpretation." }, categoryLabel: { description: "Required label for the categorical axis and table column." },
    valueLabel: { description: "Required label for the quantitative axis." }, series: { description: "Validated series definitions and semantic colors." }, data: { description: "Unique category labels plus equal-length Float64 value columns." },
    y: { description: "Value formatting; bars always retain an honest zero baseline." }, height: { description: "Reserved SVG height, at least 160 CSS pixels." }, legend: { description: "Inline, stacked, or hidden series key.", default: "inline" },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard category inspection is enabled.", default: true }, empty: { description: "Optional empty-state content." }, loading: { description: "Marks retained accepted content busy.", default: false },
    table: { description: "Native-table disclosure label and bounded page size." }, class: { description: "Optional class appended to the figure." }, layout: { description: "Vertical columns or horizontal bars.", default: "vertical", control: { kind: "select", values: ["vertical", "horizontal"] } },
    arrangement: { description: "Bars grouped beside each other or stacked by sign.", default: "grouped", control: { kind: "select", values: ["grouped", "stacked"] } },
  },
  tokens: ["--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "labeled SVG image with visible narrative and native categorical table disclosure", keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect categories.", "Use the native view-as-table disclosure for every exact category and value."] },
  examples: [{ title: "Revenue by region", setup: "const revenueSeries = defineSeries([{ key: 'current', label: 'Current', color: 'chart-1' }, { key: 'previous', label: 'Previous', color: 'chart-3' }]);\nconst revenueData = { categories: ['North', 'South', 'West'], values: { current: new Float64Array([42, 36, 51]), previous: new Float64Array([38, Number.NaN, 46]) } };", code: '<BarChart label="Regional revenue" summary="West leads; South lacks a prior-period value." categoryLabel="Region" valueLabel="Revenue" series={revenueSeries} data={revenueData} y={{ format: "number" }} height={260} arrangement="grouped" />' }],
  guidance: { do: ["Use unique explicit category labels and preserve missing bars as NaN."], dont: ["Do not truncate the quantitative axis away from zero or exceed 2,000 SVG marks."] },
});
