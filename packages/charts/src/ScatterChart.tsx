import { Index, Show, createEffect, createMemo, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { scaleLinear, scaleSqrt } from "d3-scale";
import { defineSeries } from "./chart-types.ts";
import type { ChartColorToken, ChartScatterColumns, ChartSeries, ChartValueAxis, ScatterChartProps } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";
import { resolveChartMessages } from "./messages.ts";
import { createResponsiveSvgWidth } from "./responsive-svg.ts";
import { ChartLegend, chartMarkerShape, createSeriesVisibility } from "./ChartLegend.tsx";
import type { ChartMarkerShape } from "./ChartLegend.tsx";
import { ChartRecordTable } from "./ChartRecordTable.tsx";

const margin = Object.freeze({ top: 12, right: 16, bottom: 56, left: 60 });
const maximumMarks = 2_000;
const fixedRadius = 4.5;
const defaultSizeRange: readonly [number, number] = Object.freeze([3, 14]);
const hitRadius = 24;

interface ScatterPoint {
  readonly id: number;
  readonly seriesIndex: number;
  readonly row: number;
  readonly label: string;
  readonly color: ChartColorToken;
  readonly shape: ChartMarkerShape;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly px: number;
  readonly py: number;
  readonly radius: number;
  readonly path: string;
  readonly visible: boolean;
}

interface Tick {
  readonly position: number;
  readonly label: string;
}

interface ScatterModel {
  readonly definitions: readonly ChartSeries[];
  readonly points: readonly ScatterPoint[];
  readonly order: readonly number[];
  readonly xTicks: readonly Tick[];
  readonly yTicks: readonly Tick[];
  readonly height: number;
  readonly plotBottom: number;
  readonly plotRight: number;
}

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`ScatterChart ${name} must be nonempty`);
  return value;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function shapePath(shape: ChartMarkerShape, x: number, y: number, radius: number): string {
  if (shape === "square") {
    const half = radius * 0.886;
    return `M${round(x - half)} ${round(y - half)}h${round(half * 2)}v${round(half * 2)}h${round(-half * 2)}Z`;
  }
  if (shape === "triangle") {
    const height = radius * 1.35;
    return `M${round(x)} ${round(y - height)}L${round(x + height * 0.866)} ${round(y + height * 0.5)}L${round(x - height * 0.866)} ${round(y + height * 0.5)}Z`;
  }
  if (shape === "diamond") {
    const extent = radius * 1.25;
    return `M${round(x)} ${round(y - extent)}L${round(x + extent)} ${round(y)}L${round(x)} ${round(y + extent)}L${round(x - extent)} ${round(y)}Z`;
  }
  return `M${round(x - radius)} ${round(y)}a${round(radius)} ${round(radius)} 0 1 0 ${round(radius * 2)} 0a${round(radius)} ${round(radius)} 0 1 0 ${round(-radius * 2)} 0Z`;
}

function checkedColumn(column: unknown, key: string, name: string, length: number | undefined): Float64Array {
  if (!(column instanceof Float64Array)) throw new Error(`ScatterChart series ${key} ${name} must be a Float64Array`);
  if (length !== undefined && column.length !== length) throw new Error(`ScatterChart series ${key} ${name} length must equal x length ${length}`);
  for (let index = 0; index < column.length; index++) {
    const value = column[index] ?? Number.NaN;
    if (!Number.isFinite(value) && !Number.isNaN(value)) throw new Error(`ScatterChart series ${key} ${name} row ${index} must be finite or NaN`);
    if (name === "size" && value < 0) throw new Error(`ScatterChart series ${key} size row ${index} must be non-negative`);
  }
  return column;
}

