import { Show, createSignal } from "solid-js";
import { Button, Checkbox, ThemeScope } from "@gemologic/sheen";
import { Sparkline, StatGroup } from "@gemologic/sheen-charts/svg";
import { ChartDataTable } from "@gemologic/sheen-charts/table";
import { defineSeries } from "@gemologic/sheen-charts/core";

const initial = new Float64Array([18, 16, 15, Number.NaN, 14, 13, 12, 13]);
const refreshed = new Float64Array([13, 12, Number.NaN, 11, 10, 9, 8, 7]);
const timestamps = new Float64Array(Array.from({ length: 8 }, (_, index) => Date.UTC(2024, 0, 1, index)));
const latencySeries = defineSeries([{ key: "latency", label: "p99 latency", color: "chart-3" }]);

export default function ChartSvgFixture() {
  const [values, setValues] = createSignal(initial);
  const [pending, setPending] = createSignal(false);
  const [reject, setReject] = createSignal(false);
  const [error, setError] = createSignal(false);
  async function refresh(): Promise<void> {
    if (pending()) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
      if (!response.ok) throw new Error(`Chart refresh failed (${response.status})`);
      setValues(refreshed);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return <main class="loupe-chart-svg-page">
    <h1>Dependency-free chart display</h1>
    <div class="actions"><Button disabled={pending()} onClick={() => void refresh()}>Refresh metrics</Button><Checkbox label="Reject next refresh" checked={reject()} onCheckedChange={setReject} /></div>
    <output class="loupe-chart-svg-status" role="status" aria-live="polite">{pending() ? "Refreshing metrics" : error() ? "Refresh failed; accepted metrics retained" : ""}</output>
    <ThemeScope theme="slate" locale="de-DE" messages={{ chartViewAsTable: "Daten als Tabelle", chartMissingValue: "Fehlender Wert", chartTablePagination: "Diagrammdatenseiten" }} class="loupe-chart-svg-surface">
      <Sparkline values={values()} label="Latency over eight samples, with missing values shown as gaps" color="chart-3" width={320} height={64} />
      <StatGroup label="Service health" stats={[
        { label: "p99 latency", value: `${values()[values().length - 1] ?? 0} ms`, trend: "down", trendLabel: "5 milliseconds lower" },
        { label: "Requests", value: "18.2k", trend: "up", trendLabel: "8 percent higher" },
        { label: "Availability", value: "99.98%", trend: "flat", trendLabel: "unchanged" },
      ]} />
      <ChartDataTable label="API latency" summary="Latency declined over the accepted interval; one sample is missing." xLabel="Time"
        series={latencySeries} data={{ t: timestamps, latency: values() }} x={{ type: "time", tz: "America/New_York" }} y={{ format: "duration" }} pageSize={4} loading={pending()} />
      <Show when={error()}><p class="loupe-chart-svg-error">The accepted visualization was not replaced.</p></Show>
    </ThemeScope>
  </main>;
}
