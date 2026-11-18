import { Text } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartData } from "@gemologic/sheen-charts/core";
import { useStreamingSeries } from "@gemologic/sheen-charts/streaming";
import { StatGroup } from "@gemologic/sheen-charts/svg";
import type { StatProps } from "@gemologic/sheen-charts/svg";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { PageHeader } from "@gemologic/sheen-patterns";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { bootstrap, initialData } from "../bootstrap.ts";
import { useConsole } from "../console.tsx";
import { incidents } from "../lib/incidents.ts";
import { METRIC_HISTORY, METRIC_INTERVAL_MS, parseMetricWindow } from "../lib/metrics.ts";
import type { MetricWindow } from "../lib/metrics.ts";

const rateSeries = defineSeries([{ key: "rate", label: "Requests per second", color: "chart-1" }]);
const latencySeries = defineSeries([
  { key: "p50", label: "p50 latency", color: "chart-2" },
  { key: "p99", label: "p99 latency", color: "chart-4", encoding: "dashed" },
]);

const toColumn = (values: readonly (number | null)[]): Float64Array => Float64Array.from(values, value => value ?? Number.NaN);

function chartData(window: MetricWindow | null, keys: readonly ("rate" | "p50" | "p99")[]): ChartData {
  const t = Float64Array.from(window?.t ?? []);
  return Object.fromEntries([["t", t], ...keys.map(key => [key, toColumn(window?.[key] ?? [])])]);
}

function lastFinite(values: Float64Array | undefined): number | undefined {
  if (!values) return undefined;
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index];
    if (value !== undefined && Number.isFinite(value)) return value;
  }
  return undefined;
}

function meanFinite(values: Float64Array | undefined, from: number, to: number): number | undefined {
  if (!values) return undefined;
  let sum = 0;
  let count = 0;
  for (let index = Math.max(0, from); index < Math.min(values.length, to); index++) {
    const value = values[index];
    if (value !== undefined && Number.isFinite(value)) { sum += value; count++; }
  }
  return count ? sum / count : undefined;
}

const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "medium", timeZone: "UTC" });

