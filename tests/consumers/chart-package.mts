import assert from "node:assert/strict";
import { ChartDataTable, createChartTableFormatters, useStreamingSeries, useThemeTokens } from "@gemologic/sheen-charts";
import { invalidateThemeTokens } from "@gemologic/sheen-charts/loupe";
import type { ChartDataTableProps, ThemeTokenName } from "@gemologic/sheen-charts";

const name: ThemeTokenName = "--sheen-chart-1";
assert.equal(name, "--sheen-chart-1");
assert.equal(typeof useThemeTokens, "function");
assert.equal(typeof invalidateThemeTokens, "function");
assert.equal(typeof ChartDataTable, "function");
assert.equal(typeof createChartTableFormatters, "function");
assert.equal(typeof useStreamingSeries, "function");
const table: ChartDataTableProps = {
  label: "Latency", summary: "Latency declined.", xLabel: "Time",
  series: [{ key: "p99", label: "p99", color: "chart-1" }],
  data: { t: new Float64Array(), p99: new Float64Array() }, x: { type: "time" },
};
assert.equal(table.label, "Latency");
process.stdout.write("Isolated chart hook and Loupe invalidation exports passed\n");
