import { createSignal, onCleanup, onMount } from "solid-js";
import { defineSeries } from "@gemologic/sheen-charts/core";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import "@gemologic/sheen-charts/styles.css";

const base = Date.UTC(2026, 8, 9, 12, 0, 0);
const series = defineSeries([{ key: "primary", label: "Primary", color: "chart-1" }]);
const snapshot = (frame: number) => ({
  t: new Float64Array([0, 1, 2, 3].map(index => base + (frame + index) * 1_000)),
  primary: new Float64Array([10, 12, 11, 14].map(value => value + frame)),
});

// Publishes a new snapshot on every animation frame from hydration onward, before the renderer upgrades.
export default function ChartStreamingFrameFixture() {
  const [frames, setFrames] = createSignal(0);
  let frame: number | undefined;
  onMount(() => {
    const tick = () => {
      setFrames(count => count + 1);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
  });
  onCleanup(() => { if (frame !== undefined) window.cancelAnimationFrame(frame); });
  return <main class="loupe-streaming-page">
    <h1>Per-frame chart publication</h1>
    <output aria-label="Frame publications">{frames()}</output>
    <TimeSeries label="Per-frame request rate" summary="A new snapshot is published on every animation frame." xLabel="Time"
      series={series} data={snapshot(frames())} x={{ type: "time", tz: "UTC" }} height={240} />
  </main>;
}