function validateData(props: ScatterChartProps, definitions: readonly ChartSeries[]): readonly ChartScatterColumns[] {
  const data = props.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("ScatterChart data must be an object keyed by series");
  const expected = new Set(definitions.map(definition => definition.key));
  for (const key of Object.keys(data)) if (!expected.has(key)) throw new Error(`ScatterChart data has undeclared series ${key}`);
  let marks = 0;
  const columns = definitions.map(definition => {
    const entry = data[definition.key];
    if (typeof entry !== "object" || entry === null) throw new Error(`ScatterChart series ${definition.key} requires x and y columns`);
    const x = checkedColumn(entry.x, definition.key, "x", undefined);
    const y = checkedColumn(entry.y, definition.key, "y", x.length);
    if (entry.size !== undefined && props.size === undefined) throw new Error(`ScatterChart series ${definition.key} has a size column without the size option`);
    if (entry.size === undefined && props.size !== undefined) throw new Error(`ScatterChart series ${definition.key} requires a size column when the size option is set`);
    const size = entry.size === undefined ? undefined : checkedColumn(entry.size, definition.key, "size", x.length);
    marks += x.length;
    return Object.freeze({ x, y, ...(size === undefined ? {} : { size }) });
  });
  if (marks > maximumMarks) throw new Error(`ScatterChart supports at most ${maximumMarks} SVG marks`);
  return columns;
}

function domain(minimum: number, maximum: number, axis: ChartValueAxis | undefined): readonly [number, number] {
  let low = minimum;
  let high = maximum;
  if (!Number.isFinite(low) || !Number.isFinite(high)) return [0, 1];
  if (axis?.zero) {
    low = Math.min(0, low);
    high = Math.max(0, high);
  }
  if (low === high) {
    const padding = Math.abs(low) * 0.1 || 1;
    return [low - padding, high + padding];
  }
  return [low, high];
}

function model(props: ScatterChartProps, locale: string, chartWidth: number, visible: readonly boolean[]): ScatterModel {
  requiredText(props.label, "label");
  requiredText(props.summary, "summary");
  requiredText(props.xLabel, "xLabel");
  requiredText(props.yLabel, "yLabel");
  if (props.size !== undefined) requiredText(props.size.label, "size label");
  if (!Number.isFinite(props.height) || props.height < 160) throw new Error("ScatterChart height must be a finite number of at least 160");
  const definitions = defineSeries(props.series);
  const columns = validateData(props, definitions);
  const range = props.size?.range ?? defaultSizeRange;
  if (!Array.isArray(range) || range.length !== 2 || !range.every(value => Number.isFinite(value) && value > 0) || range[0] > range[1]) throw new Error("ScatterChart size range must be two positive ascending radii");
  let xMinimum = Number.POSITIVE_INFINITY;
  let xMaximum = Number.NEGATIVE_INFINITY;
  let yMinimum = Number.POSITIVE_INFINITY;
  let yMaximum = Number.NEGATIVE_INFINITY;
  let sizeMaximum = 0;
  columns.forEach((column, seriesIndex) => {
    if (!visible[seriesIndex]) return;
    for (let row = 0; row < column.x.length; row++) {
      const x = column.x[row] ?? Number.NaN;
      const y = column.y[row] ?? Number.NaN;
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      xMinimum = Math.min(xMinimum, x);
      xMaximum = Math.max(xMaximum, x);
      yMinimum = Math.min(yMinimum, y);
      yMaximum = Math.max(yMaximum, y);
      const size = column.size?.[row] ?? Number.NaN;
      if (!Number.isNaN(size)) sizeMaximum = Math.max(sizeMaximum, size);
    }
  });
  const plotBottom = props.height - margin.bottom;
  const plotRight = chartWidth - margin.right;
  const xScale = scaleLinear().domain(domain(xMinimum, xMaximum, props.x)).nice(6).range([margin.left, plotRight]);
  const yScale = scaleLinear().domain(domain(yMinimum, yMaximum, props.y)).nice(4).range([plotBottom, margin.top]);
  const sizeScale = scaleSqrt().domain([0, sizeMaximum || 1]).range([range[0], range[1]]);
  const points: ScatterPoint[] = [];
  columns.forEach((column, seriesIndex) => {
    const definition = definitions[seriesIndex];
    if (definition === undefined) return;
    const shape = chartMarkerShape(seriesIndex);
    for (let row = 0; row < column.x.length; row++) {
      const x = column.x[row] ?? Number.NaN;
      const y = column.y[row] ?? Number.NaN;
      const size = column.size?.[row] ?? Number.NaN;
      const defined = !Number.isNaN(x) && !Number.isNaN(y);
      const px = defined ? xScale(x) : 0;
      const py = defined ? yScale(y) : 0;
      const radius = column.size === undefined ? fixedRadius : Number.isNaN(size) ? range[0] : sizeScale(size);
      points.push(Object.freeze({
        id: points.length, seriesIndex, row, label: definition.label, color: definition.color, shape, x, y, size, px, py, radius,
        path: defined ? shapePath(shape, px, py, radius) : "", visible: defined && (visible[seriesIndex] ?? false),
      }));
    }
  });
  const order = points.filter(point => point.visible).sort((left, right) => left.x - right.x || left.y - right.y || left.id - right.id).map(point => point.id);
  const formatX = createChartTableFormatters(locale, { type: "number" }, props.x).value;
  const formatY = createChartTableFormatters(locale, { type: "number" }, props.y).value;
  const xTicks = Object.freeze(xScale.ticks(6).map(value => Object.freeze({ position: xScale(value), label: formatX(value) })));
  const yTicks = Object.freeze(yScale.ticks(4).map(value => Object.freeze({ position: yScale(value), label: formatY(value) })));
  return Object.freeze({ definitions, points: Object.freeze(points), order: Object.freeze(order), xTicks, yTicks, height: props.height, plotBottom, plotRight });
}

