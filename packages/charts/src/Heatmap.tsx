import { Index, Show, createEffect, createMemo, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import type { ChartColorToken, ChartMatrixData, HeatmapProps } from "./chart-types.ts";
import { chartColorTokens } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";
import { resolveChartMessages } from "./messages.ts";
import { createResponsiveSvgWidth } from "./responsive-svg.ts";
import { ChartRecordTable } from "./ChartRecordTable.tsx";

const maximumCells = 2_000;
const heatmapSteps = 5;
const cellGap = 2;
const margin = Object.freeze({ top: 8, right: 8, bottom: 44, left: 108 });
const colorSet: ReadonlySet<string> = new Set(chartColorTokens);

interface HeatmapCell {
  readonly index: number;
  readonly column: number;
  readonly row: number;
  readonly value: number;
  readonly step: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Tick {
  readonly position: number;
  readonly label: string;
}

interface HeatmapModel {
  readonly data: ChartMatrixData;
  readonly cells: readonly HeatmapCell[];
  readonly xTicks: readonly Tick[];
  readonly yTicks: readonly Tick[];
  readonly domain: readonly [number, number];
  readonly hasMissing: boolean;
  readonly color: ChartColorToken;
  readonly height: number;
  readonly plotBottom: number;
  readonly plotRight: number;
}

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Heatmap ${name} must be nonempty`);
  return value;
}

function truncateLabel(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

function categories(values: readonly string[], axis: string): readonly string[] {
  if (!Array.isArray(values)) throw new Error(`Heatmap ${axis} categories must be an array`);
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (typeof value !== "string" || !value.trim()) throw new Error(`Heatmap ${axis} category ${index} must be nonempty text`);
    if (seen.has(value)) throw new Error(`Heatmap ${axis} category ${index} duplicates ${value}`);
    seen.add(value);
  });
  return values;
}

/** Equal-interval sequential class for a finite value; values outside the domain clamp to the end classes. */
export function heatmapStep(value: number, domain: readonly [number, number]): number {
  const [low, high] = domain;
  if (high === low) return heatmapSteps - 1;
  const ratio = (value - low) / (high - low);
  return Math.max(0, Math.min(heatmapSteps - 1, Math.floor(ratio * heatmapSteps)));
}

function model(props: HeatmapProps, chartWidth: number): HeatmapModel {
  requiredText(props.label, "label");
  requiredText(props.summary, "summary");
  requiredText(props.xLabel, "xLabel");
  requiredText(props.yLabel, "yLabel");
  requiredText(props.valueLabel, "valueLabel");
  if (!Number.isFinite(props.height) || props.height < 160) throw new Error("Heatmap height must be a finite number of at least 160");
  const color = props.color ?? "chart-1";
  if (!colorSet.has(color)) throw new Error("Heatmap color must be a chart color token");
  const data = props.data;
  if (typeof data !== "object" || data === null) throw new Error("Heatmap data must be an object");
  const xs = categories(data.x, "x");
  const ys = categories(data.y, "y");
  if (!(data.values instanceof Float64Array)) throw new Error("Heatmap values must be a Float64Array");
  if (data.values.length !== xs.length * ys.length) throw new Error(`Heatmap values length must equal x length × y length (${xs.length * ys.length})`);
  if (data.values.length > maximumCells) throw new Error(`Heatmap supports at most ${maximumCells} SVG cells`);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let hasMissing = false;
  for (let index = 0; index < data.values.length; index++) {
    const value = data.values[index] ?? Number.NaN;
    if (Number.isNaN(value)) { hasMissing = true; continue; }
    if (!Number.isFinite(value)) throw new Error(`Heatmap value ${index} must be finite or NaN`);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  let domain: readonly [number, number];
  if (props.domain !== undefined) {
    const [low, high] = props.domain;
    if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) throw new Error("Heatmap domain must be two ascending finite numbers");
    domain = [low, high];
  } else domain = Number.isFinite(minimum) ? [minimum, maximum] : [0, 1];
  const plotBottom = props.height - margin.bottom;
  const plotRight = chartWidth - margin.right;
  const bandWidth = xs.length ? Math.max(0, plotRight - margin.left) / xs.length : 0;
  const bandHeight = ys.length ? Math.max(0, plotBottom - margin.top) / ys.length : 0;
  const cells: HeatmapCell[] = [];
  for (let row = 0; row < ys.length; row++) for (let column = 0; column < xs.length; column++) {
    const index = row * xs.length + column;
    const value = data.values[index] ?? Number.NaN;
    cells.push(Object.freeze({
      index, column, row, value, step: Number.isNaN(value) ? -1 : heatmapStep(value, domain),
      x: margin.left + column * bandWidth + cellGap / 2, y: margin.top + row * bandHeight + cellGap / 2,
      width: Math.max(1, bandWidth - cellGap), height: Math.max(1, bandHeight - cellGap),
    }));
  }
  const xStep = Math.max(1, Math.ceil(xs.length / Math.max(1, Math.floor((plotRight - margin.left) / 56))));
  const yStep = Math.max(1, Math.ceil(ys.length / Math.max(1, Math.floor((plotBottom - margin.top) / 16))));
  const xTicks = Object.freeze(xs.flatMap((label, index) => index % xStep === 0 ? [Object.freeze({ position: margin.left + (index + 0.5) * bandWidth, label: truncateLabel(label, 10) })] : []));
  const yTicks = Object.freeze(ys.flatMap((label, index) => index % yStep === 0 ? [Object.freeze({ position: margin.top + (index + 0.5) * bandHeight, label: truncateLabel(label, 14) })] : []));
  return Object.freeze({ data, cells: Object.freeze(cells), xTicks, yTicks, domain, hasMissing, color, height: props.height, plotBottom, plotRight });
}

export function Heatmap(props: HeatmapProps): JSX.Element {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const summaryId = createUniqueId();
  const instructionId = createUniqueId();
  const viewport = createResponsiveSvgWidth();
  const resolved = createMemo(() => model(props, viewport.width()));
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const format = createMemo(() => createChartTableFormatters(locale(), { type: "number" }, props.format === undefined ? undefined : { format: props.format }).value);
  const scale = createMemo(() => {
    const [low, high] = resolved().domain;
    return Array.from({ length: heatmapSteps }, (_, step) => Object.freeze({ step, label: format()(low + ((high - low) * step) / heatmapSteps) }));
  });
  let tooltip: HTMLDivElement | undefined;
  let tooltipDomain: HTMLDivElement | undefined;
  let tooltipValue: HTMLSpanElement | undefined;
  let outline: SVGRectElement | undefined;
  let keyboardStatus: HTMLDivElement | undefined;
  let inspectedIndex = -1;

  function hideInspection(): void {
    inspectedIndex = -1;
    if (tooltip) {
      tooltip.hidden = true;
      tooltip.dataset.index = "";
    }
    outline?.setAttribute("data-active", "false");
  }

  function inspect(index: number, announce: boolean): void {
    const current = resolved();
    const cell = current.cells[index];
    if (props.tooltip === false || cell === undefined) {
      hideInspection();
      return;
    }
    inspectedIndex = index;
    const domain = `${current.data.y[cell.row] ?? ""} · ${current.data.x[cell.column] ?? ""}`;
    const missing = Number.isNaN(cell.value);
    const value = missing ? "—" : format()(cell.value);
    if (tooltipDomain) tooltipDomain.textContent = domain;
    if (tooltipValue) tooltipValue.textContent = value;
    if (outline) {
      outline.setAttribute("data-active", "true");
      outline.setAttribute("x", String(cell.x - 1));
      outline.setAttribute("y", String(cell.y - 1));
      outline.setAttribute("width", String(cell.width + 2));
      outline.setAttribute("height", String(cell.height + 2));
    }
    if (tooltip) {
      const anchor = cell.x + cell.width / 2;
      tooltip.hidden = false;
      tooltip.dataset.index = String(index);
      tooltip.dataset.side = anchor > viewport.width() / 2 ? "start" : "end";
      tooltip.style.setProperty("--sheen-chart-tooltip-x", `${anchor}px`);
      tooltip.style.setProperty("--sheen-chart-tooltip-y", `${cell.y}px`);
      const updates = Number.parseInt(tooltip.dataset.updates ?? "0", 10);
      tooltip.dataset.updates = String(Number.isFinite(updates) ? updates + 1 : 1);
    }
    if (announce && keyboardStatus) keyboardStatus.textContent = `${current.data.y[cell.row] ?? ""}, ${current.data.x[cell.column] ?? ""}, ${props.valueLabel}: ${missing ? messages().missingValue : value}`;
  }

  function handlePointerMove(event: PointerEvent & { readonly currentTarget: SVGSVGElement }): void {
    const current = resolved();
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * viewport.width();
    const y = ((event.clientY - box.top) / box.height) * current.height;
    const columns = current.data.x.length;
    const rows = current.data.y.length;
    const column = Math.floor(((x - margin.left) / Math.max(1, current.plotRight - margin.left)) * columns);
    const row = Math.floor(((y - margin.top) / Math.max(1, current.plotBottom - margin.top)) * rows);
    if (column < 0 || row < 0 || column >= columns || row >= rows) hideInspection();
    else inspect(row * columns + column, false);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      hideInspection();
      if (keyboardStatus) keyboardStatus.textContent = "";
      return;
    }
    const columns = resolved().data.x.length;
    const rows = resolved().data.y.length;
    if (columns === 0 || rows === 0) return;
    const column = inspectedIndex < 0 ? -1 : inspectedIndex % columns;
    const row = inspectedIndex < 0 ? 0 : Math.floor(inspectedIndex / columns);
    let next: number | undefined;
    if (inspectedIndex < 0 && ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) next = event.key === "End" ? columns - 1 : 0;
    else if (event.key === "ArrowRight") next = row * columns + Math.min(columns - 1, column + 1);
    else if (event.key === "ArrowLeft") next = row * columns + Math.max(0, column - 1);
    else if (event.key === "ArrowDown") next = Math.min(rows - 1, row + 1) * columns + column;
    else if (event.key === "ArrowUp") next = Math.max(0, row - 1) * columns + column;
    else if (event.key === "Home") next = row * columns;
    else if (event.key === "End") next = row * columns + columns - 1;
    if (next === undefined) return;
    event.preventDefault();
    inspect(next, true);
  }

  createEffect(() => {
    const current = resolved();
    if (inspectedIndex >= current.cells.length) hideInspection();
    else if (inspectedIndex >= 0) inspect(inspectedIndex, false);
  });

  return <figure class={cn("sheen-svg-chart", "sheen-heatmap", props.class)} aria-busy={props.loading || undefined}>
    <figcaption class="sheen-chart-caption"><span class="sheen-chart-title">{props.label}</span><span id={summaryId} class="sheen-chart-summary">{props.summary}</span></figcaption>
    <div class="sheen-svg-chart-plot" style={{ height: `${resolved().height}px` }}>
      <svg ref={viewport.ref} viewBox={`0 0 ${viewport.width()} ${resolved().height}`} role="img" aria-label={props.label} aria-describedby={`${summaryId} ${instructionId}`}
        aria-keyshortcuts={props.tooltip === false ? undefined : "ArrowLeft ArrowRight ArrowUp ArrowDown Home End Escape"} tabIndex={props.tooltip === false ? undefined : 0}
        onPointerMove={handlePointerMove} onPointerLeave={hideInspection} onKeyDown={handleKeyDown} preserveAspectRatio="xMidYMid meet">
        <g class="sheen-heatmap-cells"><Index each={resolved().cells}>{cell => <rect class="sheen-chart-mark sheen-heatmap-cell" data-color={resolved().color} data-step={cell().step < 0 ? "missing" : cell().step}
          data-x={resolved().data.x[cell().column]} data-y={resolved().data.y[cell().row]} data-value={cell().value} x={cell().x} y={cell().y} width={cell().width} height={cell().height} rx={2} />}</Index></g>
        <g class="sheen-chart-axis" aria-hidden="true">
          <Index each={resolved().yTicks}>{tick => <text class="sheen-chart-axis-y" x={margin.left - 8} y={tick().position}>{tick().label}</text>}</Index>
          <Index each={resolved().xTicks}>{tick => <text class="sheen-chart-axis-x" x={tick().position} y={resolved().plotBottom + 8}>{tick().label}</text>}</Index>
          <text class="sheen-chart-axis-label" x={(margin.left + resolved().plotRight) / 2} y={resolved().height - 10}>{props.xLabel}</text>
          <text class="sheen-chart-axis-label" x={12} y={(margin.top + resolved().plotBottom) / 2} transform={`rotate(-90 12 ${(margin.top + resolved().plotBottom) / 2})`}>{props.yLabel}</text>
        </g>
        <g class="sheen-chart-inspection" aria-hidden="true"><rect ref={outline} class="sheen-chart-inspection-cell" data-active="false" rx={3} /></g>
      </svg>
      <div ref={tooltip} class="sheen-chart-tooltip" hidden aria-hidden="true">
        <div ref={tooltipDomain} class="sheen-chart-tooltip-domain" />
        <ul><li><span aria-hidden="true" /><span>{props.valueLabel}</span><span ref={tooltipValue} class="sheen-chart-tooltip-value" /></li></ul>
      </div>
      <div ref={keyboardStatus} class="sheen-chart-visually-hidden" aria-live="polite" />
      <span id={instructionId} class="sheen-chart-visually-hidden">{messages().gridKeyboardInstructions}</span>
      <Show when={resolved().cells.length === 0}><div class="sheen-chart-empty">{props.empty ?? theme.messages().empty}</div></Show>
    </div>
    <Show when={props.legend !== false}><div class="sheen-heatmap-scale" aria-hidden="true">
      <span class="sheen-heatmap-scale-label">{props.valueLabel}</span>
      <ol><Index each={scale()}>{entry => <li><span class="sheen-chart-mark sheen-heatmap-swatch" data-color={resolved().color} data-step={entry().step} /><span>{entry().label}</span></li>}</Index>
        <li><span>{format()(resolved().domain[1])}</span></li></ol>
      <Show when={resolved().hasMissing}><span class="sheen-heatmap-scale-missing"><span class="sheen-heatmap-swatch" data-step="missing" />{messages().missingValue}</span></Show>
    </div></Show>
    <ChartRecordTable component="Heatmap" label={props.label} summary={props.summary} headerLabel={props.yLabel}
      columns={resolved().data.x.map(label => ({ label }))} rowCount={resolved().data.y.length} header={row => resolved().data.y[row] ?? ""}
      cell={(row, column) => {
        const value = resolved().data.values[row * resolved().data.x.length + column] ?? Number.NaN;
        return Number.isNaN(value) ? undefined : format()(value);
      }}
      {...(props.table?.pageSize === undefined ? {} : { pageSize: props.table.pageSize })}
      {...(props.table?.viewLabel === undefined ? {} : { viewLabel: props.table.viewLabel })}
      {...(props.loading === undefined ? {} : { loading: props.loading })} />
  </figure>;
}
