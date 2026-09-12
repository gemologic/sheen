import { Index, Show, createEffect, createMemo, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { scaleLinear } from "d3-scale";
import { area, curveLinear, curveStepAfter, line } from "d3-shape";
import { ChartDataTable } from "./ChartDataTable.tsx";
import { createChartAxisFormatter, createChartTableFormatters } from "./format.ts";
import { defineSeries, resolveChartSeriesEncoding, validateColumnar } from "./chart-types.ts";
import type { AreaChartProps, ChartAnnotation, ChartColorToken, ChartCommonProps, ChartData, ChartSeries, ChartSeriesEncoding, LineChartProps } from "./chart-types.ts";
import { createResponsiveSvgWidth } from "./responsive-svg.ts";
import { ChartLegend, createSeriesVisibility } from "./ChartLegend.tsx";
import { resolveChartMessages } from "./messages.ts";

const margin = Object.freeze({ top: 12, right: 16, bottom: 44, left: 52 });
const maximumMarks = 2_000;

interface ChartPoint {
  readonly domain: number;
  readonly value: number;
  readonly lower: number;
  readonly upper: number;
  readonly defined: boolean;
}

interface SeriesPath {
  readonly key: string;
  readonly label: string;
  readonly color: ChartColorToken;
  readonly encoding: ChartSeriesEncoding;
  readonly index: number;
  readonly line: string;
  readonly area?: string;
  readonly visible: boolean;
}

interface Tick {
  readonly value: number;
  readonly position: number;
  readonly label: string;
}

interface AnnotationMark extends ChartAnnotation {
  readonly position: number;
}

interface ContinuousModel {
  readonly data: ChartData;
  readonly definitions: readonly ChartSeries[];
  readonly paths: readonly SeriesPath[];
  readonly xTicks: readonly Tick[];
  readonly yTicks: readonly Tick[];
  readonly annotations: readonly AnnotationMark[];
  readonly xPositions: readonly number[];
  readonly height: number;
  readonly plotBottom: number;
  readonly plotRight: number;
}

function nearestIndex(values: Float64Array, target: number): number {
  if (values.length === 0) return -1;
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((values[middle] ?? target) < target) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return 0;
  if (low >= values.length) return values.length - 1;
  const before = values[low - 1] ?? target;
  const after = values[low] ?? target;
  return target - before <= after - target ? low - 1 : low;
}

function requiredText(value: string, component: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${component} ${name} must be nonempty`);
  return value;
}

function chartHeight(value: number, component: string): number {
  if (!Number.isFinite(value) || value < 120) throw new Error(`${component} height must be a finite number of at least 120`);
  return value;
}

function annotationMarks(annotations: readonly ChartAnnotation[] | undefined, x: (value: number) => number): readonly AnnotationMark[] {
  if (annotations === undefined) return Object.freeze([]);
  if (!Array.isArray(annotations)) throw new Error("Chart annotations must be an array");
  return Object.freeze(annotations.map((annotation, index) => {
    if (!Number.isFinite(annotation.x)) throw new Error(`Chart annotation ${index} x must be finite`);
    if (typeof annotation.label !== "string" || !annotation.label.trim()) throw new Error(`Chart annotation ${index} label must be nonempty`);
    return Object.freeze({ ...annotation, position: x(annotation.x) });
  }));
}

function normalizedDomain(minimum: number, maximum: number, zero: boolean): readonly [number, number] {
  let min = minimum;
  let max = maximum;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (zero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    const padding = Math.abs(min) * 0.1 || 1;
    min -= padding;
    max += padding;
  }
  return [min, max];
}

function valueExtent(data: ChartData, definitions: readonly ChartSeries[], visible: readonly boolean[]): readonly [number, number] {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let seriesIndex = 0; seriesIndex < definitions.length; seriesIndex++) {
    const definition = definitions[seriesIndex];
    if (definition === undefined || !visible[seriesIndex]) continue;
    const column = data[definition.key];
    if (!column) continue;
    for (let index = 0; index < column.length; index++) {
      const value = column[index];
      if (value === undefined || Number.isNaN(value)) continue;
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }
  return [minimum, maximum];
}

function stackedPoints(data: ChartData, definitions: readonly ChartSeries[], visible: readonly boolean[]): readonly (readonly ChartPoint[])[] {
  const points = definitions.map((): ChartPoint[] => []);
  for (let dataIndex = 0; dataIndex < data.t.length; dataIndex++) {
    let positive = 0;
    let negative = 0;
    for (let seriesIndex = 0; seriesIndex < definitions.length; seriesIndex++) {
      const definition = definitions[seriesIndex];
      const column = definition ? data[definition.key] : undefined;
      const value = column?.[dataIndex] ?? Number.NaN;
      const target = points[seriesIndex];
      if (!target) continue;
      if (!visible[seriesIndex]) {
        target.push({ domain: data.t[dataIndex] ?? 0, value, lower: 0, upper: 0, defined: false });
        continue;
      }
      if (Number.isNaN(value)) {
        target.push({ domain: data.t[dataIndex] ?? 0, value, lower: 0, upper: 0, defined: false });
      } else if (value >= 0) {
        const lower = positive;
        positive += value;
        target.push({ domain: data.t[dataIndex] ?? 0, value, lower, upper: positive, defined: true });
      } else {
        const upper = negative;
        negative += value;
        target.push({ domain: data.t[dataIndex] ?? 0, value, lower: negative, upper, defined: true });
      }
    }
  }
  return points;
}

function ordinaryPoints(data: ChartData, definitions: readonly ChartSeries[]): readonly (readonly ChartPoint[])[] {
  return definitions.map(definition => {
    const column = data[definition.key];
    if (!column) return Object.freeze([]);
    return Object.freeze(Array.from(column, (value, index) => ({
      domain: data.t[index] ?? 0,
      value,
      lower: 0,
      upper: value,
      defined: !Number.isNaN(value),
    })));
  });
}

function pointsExtent(points: readonly (readonly ChartPoint[])[]): readonly [number, number] {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const series of points) for (const point of series) if (point.defined) {
    minimum = Math.min(minimum, point.lower, point.upper);
    maximum = Math.max(maximum, point.lower, point.upper);
  }
  return [minimum, maximum];
}

function model(props: ChartCommonProps, kind: "line" | "area", curve: "linear" | "step", stacked: boolean, locale: string, chartWidth: number, visible: readonly boolean[]): ContinuousModel {
  const component = kind === "line" ? "LineChart" : "AreaChart";
  requiredText(props.label, component, "label");
  requiredText(props.summary, component, "summary");
  requiredText(props.xLabel, component, "xLabel");
  const height = chartHeight(props.height, component);
  const definitions = defineSeries(props.series);
  const data = validateColumnar(props.data, definitions);
  if (data.t.length * definitions.length > maximumMarks) throw new Error(`${component} supports at most ${maximumMarks} SVG marks; use TimeSeries for larger data`);
  const plotBottom = height - margin.bottom;
  const plotRight = chartWidth - margin.right;
  const first = data.t[0] ?? 0;
  const last = data.t[data.t.length - 1] ?? 1;
  const domain = first === last ? [first - 0.5, last + 0.5] : [first, last];
  const xScale = scaleLinear().domain(domain).range([margin.left, plotRight]);
  const allPoints = kind === "area" && stacked ? stackedPoints(data, definitions, visible) : ordinaryPoints(data, definitions);
  const extent = kind === "area" && stacked ? pointsExtent(allPoints) : valueExtent(data, definitions, visible);
  const yDomain = normalizedDomain(extent[0], extent[1], props.y?.zero ?? false);
  const yScale = scaleLinear().domain(yDomain).nice(4).range([plotBottom, margin.top]);
  const curveFactory = curve === "step" ? curveStepAfter : curveLinear;
  const paths = definitions.map((definition, index): SeriesPath => {
    const points = allPoints[index];
    const encoding = resolveChartSeriesEncoding(definition, index);
    if (!points) return Object.freeze({ key: definition.key, label: definition.label, color: definition.color, encoding, index, line: "", visible: false });
    const makeLine = line<ChartPoint>().defined(point => point.defined).x(point => xScale(point.domain)).y(point => yScale(point.upper)).curve(curveFactory);
    const linePath = makeLine(points);
    if (kind === "line") return Object.freeze({ key: definition.key, label: definition.label, color: definition.color, encoding, index, line: linePath ?? "", visible: visible[index] ?? false });
    const baseline = yScale(yScale.domain()[0] ?? 0);
    const makeArea = area<ChartPoint>().defined(point => point.defined).x(point => xScale(point.domain))
      .y0(point => stacked ? yScale(point.lower) : baseline).y1(point => yScale(point.upper)).curve(curveFactory);
    const areaPath = makeArea(points);
    return Object.freeze({ key: definition.key, label: definition.label, color: definition.color, encoding, index, line: linePath ?? "", visible: visible[index] ?? false, ...(typeof areaPath === "string" ? { area: areaPath } : {}) });
  });
  const formatX = createChartAxisFormatter(locale, props.x);
  const formatValue = createChartTableFormatters(locale, props.x, props.y).value;
  const xValues = xScale.ticks(6);
  const increment = Math.abs((xValues[1] ?? last) - (xValues[0] ?? first)) || 1;
  const xTicks = Object.freeze(xValues.map(value => Object.freeze({ value, position: xScale(value), label: formatX(value, increment) })));
  const yTicks = Object.freeze(yScale.ticks(4).map(value => Object.freeze({ value, position: yScale(value), label: formatValue(value) })));
  const xPositions = Object.freeze(Array.from(data.t, value => xScale(value)));
  return Object.freeze({ data, definitions, paths: Object.freeze(paths), xTicks, yTicks, annotations: annotationMarks(props.annotations, xScale), xPositions, height, plotBottom, plotRight });
}

function ContinuousChart(props: LineChartProps | AreaChartProps, kind: "line" | "area"): JSX.Element {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const clipId = createUniqueId();
  const summaryId = createUniqueId();
  const instructionId = createUniqueId();
  const viewport = createResponsiveSvgWidth();
  const definitions = createMemo(() => defineSeries(props.series));
  const visibility = createSeriesVisibility(definitions);
  const resolved = createMemo(() => model(props, kind, props.curve ?? "linear", kind === "area" && "stacked" in props ? props.stacked ?? false : false, locale(), viewport.width(), visibility.values()));
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const formatters = createMemo(() => createChartTableFormatters(locale(), props.x, props.y));
  const tooltipRows = new Map<string, HTMLLIElement>();
  const tooltipValues = new Map<string, HTMLSpanElement>();
  let tooltip: HTMLDivElement | undefined;
  let tooltipDomain: HTMLDivElement | undefined;
  let crosshair: SVGLineElement | undefined;
  let keyboardStatus: HTMLDivElement | undefined;
  let inspectedIndex = -1;

  function hideInspection(): void {
    inspectedIndex = -1;
    if (tooltip) {
      tooltip.hidden = true;
      tooltip.dataset.index = "";
    }
    crosshair?.setAttribute("data-active", "false");
  }

  function inspect(index: number, announce: boolean): void {
    const current = resolved();
    const timestamp = current.data.t[index];
    const position = current.xPositions[index];
    if (props.tooltip === false || timestamp === undefined || position === undefined) {
      hideInspection();
      return;
    }
    inspectedIndex = index;
    const formattedDomain = formatters().x(timestamp);
    if (tooltipDomain) tooltipDomain.textContent = formattedDomain;
    const status = [formattedDomain];
    const visible = visibility.values();
    for (let seriesIndex = 0; seriesIndex < current.definitions.length; seriesIndex++) {
      const definition = current.definitions[seriesIndex];
      if (definition === undefined) continue;
      const value = current.data[definition.key]?.[index];
      const missing = value === undefined || Number.isNaN(value);
      const formatted = missing ? "—" : formatters().value(value);
      const row = tooltipRows.get(definition.key);
      if (row) row.hidden = !(visible[seriesIndex] ?? false);
      const valueElement = tooltipValues.get(definition.key);
      if (valueElement) valueElement.textContent = formatted;
      if (visible[seriesIndex]) status.push(`${definition.label}: ${missing ? messages().missingValue : formatted}`);
    }
    if (crosshair) {
      crosshair.setAttribute("data-active", "true");
      crosshair.setAttribute("x1", String(position));
      crosshair.setAttribute("x2", String(position));
      crosshair.setAttribute("y1", String(margin.top));
      crosshair.setAttribute("y2", String(current.plotBottom));
    }
    if (tooltip) {
      tooltip.hidden = false;
      tooltip.dataset.index = String(index);
      tooltip.dataset.side = position > viewport.width() / 2 ? "start" : "end";
      tooltip.style.setProperty("--sheen-chart-tooltip-x", `${position}px`);
      const updates = Number.parseInt(tooltip.dataset.updates ?? "0", 10);
      tooltip.dataset.updates = String(Number.isFinite(updates) ? updates + 1 : 1);
    }
    if (announce && keyboardStatus) keyboardStatus.textContent = status.join(", ");
  }

  function handlePointerMove(event: PointerEvent & { readonly currentTarget: SVGSVGElement }): void {
    const current = resolved();
    const first = current.data.t[0];
    const last = current.data.t[current.data.t.length - 1];
    if (first === undefined || last === undefined) return;
    const box = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - box.left) / box.width) * viewport.width();
    const ratio = Math.max(0, Math.min(1, (chartX - margin.left) / Math.max(1, current.plotRight - margin.left)));
    inspect(nearestIndex(current.data.t, first + (last - first) * ratio), false);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const length = resolved().data.t.length;
    if (event.key === "Escape") {
      event.preventDefault();
      hideInspection();
      if (keyboardStatus) keyboardStatus.textContent = "";
      return;
    }
    let next: number | undefined;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = length - 1;
    else if (event.key === "ArrowRight") next = inspectedIndex < 0 ? 0 : Math.min(length - 1, inspectedIndex + 1);
    else if (event.key === "ArrowLeft") next = inspectedIndex < 0 ? length - 1 : Math.max(0, inspectedIndex - 1);
    if (next === undefined || next < 0) return;
    event.preventDefault();
    inspect(next, true);
  }

  createEffect(() => {
    const current = resolved();
    if (inspectedIndex >= current.data.t.length) hideInspection();
    else if (inspectedIndex >= 0) inspect(inspectedIndex, false);
  });

  return <figure class={cn("sheen-svg-chart", `sheen-${kind}-chart`, props.class)} aria-busy={props.loading || undefined}>
    <figcaption class="sheen-chart-caption"><span class="sheen-chart-title">{props.label}</span><span id={summaryId} class="sheen-chart-summary">{props.summary}</span></figcaption>
    <div class="sheen-svg-chart-plot" style={{ height: `${resolved().height}px` }}>
      <svg ref={viewport.ref} viewBox={`0 0 ${viewport.width()} ${resolved().height}`} role="img" aria-label={props.label} aria-describedby={`${summaryId} ${instructionId}`}
        aria-keyshortcuts={props.tooltip === false ? undefined : "ArrowLeft ArrowRight Home End Escape"} tabIndex={props.tooltip === false ? undefined : 0}
        onPointerMove={handlePointerMove} onPointerLeave={hideInspection} onKeyDown={handleKeyDown} preserveAspectRatio="xMidYMid meet">
        <defs><clipPath id={clipId}><rect x={margin.left} y={margin.top} width={resolved().plotRight - margin.left} height={resolved().plotBottom - margin.top} /></clipPath></defs>
        <g class="sheen-chart-grid" aria-hidden="true"><Index each={resolved().yTicks}>{tick => <line x1={margin.left} x2={resolved().plotRight} y1={tick().position} y2={tick().position} />}</Index></g>
        <g class="sheen-chart-axis sheen-chart-axis-y" aria-hidden="true"><Index each={resolved().yTicks}>{tick => <text x={margin.left - 8} y={tick().position}>{tick().label}</text>}</Index></g>
        <g class="sheen-chart-axis sheen-chart-axis-x" aria-hidden="true"><Index each={resolved().xTicks}>{tick => <text x={tick().position} y={resolved().plotBottom + 18}>{tick().label}</text>}</Index><text class="sheen-chart-axis-label" x={(margin.left + resolved().plotRight) / 2} y={resolved().height - 12}>{props.xLabel}</text></g>
        <g clip-path={`url(#${clipId})`}><Index each={resolved().paths}>{path => <g data-series={path().key} data-hidden={!path().visible || undefined}>
          <Show when={path().area}>{areaPath => <path class="sheen-chart-series-area" data-color={path().color} data-encoding={path().encoding} data-series-index={path().index} d={areaPath()} />}</Show>
          <path class="sheen-chart-series-line" data-color={path().color} data-encoding={path().encoding} data-series-index={path().index} d={path().line}><title>{path().label}</title></path>
        </g>}</Index></g>
        <g class="sheen-chart-annotations" aria-hidden="true"><Index each={resolved().annotations}>{annotation => <g class="sheen-chart-annotation" data-tone={annotation().tone ?? "neutral"}><line x1={annotation().position} x2={annotation().position} y1={margin.top} y2={resolved().plotBottom} /><text x={annotation().position + 4} y={margin.top + 12}>{annotation().label}</text></g>}</Index></g>
        <g class="sheen-chart-inspection" aria-hidden="true"><line ref={crosshair} class="sheen-chart-inspection-crosshair" data-active="false" /></g>
      </svg>
      <div ref={tooltip} class="sheen-chart-tooltip" hidden aria-hidden="true">
        <div ref={tooltipDomain} class="sheen-chart-tooltip-domain" />
        <ul><Index each={definitions()}>{(series, index) => <li ref={element => { tooltipRows.set(series().key, element); }}>
          <span class="sheen-chart-legend-marker" data-color={series().color} data-encoding={resolveChartSeriesEncoding(series(), index)} aria-hidden="true" /><span>{series().label}</span>
          <span ref={element => { tooltipValues.set(series().key, element); }} class="sheen-chart-tooltip-value" />
        </li>}</Index></ul>
      </div>
      <div ref={keyboardStatus} class="sheen-chart-visually-hidden" aria-live="polite" />
      <span id={instructionId} class="sheen-chart-visually-hidden">{messages().keyboardInstructions}</span>
      <Show when={resolved().data.t.length === 0}><div class="sheen-chart-empty">{props.empty ?? theme.messages().empty}</div></Show>
    </div>
    <ChartLegend series={resolved().definitions} layout={props.legend} visible={visibility.values()} onToggle={visibility.toggle} />
    <ChartDataTable label={props.label} summary={props.summary} xLabel={props.xLabel} series={resolved().definitions} data={resolved().data} x={props.x}
      {...(props.y === undefined ? {} : { y: props.y })}
      {...(props.table?.pageSize === undefined ? {} : { pageSize: props.table.pageSize })}
      {...(props.table?.viewLabel === undefined ? {} : { viewLabel: props.table.viewLabel })}
      {...(props.loading === undefined ? {} : { loading: props.loading })} />
  </figure>;
}

export function LineChart(props: LineChartProps): JSX.Element {
  return ContinuousChart(props, "line");
}

export function AreaChart(props: AreaChartProps): JSX.Element {
  return ContinuousChart(props, "area");
}
