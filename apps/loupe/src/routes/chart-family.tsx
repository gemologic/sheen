import { createMemo, createSignal } from "solid-js";
import { Button, Checkbox, ThemeScope } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import { DonutChart, Gauge, Heatmap, Histogram, ScatterChart } from "@gemologic/sheen-charts/charts-svg";
import { BarSparkline } from "@gemologic/sheen-charts/svg";
import "@gemologic/sheen-charts/styles.css";

const tierSeries = defineSeries([
  { key: "hot", label: "Hot", color: "chart-1" },
  { key: "warm", label: "Warm", color: "chart-2" },
  { key: "cold", label: "Cold", color: "chart-3" },
  { key: "archive", label: "Archive", color: "chart-4" },
]);
const initialTiers = new Float64Array([42, 31, 18, Number.NaN]);
const refreshedTiers = new Float64Array([46, 29, 21, Number.NaN]);
const hostSeries = defineSeries([
  { key: "east", label: "East", color: "chart-1" },
  { key: "west", label: "West", color: "chart-4" },
]);
const initialHosts = {
  east: { x: new Float64Array([120, 240, 380, 510, 640]), y: new Float64Array([18, 22, 31, 44, 52]), size: new Float64Array([4, 6, 8, 12, 16]) },
  west: { x: new Float64Array([90, 210, Number.NaN, 470, 590]), y: new Float64Array([16, 19, 25, 37, 41]), size: new Float64Array([3, 5, 7, 9, 11]) },
};
const refreshedHosts = {
  east: { x: new Float64Array([130, 250, 400, 530, 660]), y: new Float64Array([17, 21, 29, 40, 49]), size: new Float64Array([4, 6, 9, 13, 16]) },
  west: { x: new Float64Array([100, 220, Number.NaN, 480, 600]), y: new Float64Array([15, 18, 24, 35, 39]), size: new Float64Array([3, 5, 7, 10, 12]) },
};
const hours = ["00", "03", "06", "09", "12", "15", "18", "21"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const initialGrid = new Float64Array([
  2, 1, 3, 8, 12, 9, 5, 3,
  1, 1, 4, 9, 14, 11, 6, 2,
  2, 2, 3, 7, Number.NaN, 10, 5, 3,
  3, 1, 5, 10, 16, 12, 7, 4,
  1, 0, 2, 6, 9, 7, 4, 2,
]);
const refreshedGrid = initialGrid.map((value, index) => Number.isNaN(value) ? value : value + (index % 3));
const initialResponses = new Float64Array([112, 126, 140, 151, 158, 163, 170, 177, 188, 194, 201, 214, 222, 236, 248, 262, 281, 310, Number.NaN, 355, 420]);
const refreshedResponses = initialResponses.map(value => value * 0.9);
const initialDeploys = new Float64Array([3, 5, 2, Number.NaN, 6, 4, 7, 5, 8, 6]);
const refreshedDeploys = new Float64Array([5, 2, Number.NaN, 6, 4, 7, 5, 8, 6, 9]);
const diskThresholds = [{ value: 0.7, tone: "warning", label: "High" }, { value: 0.9, tone: "danger", label: "Critical" }] satisfies Parameters<typeof Gauge>[0]["thresholds"];

export default function ChartFamilyFixture() {
  const [refreshed, setRefreshed] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [reject, setReject] = createSignal(false);
  const [error, setError] = createSignal(false);
  const tiers = createMemo(() => refreshed() ? refreshedTiers : initialTiers);
  const hosts = createMemo(() => refreshed() ? refreshedHosts : initialHosts);
  const grid = createMemo(() => ({ x: hours, y: days, values: refreshed() ? refreshedGrid : initialGrid }));
  const responses = createMemo(() => refreshed() ? refreshedResponses : initialResponses);

  async function refresh(): Promise<void> {
    if (pending()) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
      if (!response.ok) throw new Error(`Chart refresh failed (${response.status})`);
      setRefreshed(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <main class="loupe-chart-gallery-page">
    <h1>SVG chart family</h1>
    <div class="actions"><Button disabled={pending()} onClick={() => void refresh()}>Refresh chart family</Button><Checkbox label="Reject next refresh" checked={reject()} onCheckedChange={setReject} /></div>
    <output class="loupe-chart-gallery-status" role="status" aria-live="polite">{pending() ? "Refreshing chart family" : error() ? "Refresh failed; accepted charts retained" : ""}</output>
    <ThemeScope theme="graphite" class="loupe-chart-gallery-scope">
      <section class="loupe-chart-gallery-grid">
        <DonutChart label="Storage by tier" summary="Hot storage holds almost half of the data; archive totals were not reported." categoryLabel="Tier" valueLabel="Terabytes"
          series={tierSeries} values={tiers()} height={240} loading={pending()} />
        <DonutChart label="Storage share" summary="The same tiers as a pie." categoryLabel="Tier" valueLabel="Terabytes" class="loupe-chart-pie"
          series={tierSeries} values={tiers()} innerRadius={0} height={240} legend="stacked" loading={pending()} />
        <ScatterChart label="Latency against load" summary="Latency rises with request rate in both regions; one West sample has no load reading." xLabel="Requests per second" yLabel="p95 latency"
          series={hostSeries} data={hosts()} y={{ format: { maximumFractionDigits: 0 } }} size={{ label: "Hosts" }} height={260} loading={pending()} table={{ pageSize: 5 }} />
        <Heatmap label="Errors by weekday and hour" summary="Errors peak around midday; one Wednesday bucket was not collected." xLabel="Hour (UTC)" yLabel="Day" valueLabel="Errors"
          data={grid()} height={240} loading={pending()} />
        <Histogram label="Response time distribution" summary="Most responses finish between 100 and 250 ms; one sample is missing." valueLabel="Response time (ms)" countLabel="Requests"
          values={responses()} bins={8} height={240} loading={pending()} />
        <div class="loupe-chart-family-small" style={{ display: "flex", "flex-wrap": "wrap", "align-items": "flex-start", gap: "var(--sheen-space-block-lg) var(--sheen-space-inline-xl)" }}>
          <Gauge label="Disk usage" summary="Primary volume" value={refreshed() ? 0.93 : 0.76} min={0} max={1} thresholds={diskThresholds} format="percent" />
          <Gauge label="Battery" value={refreshed() ? Number.NaN : 0.18} min={0} max={1} thresholdDirection="descending" format="percent"
            thresholds={[{ value: 0.1, tone: "danger", label: "Critical" }, { value: 0.25, tone: "warning", label: "Low" }]} />
          <BarSparkline values={refreshed() ? refreshedDeploys : initialDeploys} label="Deploys per day over ten days, one day missing" color="chart-2" width={160} height={32} />
        </div>
      </section>
    </ThemeScope>
  </main>;
}
