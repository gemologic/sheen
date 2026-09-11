import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { ThemeScope, useTheme } from "@gemologic/sheen";
import { defineSeries, validateColumnar } from "@gemologic/sheen-charts/core";
import { Sparkline } from "@gemologic/sheen-charts/svg";
import { useStreamingSeries } from "@gemologic/sheen-charts/streaming";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { chartBenchmarkFixture, createChartBenchmarkData } from "../../../../bench/fixtures/chart.ts";

type BenchmarkFixture = "large" | "streaming" | "sparkline" | "theme";

const series = defineSeries([
  { key: "primary", label: "Primary", color: "chart-1" },
  { key: "secondary", label: "Secondary", color: "chart-3" },
  { key: "tertiary", label: "Tertiary", color: "chart-5" },
  { key: "quaternary", label: "Quaternary", color: "chart-7" },
]);
const largeData = validateColumnar(createChartBenchmarkData(chartBenchmarkFixture.points), series);
const streamData = validateColumnar(createChartBenchmarkData(chartBenchmarkFixture.streamInitialPoints), series);
const themeData = validateColumnar(createChartBenchmarkData(chartBenchmarkFixture.themePoints), series);
const themeCharts = Object.freeze(Array.from({ length: chartBenchmarkFixture.themeCharts }, (_, index) => index));
const sparklineValues = new Float64Array(Array.from({ length: 128 }, (_value, index) => 20 + Math.sin(index / 8) * 6));

function StreamingBenchmark(): JSX.Element {
  const stream = useStreamingSeries({ capacity: 2_048, interval: 16, series, initial: streamData });
  const [state, setState] = createSignal<"idle" | "running" | "done">("idle");
  const values = new Float64Array(series.length);
  let timestamp = (streamData.t[streamData.t.length - 1] ?? Date.UTC(2026, 0, 1)) + 1_000;
  let timer: number | undefined;

  function stop(): void {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  }

  function start(): void {
    if (timer !== undefined) return;
    let published = 0;
    setState("running");
    timer = window.setInterval(() => {
      values[0] = 52 + Math.sin(published / 7) * 4;
      values[1] = 64 + Math.cos(published / 9) * 7;
      values[2] = published % 41 === 0 ? Number.NaN : 38 + Math.sin(published / 5) * 3;
      values[3] = 78 + Math.cos(published / 11) * 6;
      stream.append(timestamp, values);
      timestamp += 1_000;
      published++;
      if (published >= chartBenchmarkFixture.streamSamples) {
        stop();
        window.requestAnimationFrame(() => setState("done"));
      }
    }, chartBenchmarkFixture.streamIntervalMs);
  }

  onCleanup(stop);
  return <section class="loupe-chart-benchmark-fixture" data-stream-state={state()}>
    <button type="button" data-chart-benchmark-stream onClick={start}>Stream 120 samples</button>
    <output data-chart-benchmark-stream-size>{stream.size()}</output>
    <output data-chart-benchmark-stream-dropped>{stream.dropped()}</output>
    <TimeSeries label="Streaming benchmark" summary="Four deterministic series update at sixty samples per second." xLabel="Time"
      series={series} data={stream.data()} x={{ type: "time", tz: "UTC" }} height={320} legend={false} table={{ pageSize: 10 }} />
  </section>;
}

function ThemeBenchmark(): JSX.Element {
  const theme = useTheme();
  const [revision, setRevision] = createSignal(0);

  async function switchTheme(): Promise<void> {
    const next = revision() % 2 === 0;
    await Promise.all([theme.setMode(next ? "light" : "dark"), theme.setAccent(next ? "violet" : "jade")]);
    setRevision(value => value + 1);
  }

  return <section class="loupe-chart-benchmark-fixture" data-chart-theme-revision={revision()}>
    <button type="button" data-chart-benchmark-theme onClick={() => void switchTheme()}>Switch chart theme and accent</button>
    <div class="loupe-chart-benchmark-grid">
      <For each={themeCharts}>{index => <TimeSeries label={`Theme benchmark ${index + 1}`} summary="A small retained chart in the twenty-chart theme workload." xLabel="Time"
        series={series} data={themeData} x={{ type: "time", tz: "UTC" }} height={120} legend={false} tooltip={false} table={{ pageSize: 1 }} />}</For>
    </div>
  </section>;
}

export default function ChartBenchmarkRoute(): JSX.Element {
  const [ready, setReady] = createSignal(false);
  const [active, setActive] = createSignal<BenchmarkFixture>();
  onMount(() => {
    if (new URL(window.location.href).searchParams.get("auto") === "large") setActive("large");
    setReady(true);
  });
  return <main class="loupe-chart-benchmark-page" data-chart-benchmark-ready={ready() ? "true" : "false"}>
    <h1>Chart benchmark</h1>
    <div class="loupe-chart-benchmark-controls">
      <button type="button" data-chart-benchmark-large onClick={() => setActive("large")}>Mount 100k-point chart</button>
      <button type="button" data-chart-benchmark-streaming onClick={() => setActive("streaming")}>Mount streaming chart</button>
      <button type="button" data-chart-benchmark-sparkline onClick={() => setActive("sparkline")}>Mount Sparkline</button>
      <button type="button" data-chart-benchmark-theme-fixture onClick={() => setActive("theme")}>Mount twenty charts</button>
    </div>
    <Show when={active() === "large"}><section class="loupe-chart-benchmark-fixture">
      <TimeSeries label="100k point benchmark" summary="Four deterministic series across one hundred thousand samples." xLabel="Time"
        series={series} data={largeData} x={{ type: "time", tz: "UTC" }} height={360} table={{ pageSize: 10 }} />
    </section></Show>
    <Show when={active() === "streaming"}><StreamingBenchmark /></Show>
    <Show when={active() === "sparkline"}><section class="loupe-chart-benchmark-fixture" data-chart-benchmark-sparkline-mounted="true">
      <Sparkline values={sparklineValues} label="Deterministic Sparkline benchmark" width={320} height={64} />
    </section></Show>
    <Show when={active() === "theme"}><ThemeScope theme="graphite" mode="dark" accent="jade" controllable class="loupe-chart-benchmark-theme-scope"><ThemeBenchmark /></ThemeScope></Show>
  </main>;
}
