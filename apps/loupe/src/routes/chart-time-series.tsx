import { Show, createMemo, createSignal } from "solid-js";
import { Button, Checkbox, ThemeScope } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";

const timestamps = new Float64Array(Array.from({ length: 48 }, (_, index) => Date.UTC(2026, 8, 1, 12, index)));
const initialP50 = new Float64Array(Array.from({ length: 48 }, (_, index) => 18 + Math.sin(index / 5) * 3));
const initialP99 = new Float64Array(Array.from({ length: 48 }, (_, index) => index === 19 ? Number.NaN : 44 + Math.cos(index / 4) * 7));
const refreshedP50 = new Float64Array(Array.from({ length: 48 }, (_, index) => 15 + Math.sin(index / 5) * 2));
const refreshedP99 = new Float64Array(Array.from({ length: 48 }, (_, index) => index === 19 ? Number.NaN : 36 + Math.cos(index / 4) * 5));
const series = defineSeries([
  { key: "p50", label: "p50 latency", color: "chart-1" },
  { key: "p99", label: "p99 latency", color: "chart-3" },
]);

export default function ChartTimeSeriesFixture() {
  const [refreshed, setRefreshed] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [reject, setReject] = createSignal(false);
  const [error, setError] = createSignal(false);
  const [theme, setTheme] = createSignal<"slate" | "paper">("slate");
  const [narrow, setNarrow] = createSignal(false);
  const [mounted, setMounted] = createSignal(true);
  const [zoom, setZoom] = createSignal("full");
  const data = createMemo(() => ({
    t: timestamps,
    p50: refreshed() ? refreshedP50 : initialP50,
    p99: refreshed() ? refreshedP99 : initialP99,
  }));

  async function refresh(): Promise<void> {
    if (pending()) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
      if (!response.ok) throw new Error(`TimeSeries refresh failed (${response.status})`);
      setRefreshed(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return <main class="loupe-time-series-page">
    <h1>Time series lifecycle</h1>
    <div class="actions">
      <Button disabled={pending()} onClick={() => void refresh()}>Refresh time series</Button>
      <Checkbox label="Reject next refresh" checked={reject()} onCheckedChange={setReject} />
      <Button onClick={() => setTheme(value => value === "slate" ? "paper" : "slate")}>Toggle scoped chart theme</Button>
      <Button onClick={() => setNarrow(value => !value)}>Toggle chart width</Button>
      <Button onClick={() => setMounted(value => !value)}>Toggle chart mount</Button>
    </div>
    <output class="loupe-time-series-status" role="status" aria-live="polite">{pending() ? "Refreshing time series" : error() ? "Refresh failed; accepted chart retained" : ""}</output>
    <output aria-label="Accepted zoom range">{zoom()}</output>
    <ThemeScope theme={theme()} class="loupe-time-series-scope">
      <div classList={{ "loupe-time-series-surface": true, "loupe-time-series-surface-narrow": narrow() }}>
        <Show when={mounted()} fallback={<p>Chart unmounted</p>}><TimeSeries
          label="API latency"
          summary="p50 and p99 latency over 48 minutes; one p99 sample is missing."
          xLabel="Time"
          series={series}
          data={data()}
          x={{ type: "time", tz: "America/New_York" }}
          y={{ format: "duration", zero: true }}
          height={240}
          legend="inline"
          annotations={[{ x: timestamps[24] ?? 0, label: "Deploy", tone: "accent" }]}
          onZoom={range => setZoom(range === null ? "full" : `${Math.round(range[0])}:${Math.round(range[1])}`)}
          table={{ pageSize: 12 }}
          loading={pending()}
        /></Show>
      </div>
    </ThemeScope>
  </main>;
}
