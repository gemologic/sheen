import { Index, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { useTheme } from "@gemologic/sheen";
import { resolveChartSeriesEncoding } from "./chart-types.ts";
import type { ChartLegend as ChartLegendLayout, ChartSeries } from "./chart-types.ts";
import { formatChartMessage, resolveChartMessages } from "./messages.ts";

export interface SeriesVisibility {
  readonly values: Accessor<readonly boolean[]>;
  readonly toggle: (index: number) => void;
}

export function createSeriesVisibility(series: Accessor<readonly ChartSeries[]>): SeriesVisibility {
  let source = series();
  const [values, setValues] = createSignal<readonly boolean[]>(Object.freeze(source.map(definition => !definition.hidden)));
  createEffect(() => {
    const next = series();
    if (next === source) return;
    source = next;
    setValues(Object.freeze(next.map(definition => !definition.hidden)));
  });
  return Object.freeze({
    values,
    toggle: (index: number) => setValues(current => Object.freeze(current.map((value, currentIndex) => currentIndex === index ? !value : value))),
  });
}

export type ChartMarkerShape = "circle" | "square" | "triangle" | "diamond";
const markerShapes: readonly ChartMarkerShape[] = Object.freeze(["circle", "square", "triangle", "diamond"]);

/** Non-color point-shape encoding for a series position. */
export function chartMarkerShape(index: number): ChartMarkerShape {
  return markerShapes[index % markerShapes.length] ?? "circle";
}

export function ChartLegend(props: {
  readonly series: readonly ChartSeries[];
  readonly layout: ChartLegendLayout | undefined;
  /** Line encodings for strokes and bars, point shapes for scatter series, or plain swatches for parts of a whole. */
  readonly marker?: "line" | "shape" | "swatch";
  readonly visible: readonly boolean[];
  readonly onToggle: (index: number) => void;
}): JSX.Element {
  const theme = useTheme();
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  return <Show when={props.layout !== false}><ul class="sheen-chart-legend" data-layout={props.layout ?? "inline"}>
    <Index each={props.series}>{(series, index) => {
      const shown = () => props.visible[index] ?? false;
      return <li data-hidden={!shown() || undefined}><button type="button" class="sheen-chart-legend-toggle" aria-pressed={shown()}
        aria-label={formatChartMessage(shown() ? messages().hideSeries : messages().showSeries, { series: series().label })} onClick={() => props.onToggle(index)}>
        <span class="sheen-chart-legend-marker" data-color={series().color} data-series-index={index} aria-hidden="true"
          data-encoding={(props.marker ?? "line") === "line" ? resolveChartSeriesEncoding(series(), index) : undefined}
          data-shape={props.marker === "shape" ? chartMarkerShape(index) : props.marker === "swatch" ? "square" : undefined} />
        <span>{series().label}</span>
      </button></li>;
    }}</Index>
  </ul></Show>;
}