export default function Overview() {
  const shell = useConsole();
  const initial = initialData("metrics");
  const rate = useStreamingSeries({ capacity: METRIC_HISTORY, interval: 250, series: rateSeries, initial: chartData(initial, ["rate"]) });
  const latency = useStreamingSeries({ capacity: METRIC_HISTORY, interval: 250, series: latencySeries, initial: chartData(initial, ["p50", "p99"]) });
  const [errorRate, setErrorRate] = createSignal(initial?.errorRate.findLast(value => value !== null) ?? Number.NaN);
  const [lastSample, setLastSample] = createSignal(initial?.t.at(-1) ?? bootstrap().now - METRIC_HISTORY * 1_000);
  const rateScratch = new Float64Array(1);
  const latencyScratch = new Float64Array(2);

  /** Appends a window, inserting an explicit NaN when samples are missing between polls so uPlot draws a gap. */
  function accept(window: MetricWindow): void {
    let previous = lastSample();
    window.t.forEach((t, index) => {
      if (t <= previous) return;
      if (t - previous > METRIC_INTERVAL_MS) {
        rateScratch[0] = Number.NaN;
        latencyScratch.fill(Number.NaN);
        rate.append(previous + METRIC_INTERVAL_MS, rateScratch);
        latency.append(previous + METRIC_INTERVAL_MS, latencyScratch);
      }
      rateScratch[0] = window.rate[index] ?? Number.NaN;
      latencyScratch[0] = window.p50[index] ?? Number.NaN;
      latencyScratch[1] = window.p99[index] ?? Number.NaN;
      rate.append(t, rateScratch);
      latency.append(t, latencyScratch);
      const errors = window.errorRate[index];
      if (errors !== null && errors !== undefined) setErrorRate(errors);
      previous = t;
    });
    setLastSample(previous);
  }

  onMount(() => {
    let request: AbortController | undefined;
    let token = 0;
    const poll = async (): Promise<void> => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const current = ++token;
      try {
        const response = await fetch(`/api/metrics?after=${lastSample()}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Metrics failed (${response.status})`);
        const window = parseMetricWindow(await response.json());
        if (current !== token) return;
        accept(window);
        shell.setConnection("connected");
      } catch {
        if (!controller.signal.aborted && current === token) shell.setConnection("degraded");
      }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, METRIC_INTERVAL_MS);
    onCleanup(() => { window.clearInterval(timer); request?.abort(); });
  });

  const stats = createMemo<readonly StatProps[]>(() => {
    const rates = rate.data().rate;
    const p99 = latency.data().p99;
    const length = rates?.length ?? 0;
    const currentRate = lastFinite(rates);
    const recentRate = meanFinite(rates, length - 60, length);
    const currentP99 = lastFinite(p99);
    const recentP99 = meanFinite(p99, length - 60, length);
    const open = incidents.filter(incident => incident.status !== "Resolved").length;
    const change = (current: number | undefined, mean: number | undefined) => current !== undefined && mean ? (current - mean) / mean : 0;
    const rateChange = change(currentRate, recentRate);
    const p99Change = change(currentP99, recentP99);
    const direction = (value: number) => Math.abs(value) < 0.02 ? "flat" as const : value > 0 ? "up" as const : "down" as const;
    const describe = (value: number) => Math.abs(value) < 0.02 ? "Within 2% of the 1-minute mean" : `${Math.abs(value * 100).toFixed(1)}% ${value > 0 ? "above" : "below"} the 1-minute mean`;
    return [
      currentRate === undefined ? { label: "Requests per second", value: "No data" }
        : { label: "Requests per second", value: currentRate, format: { maximumFractionDigits: 0 }, trend: direction(rateChange), trendLabel: describe(rateChange), valence: "neutral" },
      currentP99 === undefined ? { label: "p99 latency", value: "No data" }
        : { label: "p99 latency", value: currentP99, format: { style: "unit", unit: "millisecond", maximumFractionDigits: 0 }, trend: direction(p99Change), trendLabel: describe(p99Change), valence: p99Change > 0.02 ? "negative" : p99Change < -0.02 ? "positive" : "neutral" },
      Number.isFinite(errorRate()) ? { label: "Error rate", value: errorRate(), format: { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 } } : { label: "Error rate", value: "No data" },
      { label: "Open incidents", value: open, format: { maximumFractionDigits: 0 } },
    ];
  });

  const range = createMemo(() => {
    const t = rate.data().t;
    const start = t[0];
    const end = t.at(-1);
    return start === undefined || end === undefined ? "No samples yet" : `${timeFormat.format(start)} – ${timeFormat.format(end)} UTC`;
  });

  return <div class="ops-page">
    <PageHeader title="Overview" />
    <div class="ops-meta"><Text tone="muted">Live window: {range()}</Text><Text tone="muted">Gaps mark collector outages; they are never interpolated.</Text></div>
    <StatGroup label="Service health" stats={stats()} />
    <section class="ops-charts" aria-label="Live traffic">
      <div class="ops-chart-card">
        <TimeSeries label="Request rate" summary="Requests per second over the last five minutes, one sample per second. Breaks in the line are collector outages." xLabel="Time (UTC)"
          series={rateSeries} data={rate.data()} x={{ type: "time", tz: "UTC" }} y={{ format: { maximumFractionDigits: 0 } }} height={240} area live table={{ pageSize: 10, viewLabel: "View request samples" }} />
      </div>
      <div class="ops-chart-card">
        <TimeSeries label="Latency" summary="Median and p99 response latency in milliseconds over the last five minutes. Breaks in the lines are collector outages." xLabel="Time (UTC)"
          series={latencySeries} data={latency.data()} x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} height={240} live table={{ pageSize: 10, viewLabel: "View latency samples" }} />
      </div>
    </section>
  </div>;
}
