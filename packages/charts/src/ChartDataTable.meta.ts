import { defineMeta } from "../../ui/src/metadata.ts";
import type { ChartDataTableProps } from "./chart-types.ts";

export default defineMeta<ChartDataTableProps>({
  name: "ChartDataTable", package: "@gemologic/sheen-charts", category: "data", summary: "Provides a bounded, localized native-table alternative and narrative summary for a chart.",
  props: {
    label: { description: "Required accessible table caption naming the chart data." },
    summary: { description: "Required narrative description shown when the table disclosure opens." },
    xLabel: { description: "Required header for the time or numeric domain column." },
    series: { description: "Validated series definitions used as column headers." },
    data: { description: "Validated equal-length Float64 columns; NaN cells remain explicit gaps." },
    x: { description: "Time or numeric domain formatting; omitted timezones deterministically use UTC." },
    y: { description: "Shared value formatting for every series column." },
    pageSize: { description: "Rows mounted per table page, from 1 through 200.", default: 50 },
    viewLabel: { description: "Optional localized disclosure label; context messages supply the default." },
    loading: { description: "Marks the retained accepted table busy without replacing its rows.", default: false },
    class: { description: "Optional class appended to the disclosure root." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-color-border", "--sheen-color-bg-subtle"],
  a11y: { role: "native details disclosure containing a captioned table", keyboard: ["Enter or Space toggles the native summary.", "Pagination uses native button order."] },
  examples: [{
    title: "Latency data alternative",
    setup: "const latencySeries = defineSeries([{ key: 'p99', label: 'p99 latency', color: 'chart-3' }]);\nconst latencyData = { t: new Float64Array([1704067200000, 1704067260000]), p99: new Float64Array([42, Number.NaN]) };",
    code: '<ChartDataTable label="API latency" summary="Latency generally declined; one sample is missing." xLabel="Time" series={latencySeries} data={latencyData} x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} />',
  }],
  guidance: { do: ["Give every chart a concise narrative summary and preserve gaps as missing values.", "Keep page sizes bounded even though chart data is already in memory."], dont: ["Do not mount an entire high-volume time series as table rows.", "Do not format dates with the browser's implicit timezone or locale."] },
});
