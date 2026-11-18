import { Index, Show, createMemo, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { arc } from "d3-shape";
import type { GaugeProps, GaugeThreshold, GaugeTone } from "./chart-types.ts";
import { chartColorTokens } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";
import { resolveChartMessages } from "./messages.ts";

const sweep = (Math.PI * 4) / 3;
const start = -sweep / 2;
const center = Object.freeze({ x: 100, y: 100 });
const outer = 88;
const thickness = 14;
const tones: ReadonlySet<string> = new Set<GaugeTone>(["success", "warning", "danger"]);
const colorSet: ReadonlySet<string> = new Set(chartColorTokens);

interface GaugeBand {
  readonly path: string;
  readonly tone: GaugeTone | undefined;
}

interface GaugeModel {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly clamped: number;
  readonly active: GaugeThreshold | undefined;
  readonly valuePath: string;
  readonly bands: readonly GaugeBand[];
  readonly ticks: readonly { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }[];
}

const shape = arc<{ readonly startAngle: number; readonly endAngle: number }>().innerRadius(outer - thickness).outerRadius(outer).cornerRadius(2);

function path(from: number, to: number): string {
  return to > from ? shape({ startAngle: from, endAngle: to }) ?? "" : "";
}

function validateThresholds(thresholds: readonly GaugeThreshold[], min: number, max: number): readonly GaugeThreshold[] {
  if (!Array.isArray(thresholds)) throw new Error("Gauge thresholds must be an array");
  thresholds.forEach((threshold, index) => {
    if (!Number.isFinite(threshold.value) || threshold.value < min || threshold.value > max) throw new Error(`Gauge threshold ${index} must be finite and within range`);
    if (index > 0 && threshold.value <= (thresholds[index - 1]?.value ?? threshold.value)) throw new Error("Gauge thresholds must be strictly ascending");
    if (!tones.has(threshold.tone)) throw new Error(`Gauge threshold ${index} has an unsupported tone`);
    if (typeof threshold.label !== "string" || !threshold.label.trim()) throw new Error(`Gauge threshold ${index} requires a nonempty label`);
  });
  return thresholds;
}

function model(props: GaugeProps): GaugeModel {
  if (typeof props.label !== "string" || !props.label.trim()) throw new Error("Gauge label must be nonempty");
  const min = props.min;
  const max = props.max;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) throw new Error("Gauge range must be two ascending finite numbers");
  const value = props.value;
  if (typeof value !== "number" || (!Number.isFinite(value) && !Number.isNaN(value))) throw new Error("Gauge value must be finite or NaN");
  if (props.color !== undefined && !colorSet.has(props.color)) throw new Error("Gauge color must be a chart color token");
  const thresholds = validateThresholds(props.thresholds ?? [], min, max);
  const descending = props.thresholdDirection === "descending";
  const clamped = Number.isNaN(value) ? min : Math.min(max, Math.max(min, value));
  const angle = (input: number) => start + ((input - min) / (max - min)) * sweep;
  let active: GaugeThreshold | undefined;
  if (!Number.isNaN(value)) for (const threshold of descending ? [...thresholds].reverse() : thresholds) {
    if (descending ? value <= threshold.value : value >= threshold.value) active = threshold;
  }
  const edges = [min, ...thresholds.map(threshold => threshold.value), max];
  const bands = edges.slice(0, -1).map((edge, index): GaugeBand => {
    const tone = descending ? thresholds[index]?.tone : thresholds[index - 1]?.tone;
    return Object.freeze({ path: path(angle(edge), angle(edges[index + 1] ?? max)), tone });
  });
  const ticks = thresholds.map(threshold => {
    const radians = angle(threshold.value);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    return Object.freeze({ x1: center.x + sin * (outer - thickness - 4), y1: center.y - cos * (outer - thickness - 4), x2: center.x + sin * (outer + 4), y2: center.y - cos * (outer + 4) });
  });
  return Object.freeze({ value, min, max, clamped, active, valuePath: Number.isNaN(value) ? "" : path(start, angle(clamped)), bands: Object.freeze(bands), ticks: Object.freeze(ticks) });
}

export function Gauge(props: GaugeProps): JSX.Element {
  const theme = useTheme();
  const labelId = createUniqueId();
  const summaryId = createUniqueId();
  const resolved = createMemo(() => model(props));
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const format = createMemo(() => createChartTableFormatters(theme.state().locale, { type: "number" }, props.format === undefined ? undefined : { format: props.format }).value);
  const size = createMemo(() => {
    const value = props.size ?? 200;
    if (!Number.isFinite(value) || value < 96) throw new Error("Gauge size must be a finite number of at least 96");
    return value;
  });
  const missing = () => Number.isNaN(resolved().value);
  const valueText = () => {
    const text = missing() ? messages().missingValue : format()(resolved().value);
    const band = resolved().active?.label;
    return band === undefined ? text : `${text}, ${band}`;
  };
  return <figure class={cn("sheen-gauge", props.class)} style={{ "max-inline-size": `${size()}px` }}>
    <figcaption class="sheen-chart-caption"><span id={labelId} class="sheen-chart-title">{props.label}</span>
      <Show when={props.summary}>{summary => <span id={summaryId} class="sheen-chart-summary">{summary()}</span>}</Show></figcaption>
    <div class="sheen-gauge-meter" role="meter" aria-labelledby={labelId} aria-describedby={props.summary ? summaryId : undefined}
      aria-valuemin={resolved().min} aria-valuemax={resolved().max} aria-valuenow={resolved().clamped} aria-valuetext={valueText()}
      data-tone={resolved().active?.tone ?? "base"} data-missing={missing() || undefined}>
      <svg viewBox="0 0 200 150" aria-hidden="true">
        <g transform={`translate(${center.x} ${center.y})`}>
          <g class="sheen-gauge-track"><Index each={resolved().bands}>{band => <path data-tone={band().tone ?? "base"} data-color={props.color ?? "chart-1"} class="sheen-chart-mark" d={band().path} />}</Index></g>
          <path class="sheen-chart-mark sheen-gauge-fill" data-color={props.color ?? "chart-1"} data-tone={resolved().active?.tone ?? "base"} d={resolved().valuePath} />
        </g>
        <g class="sheen-gauge-ticks"><Index each={resolved().ticks}>{tick => <line x1={tick().x1} y1={tick().y1} x2={tick().x2} y2={tick().y2} />}</Index></g>
      </svg>
      <div class="sheen-gauge-readout" aria-hidden="true">
        <span class="sheen-gauge-value">{missing() ? "—" : format()(resolved().value)}</span>
        <Show when={resolved().active}>{active => <span class="sheen-gauge-band">{active().label}</span>}</Show>
      </div>
      <div class="sheen-gauge-bounds" aria-hidden="true"><span>{format()(resolved().min)}</span><span>{format()(resolved().max)}</span></div>
    </div>
  </figure>;
}