export function ScatterChart(props: ScatterChartProps): JSX.Element {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const clipId = createUniqueId();
  const summaryId = createUniqueId();
  const instructionId = createUniqueId();
  const viewport = createResponsiveSvgWidth();
  const definitions = createMemo(() => defineSeries(props.series));
  const visibility = createSeriesVisibility(definitions);
  const resolved = createMemo(() => model(props, locale(), viewport.width(), visibility.values()));
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const formatX = createMemo(() => createChartTableFormatters(locale(), { type: "number" }, props.x).value);
  const formatY = createMemo(() => createChartTableFormatters(locale(), { type: "number" }, props.y).value);
  const formatSize = createMemo(() => createChartTableFormatters(locale(), { type: "number" }, props.size?.format === undefined ? undefined : { format: props.size.format }).value);
  let tooltip: HTMLDivElement | undefined;
  let tooltipDomain: HTMLDivElement | undefined;
  let tooltipMarker: HTMLSpanElement | undefined;
  let tooltipX: HTMLSpanElement | undefined;
  let tooltipY: HTMLSpanElement | undefined;
  let tooltipSize: HTMLSpanElement | undefined;
  let ring: SVGCircleElement | undefined;
  let keyboardStatus: HTMLDivElement | undefined;
  let inspectedId = -1;

  function hideInspection(): void {
    inspectedId = -1;
    if (tooltip) {
      tooltip.hidden = true;
      tooltip.dataset.index = "";
    }
    ring?.setAttribute("data-active", "false");
  }

  function sizeText(point: ScatterPoint): string {
    return Number.isNaN(point.size) ? messages().missingValue : formatSize()(point.size);
  }

  function inspect(id: number, announce: boolean): void {
    const point = resolved().points[id];
    if (props.tooltip === false || point === undefined || !point.visible) {
      hideInspection();
      return;
    }
    inspectedId = id;
    const x = formatX()(point.x);
    const y = formatY()(point.y);
    if (tooltipDomain) tooltipDomain.textContent = point.label;
    if (tooltipMarker) {
      tooltipMarker.dataset.color = point.color;
      tooltipMarker.dataset.shape = point.shape;
    }
    if (tooltipX) tooltipX.textContent = x;
    if (tooltipY) tooltipY.textContent = y;
    if (tooltipSize) tooltipSize.textContent = Number.isNaN(point.size) ? "—" : formatSize()(point.size);
    if (ring) {
      ring.setAttribute("data-active", "true");
      ring.setAttribute("cx", String(point.px));
      ring.setAttribute("cy", String(point.py));
      ring.setAttribute("r", String(point.radius + 4));
    }
    if (tooltip) {
      tooltip.hidden = false;
      tooltip.dataset.index = String(id);
      tooltip.dataset.side = point.px > viewport.width() / 2 ? "start" : "end";
      tooltip.style.setProperty("--sheen-chart-tooltip-x", `${point.px}px`);
      tooltip.style.setProperty("--sheen-chart-tooltip-y", `${Math.max(0, point.py - 24)}px`);
      const updates = Number.parseInt(tooltip.dataset.updates ?? "0", 10);
      tooltip.dataset.updates = String(Number.isFinite(updates) ? updates + 1 : 1);
    }
    if (announce && keyboardStatus) {
      const parts = [point.label, `${props.xLabel}: ${x}`, `${props.yLabel}: ${y}`];
      if (props.size !== undefined) parts.push(`${props.size.label}: ${sizeText(point)}`);
      keyboardStatus.textContent = parts.join(", ");
    }
  }

  function handlePointerMove(event: PointerEvent & { readonly currentTarget: SVGSVGElement }): void {
    const current = resolved();
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * viewport.width();
    const y = ((event.clientY - box.top) / box.height) * current.height;
    let closest = -1;
    let distance = hitRadius * hitRadius;
    for (const point of current.points) {
      if (!point.visible) continue;
      const next = (point.px - x) ** 2 + (point.py - y) ** 2;
      if (next <= distance) {
        closest = point.id;
        distance = next;
      }
    }
    if (closest >= 0) inspect(closest, false);
    else hideInspection();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      hideInspection();
      if (keyboardStatus) keyboardStatus.textContent = "";
      return;
    }
    const order = resolved().order;
    const position = order.indexOf(inspectedId);
    let next: number | undefined;
    if (event.key === "Home") next = order[0];
    else if (event.key === "End") next = order[order.length - 1];
    else if (event.key === "ArrowRight") next = position < 0 ? order[0] : order[Math.min(order.length - 1, position + 1)];
    else if (event.key === "ArrowLeft") next = position < 0 ? order[order.length - 1] : order[Math.max(0, position - 1)];
    if (next === undefined) return;
    event.preventDefault();
    inspect(next, true);
  }

  createEffect(() => {
    const current = resolved();
    if (inspectedId < 0) return;
    if (current.points[inspectedId]?.visible) inspect(inspectedId, false);
    else hideInspection();
  });

  const tableColumns = createMemo(() => [{ label: props.xLabel }, { label: props.yLabel }, ...(props.size === undefined ? [] : [{ label: props.size.label }])]);

  return <figure class={cn("sheen-svg-chart", "sheen-scatter-chart", props.class)} aria-busy={props.loading || undefined}>
    <figcaption class="sheen-chart-caption"><span class="sheen-chart-title">{props.label}</span><span id={summaryId} class="sheen-chart-summary">{props.summary}</span></figcaption>
    <div class="sheen-svg-chart-plot" style={{ height: `${resolved().height}px` }}>
      <svg ref={viewport.ref} viewBox={`0 0 ${viewport.width()} ${resolved().height}`} role="img" aria-label={props.label} aria-describedby={`${summaryId} ${instructionId}`}
        aria-keyshortcuts={props.tooltip === false ? undefined : "ArrowLeft ArrowRight Home End Escape"} tabIndex={props.tooltip === false ? undefined : 0}
        onPointerMove={handlePointerMove} onPointerLeave={hideInspection} onKeyDown={handleKeyDown} preserveAspectRatio="xMidYMid meet">
        <defs><clipPath id={clipId}><rect x={margin.left} y={margin.top} width={Math.max(0, resolved().plotRight - margin.left)} height={Math.max(0, resolved().plotBottom - margin.top)} /></clipPath></defs>
        <g class="sheen-chart-grid" aria-hidden="true">
          <Index each={resolved().yTicks}>{tick => <line x1={margin.left} x2={resolved().plotRight} y1={tick().position} y2={tick().position} />}</Index>
          <Index each={resolved().xTicks}>{tick => <line x1={tick().position} x2={tick().position} y1={margin.top} y2={resolved().plotBottom} />}</Index>
        </g>
        <g class="sheen-chart-axis" aria-hidden="true">
          <Index each={resolved().yTicks}>{tick => <text class="sheen-chart-axis-y" x={margin.left - 8} y={tick().position}>{tick().label}</text>}</Index>
          <Index each={resolved().xTicks}>{tick => <text class="sheen-chart-axis-x" x={tick().position} y={resolved().plotBottom + 18}>{tick().label}</text>}</Index>
          <text class="sheen-chart-axis-label" x={(margin.left + resolved().plotRight) / 2} y={resolved().height - 12}>{props.xLabel}</text>
          <text class="sheen-chart-axis-label" x={12} y={(margin.top + resolved().plotBottom) / 2} transform={`rotate(-90 12 ${(margin.top + resolved().plotBottom) / 2})`}>{props.yLabel}</text>
        </g>
        <g class="sheen-scatter-points" clip-path={`url(#${clipId})`}><Index each={resolved().points}>{point => <path class="sheen-chart-mark" data-series={point().label}
          data-series-index={point().seriesIndex} data-row={point().row} data-color={point().color} data-shape={point().shape} data-hidden={!point().visible || undefined} d={point().path} />}</Index></g>
        <g class="sheen-chart-inspection" aria-hidden="true"><circle ref={ring} class="sheen-chart-inspection-ring" data-active="false" /></g>
      </svg>
      <div ref={tooltip} class="sheen-chart-tooltip" hidden aria-hidden="true">
        <div class="sheen-chart-tooltip-domain"><span ref={tooltipMarker} class="sheen-chart-legend-marker" aria-hidden="true" /> <span ref={tooltipDomain} /></div>
        <ul>
          <li><span aria-hidden="true" /><span>{props.xLabel}</span><span ref={tooltipX} class="sheen-chart-tooltip-value" /></li>
          <li><span aria-hidden="true" /><span>{props.yLabel}</span><span ref={tooltipY} class="sheen-chart-tooltip-value" /></li>
          <Show when={props.size}>{size => <li><span aria-hidden="true" /><span>{size().label}</span><span ref={tooltipSize} class="sheen-chart-tooltip-value" /></li>}</Show>
        </ul>
      </div>
      <div ref={keyboardStatus} class="sheen-chart-visually-hidden" aria-live="polite" />
      <span id={instructionId} class="sheen-chart-visually-hidden">{messages().keyboardInstructions}</span>
      <Show when={resolved().points.every(point => point.path === "")}><div class="sheen-chart-empty">{props.empty ?? theme.messages().empty}</div></Show>
    </div>
    <ChartLegend series={resolved().definitions} layout={props.legend} marker="shape" visible={visibility.values()} onToggle={visibility.toggle} />
    <ChartRecordTable component="ScatterChart" label={props.label} summary={props.summary} headerLabel={messages().seriesColumn}
      columns={tableColumns()} rowCount={resolved().points.length} header={row => resolved().points[row]?.label ?? ""}
      cell={(row, column) => {
        const point = resolved().points[row];
        if (point === undefined) return undefined;
        const value = column === 0 ? point.x : column === 1 ? point.y : point.size;
        if (Number.isNaN(value)) return undefined;
        return column === 0 ? formatX()(value) : column === 1 ? formatY()(value) : formatSize()(value);
      }}
      {...(props.table?.pageSize === undefined ? {} : { pageSize: props.table.pageSize })}
      {...(props.table?.viewLabel === undefined ? {} : { viewLabel: props.table.viewLabel })}
      {...(props.loading === undefined ? {} : { loading: props.loading })} />
  </figure>;
}
