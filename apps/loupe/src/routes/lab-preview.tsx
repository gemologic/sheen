import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { Badge, Card, Grid, Heading, Input, Row, ThemeScope, Text, useNumberFormatter } from "@gemologic/sheen";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { parseLabState, readLabStateMessage } from "../lab-state.ts";
import type { LabState } from "../lab-state.ts";

function SimulationFilters() {
  return <svg class="loupe-simulation-filters" aria-hidden="true" width="0" height="0">
    <defs>
      <filter id="loupe-protanopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="0.152286 1.052583 -0.204868 0 0 0.114503 0.786281 0.099216 0 0 -0.003882 -0.048116 1.051998 0 0 0 0 0 1 0" /></filter>
      <filter id="loupe-deuteranopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.01182 0.04294 0.968881 0 0 0 0 0 1 0" /></filter>
      <filter id="loupe-tritanopia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="1.255528 -0.076749 -0.178779 0 0 -0.078411 0.930809 0.147602 0 0 0.004733 0.691367 0.3039 0 0 0 0 0 1 0" /></filter>
      <filter id="loupe-achromatopsia" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0" /></filter>
    </defs>
  </svg>;
}

interface FrameReport {
  readonly fps: number;
  readonly p99: number;
  readonly longTasks: number;
}

function percentile99(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.99) - 1)] ?? 0;
}

function PerformanceMeter() {
  const [report, setReport] = createSignal<FrameReport>({ fps: 0, p99: 0, longTasks: 0 });
  onMount(() => {
    let frame: number | undefined;
    let started = performance.now();
    let previous = started;
    let intervals: number[] = [];
    let frames = 0;
    let longTasks = 0;
    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      observer = new PerformanceObserver(entries => { longTasks += entries.getEntries().length; });
      try { observer.observe({ type: "longtask", buffered: true }); }
      catch { observer.disconnect(); observer = undefined; }
    }
    const measure = (now: number): void => {
      intervals.push(now - previous);
      previous = now;
      frames += 1;
      const elapsed = now - started;
      if (elapsed >= 1000) {
        setReport({ fps: Math.round(frames * 1000 / elapsed), p99: percentile99(intervals), longTasks });
        started = now;
        intervals = [];
        frames = 0;
        longTasks = 0;
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    onCleanup(() => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer?.disconnect();
    });
  });
  return <output class="loupe-performance-meter" aria-label="Preview performance meter" aria-live="off"
    data-fps={report().fps} data-p99-frame={report().p99.toFixed(1)} data-long-tasks={report().longTasks}>
    {report().fps} fps · p99 {report().p99.toFixed(1)}ms · {report().longTasks} long tasks
  </output>;
}

function PreviewContent(props: { readonly state: LabState }) {
  const number = useNumberFormatter({ style: "currency", currency: "USD" });
  return <section class="loupe-lab-preview" data-lab-preview
    data-loupe-baseline-grid={props.state.baselineGrid || undefined}
    data-loupe-spacing-outlines={props.state.spacingOutlines || undefined}
    data-loupe-focus-rings={props.state.focusRings || undefined}
    data-loupe-force-state={props.state.forceState}
    data-loupe-color-vision={props.state.colorVision}
    style={`--loupe-vision-blur:${props.state.visionBlur}px`}>
    <SimulationFilters />
    <Show when={props.state.performanceMeter}><PerformanceMeter /></Show>
    <div><Heading level={1}>Full layout preview</Heading><Text tone="muted">Theme, accent, density, radius, motion, direction, and locale update without replacing this content.</Text></div>
    <Row gap="md" wrap><Input label="Retained draft" placeholder="Type before changing an axis" /><Text><strong>Locale sample:</strong> <output aria-label="Locale sample">{number().format(123456.78)}</output></Text></Row>
    <Grid columns={3} gap="md">
      <Card><Heading level={2} size="h3">Primary surface</Heading><Text tone="muted">Structural borders stay quiet.</Text></Card>
      <Card><Heading level={2} size="h3">Control surface</Heading><Input label="Named control" value="Hydration-safe" readOnly /></Card>
      <Card><Heading level={2} size="h3">Status surface</Heading><Badge tone="success">Accepted data remains visible</Badge></Card>
    </Grid>
  </section>;
}

export default function LaboratoryPreview() {
  const router = useSolidRouterAdapter();
  const [state, setState] = createSignal(parseLabState(router.location().search));
  onMount(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const next = readLabStateMessage(event.data);
      if (next) setState(next);
    };
    window.addEventListener("message", receive);
    onCleanup(() => window.removeEventListener("message", receive));
  });
  return <ThemeScope theme={state().theme} mode={state().mode} accent={state().accent} density={state().density} radius={state().radius}
    motion={state().motion} direction={state().direction} locale={state().locale} class="loupe-lab-preview-scope"><PreviewContent state={state()} /></ThemeScope>;
}
