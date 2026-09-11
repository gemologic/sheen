import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Button, ThemeScope } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import { useStreamingSeries } from "@gemologic/sheen-charts/streaming";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";

const base = Date.UTC(2026, 8, 9, 12, 0, 0);
const series = defineSeries([
  { key: "primary", label: "Primary", color: "chart-1" },
  { key: "secondary", label: "Secondary", color: "chart-3" },
]);
const initial = {
  t: new Float64Array([base, base + 1_000, base + 2_000, base + 3_000]),
  primary: new Float64Array([10, 12, 11, 14]),
  secondary: new Float64Array([7, 8, Number.NaN, 9]),
};

function StreamingFixture(props: { readonly onPublished: () => void; readonly onUnmount: () => void }) {
  const stream = useStreamingSeries({ capacity: 8, interval: 16, series, initial });
  const [producer, setProducer] = createSignal<"idle" | "running">("idle");
  let nextTimestamp = base + 4_000;
  let producerTimer: number | undefined;

  createEffect(() => {
    stream.data();
    props.onPublished();
  });

  const appendOne = () => {
    const offset = Math.round((nextTimestamp - base) / 1_000);
    stream.append(nextTimestamp, new Float64Array([10 + offset, 7 + offset / 2]));
    nextTimestamp += 1_000;
  };

  const stopProducer = () => {
    if (producerTimer !== undefined) window.clearInterval(producerTimer);
    producerTimer = undefined;
    setProducer("idle");
  };

  const startProducer = () => {
    if (producerTimer !== undefined) return;
    let remaining = 60;
    setProducer("running");
    producerTimer = window.setInterval(() => {
      appendOne();
      remaining -= 1;
      if (remaining === 0) stopProducer();
    }, 16);
  };

  onCleanup(() => {
    if (producerTimer !== undefined) window.clearInterval(producerTimer);
  });

  return <ThemeScope theme="graphite" class="loupe-streaming-scope">
    <div class="actions">
      <Button onClick={appendOne}>Append sample</Button>
      <Button onClick={() => { for (let index = 0; index < 12; index++) appendOne(); }}>Append burst</Button>
      <Button onClick={() => stream.append(nextTimestamp - 1_000, new Float64Array([1, 1]))}>Append duplicate</Button>
      <Button disabled={producer() === "running"} onClick={startProducer}>Stream 60 samples</Button>
      <Button onClick={() => { appendOne(); props.onUnmount(); }}>Append then unmount</Button>
    </div>
    <div class="loupe-streaming-counters" role="status" aria-live="polite">
      <span>Published: {stream.size()}</span><span>Dropped: {stream.dropped()}</span><span>Rejected: {stream.rejected()}</span><span>Producer: {producer()}</span>
    </div>
    <TimeSeries label="Live request rate" summary="The newest eight accepted samples are retained; missing values remain gaps." xLabel="Time"
      series={series} data={stream.data()} x={{ type: "time", tz: "UTC" }} height={240} loading={producer() === "running"} table={{ pageSize: 8 }} />
  </ThemeScope>;
}

export default function ChartStreamingFixture() {
  const [mounted, setMounted] = createSignal(true);
  const [publications, setPublications] = createSignal(0);
  return <main class="loupe-streaming-page">
    <h1>Streaming chart lifecycle</h1>
    <Button onClick={() => setMounted(value => !value)}>Toggle streaming owner</Button>
    <output aria-label="Publication count">{publications()}</output>
    <Show when={mounted()}><StreamingFixture onPublished={() => setPublications(value => value + 1)} onUnmount={() => setMounted(false)} /></Show>
  </main>;
}
