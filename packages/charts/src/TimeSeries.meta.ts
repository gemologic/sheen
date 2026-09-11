import { defineMeta } from "../../ui/src/metadata.ts";
import type { TimeSeriesProps } from "./chart-types.ts";

export default defineMeta<TimeSeriesProps>({
  name: "TimeSeries",
  package: "@gemologic/sheen-charts",
  category: "data",
  summary: "Progressively enhances a deterministic time-series fallback with a responsive themed uPlot canvas and native data alternative.",
  props: {
    label: { description: "Required visible and accessible chart name." },
    summary: { description: "Required narrative interpretation used alongside the visual and table alternative." },
    xLabel: { description: "Required time-axis label and native table heading." },
    series: { description: "Stable validated series definitions with semantic color tokens and optional solid, dashed, dotted, or dash-dot non-color encoding." },
    data: { description: "Equal-length Float64 columns using UTC epoch milliseconds and NaN gaps." },
    x: { description: "Time formatting configuration; timezone changes presentation only." },
    y: { description: "Shared value formatting and optional zero baseline." },
    height: { description: "Positive finite reserved plot height in CSS pixels." },
    legend: { description: "Legend presentation; false hides it.", default: "inline" },
    tooltip: { description: "Whether single-tab-stop pointer and keyboard crosshair inspection is enabled.", default: true },
    annotations: { description: "Optional labeled events at UTC epoch-millisecond positions." },
    empty: { description: "Optional retained empty-state content for a zero-row dataset." },
    loading: { description: "Marks accepted chart and table content busy without replacing either.", default: false },
    table: { description: "Native table page size and disclosure label; the alternative cannot be disabled." },
    class: { description: "Optional class appended to the figure root." },
    cursor: { description: "Optional named cursor-sync group." },
    onZoom: { description: "Receives the accepted x range after drag zoom and null after reset." },
    __unsafe_uplot: { description: "Explicit typed escape hatch for uPlot options not owned by the Sheen lifecycle." },
  },
  tokens: [
    "--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-3", "--sheen-chart-4", "--sheen-chart-5", "--sheen-chart-6", "--sheen-chart-7", "--sheen-chart-8",
    "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-chart-crosshair", "--sheen-chart-line-width", "--sheen-color-fg", "--sheen-color-fg-muted",
  ],
  a11y: {
    role: "labeled figure with an image description and native table disclosure",
    keyboard: ["Focus the plot and use Left/Right, Home/End, and Escape to inspect samples.", "Use the native view-as-table disclosure for complete keyboard access to every sample.", "Use legend buttons and zoom controls when those interactions are enabled."],
  },
  examples: [{
    title: "API latency",
    setup: "const latencySeries = defineSeries([{ key: 'p50', label: 'p50', color: 'chart-1' }, { key: 'p99', label: 'p99', color: 'chart-3' }]);\nconst latencyData = { t: new Float64Array([1704067200000, 1704067260000, 1704067320000]), p50: new Float64Array([18, 16, 15]), p99: new Float64Array([42, Number.NaN, 34]) };",
    code: '<TimeSeries label="API latency" summary="Latency declined; one p99 sample is missing." xLabel="Time" series={latencySeries} data={latencyData} x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} height={220} legend="inline" />',
  }],
  composer: { allowedParentRegions: ["main-grid", "details-panel"], acceptedChildRegions: [], editableSafeProps: ["label", "summary", "xLabel", "height", "legend", "tooltip"], fixtureFactory: "latency-chart", codeGenerationAdapter: "time-series-fixture" },
  guidance: {
    do: ["Keep series identities stable and retain accepted data while a refresh is pending.", "Use UTC epoch milliseconds and NaN for gaps, then provide an interpretive summary.", "Use explicit non-color encodings when palette colors repeat or color alone cannot carry the distinction."],
    dont: ["Do not hide the native table alternative or pass Date/string timestamps.", "Do not key the chart by data revision, theme, or size."],
  },
});
