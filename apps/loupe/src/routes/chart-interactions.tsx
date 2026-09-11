import { ThemeScope } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";

const base = Date.UTC(2026, 8, 9, 12, 0, 0);
const timestamps = new Float64Array(Array.from({ length: 24 }, (_, index) => base + index * 60_000));
const latencySeries = defineSeries([
  { key: "p50", label: "p50 latency", color: "chart-1" },
  { key: "p99", label: "p99 latency", color: "chart-3" },
]);
const throughputSeries = defineSeries([
  { key: "read", label: "Reads", color: "chart-2" },
  { key: "write", label: "Writes", color: "chart-5" },
]);
const latency = {
  t: timestamps,
  p50: new Float64Array(Array.from(timestamps, (_value, index) => 16 + Math.sin(index / 3) * 2)),
  p99: new Float64Array(Array.from(timestamps, (_value, index) => index === 11 ? Number.NaN : 39 + Math.cos(index / 4) * 5)),
};
const throughput = {
  t: timestamps,
  read: new Float64Array(Array.from(timestamps, (_value, index) => 120 + index * 2)),
  write: new Float64Array(Array.from(timestamps, (_value, index) => 72 + Math.sin(index / 2) * 8)),
};

export default function ChartInteractionsFixture() {
  return <main class="loupe-chart-interactions-page">
    <h1>Chart interactions</h1>
    <ThemeScope theme="graphite" class="loupe-chart-interactions-scope">
      <TimeSeries label="Synchronized latency" summary="Latency inspection synchronizes by UTC timestamp." xLabel="Time" series={latencySeries} data={latency}
        x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} height={220} cursor={{ sync: "operations" }} annotations={[{ x: timestamps[12] ?? 0, label: "Deploy", tone: "warning" }]} />
      <TimeSeries label="Synchronized throughput" summary="Throughput shares the operations cursor group." xLabel="Time" series={throughputSeries} data={throughput}
        x={{ type: "time", tz: "UTC" }} height={220} cursor={{ sync: "operations" }} />
    </ThemeScope>
  </main>;
}
