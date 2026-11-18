import { Index, Show, createEffect, createMemo, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { arc, pie } from "d3-shape";
import { defineSeries } from "./chart-types.ts";
import type { ChartColorToken, ChartSeries, DonutChartProps } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";
import { resolveChartMessages } from "./messages.ts";
import { createResponsiveSvgWidth } from "./responsive-svg.ts";
import { ChartLegend, createSeriesVisibility } from "./ChartLegend.tsx";
import { ChartRecordTable } from "./ChartRecordTable.tsx";

const maximumParts = 8;
const defaultInnerRadius = 0.62;
const sliceGap = 2;

interface DonutSlice {
  readonly index: number;
  readonly key: string;
  readonly label: string;
  readonly color: ChartColorToken;
  readonly value: number;
  readonly path: string;
  readonly centroidX: number;
  readonly centroidY: number;
  readonly visible: boolean;
}

interface DonutModel {
  readonly definitions: readonly ChartSeries[];
  readonly values: Float64Array;
  readonly slices: readonly DonutSlice[];
  readonly total: number;
  readonly visibleTotal: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly outer: number;
  readonly inner: number;
}

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`DonutChart ${name} must be nonempty`);
  return value;
}

function partValue(values: Float64Array, index: number): number {
  return values[index] ?? Number.NaN;
}

function model(props: DonutChartProps, chartWidth: number, visible: readonly boolean[]): DonutModel {
  requiredText(props.label, "label");
  requiredText(props.summary, "summary");
  requiredText(props.categoryLabel, "categoryLabel");
  requiredText(props.valueLabel, "valueLabel");
  if (!Number.isFinite(props.height) || props.height < 160) throw new Error("DonutChart height must be a finite number of at least 160");
  const ratio = props.innerRadius ?? defaultInnerRadius;
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio < 0 || ratio > 0.85) throw new Error("DonutChart innerRadius must be a number from 0 to 0.85");
  const definitions = defineSeries(props.series);
  if (definitions.length > maximumParts) throw new Error(`DonutChart supports at most ${maximumParts} parts; fold the remainder into an Other part`);
  const values = props.values;
  if (!(values instanceof Float64Array)) throw new Error("DonutChart values must be a Float64Array");
  if (values.length !== definitions.length) throw new Error(`DonutChart values length must equal series length ${definitions.length}`);
  let total = 0;
  let visibleTotal = 0;
  for (let index = 0; index < values.length; index++) {
    const value = partValue(values, index);
    if (Number.isNaN(value)) continue;
    if (!Number.isFinite(value) || value < 0) throw new Error(`DonutChart value ${index} must be a non-negative finite number or NaN`);
    total += value;
    if (visible[index]) visibleTotal += value;
  }
  const centerX = chartWidth / 2;
  const centerY = props.height / 2;
  const outer = Math.max(8, Math.min(chartWidth, props.height) / 2 - 8);
  const inner = outer * ratio;
  const drawable = definitions.flatMap((_definition, index) => visible[index] && partValue(values, index) > 0 ? [index] : []);
  const layout = pie<number>().sort(null).value(index => partValue(values, index)).padAngle(drawable.length > 1 ? sliceGap / outer : 0);
  const shape = arc<{ readonly startAngle: number; readonly endAngle: number; readonly padAngle: number }>()
    .innerRadius(inner).outerRadius(outer).cornerRadius(Math.min(4, (outer - inner) / 4)).padRadius(outer);
  const angles = new Map(layout(drawable).map(angle => [angle.data, angle]));
  const slices = definitions.map((definition, index): DonutSlice => {
    const value = partValue(values, index);
    const angle = angles.get(index);
    const [x, y] = angle ? shape.centroid(angle) : [0, 0];
    return Object.freeze({
      index, key: definition.key, label: definition.label, color: definition.color, value,
      path: angle ? shape(angle) ?? "" : "", centroidX: centerX + x, centroidY: centerY + y, visible: angle !== undefined,
    });
  });
  return Object.freeze({ definitions, values, slices: Object.freeze(slices), total, visibleTotal, height: props.height, centerX, centerY, outer, inner });
}

export function DonutChart(props: DonutChartProps): JSX.Element {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const summaryId = createUniqueId();
  const instructionId = createUniqueId();
  const viewport = createResponsiveSvgWidth();
  const definitions = createMemo(() => defineSeries(props.series));
  const visibility = createSeriesVisibility(definitions);
  const resolved = createMemo(() => model(props, viewport.width(), visibility.values()));
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const format = createMemo(() => createChartTableFormatters(locale(), { type: "number" }, props.format === undefined ? undefined : { format: props.format }).value);
  const percent = createMemo(() => new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 1 }));
  let tooltip: HTMLDivElement | undefined;
  let tooltipDomain: HTMLDivElement | undefined;
  let tooltipMarker: HTMLSpanElement | undefined;
  let tooltipValue: HTMLSpanElement | undefined;
  let tooltipShare: HTMLSpanElement | undefined;
  let keyboardStatus: HTMLDivElement | undefined;
  let svg: SVGSVGElement | undefined;
  let inspectedIndex = -1;

  function inspectable(): readonly number[] {
    return resolved().slices.flatMap(slice => slice.visible ? [slice.index] : []);
  }

  function hideInspection(): void {
    inspectedIndex = -1;
    if (tooltip) {
      tooltip.hidden = true;
      tooltip.dataset.index = "";
    }
    svg?.querySelector("[data-inspected]")?.removeAttribute("data-inspected");
  }

  function inspect(index: number, announce: boolean): void {
    const current = resolved();
    const slice = current.slices[index];
    if (props.tooltip === false || slice === undefined || !slice.visible) {
      hideInspection();
      return;
    }
    inspectedIndex = index;
    const value = format()(slice.value);
    const share = percent().format(current.visibleTotal > 0 ? slice.value / current.visibleTotal : 0);
    if (tooltipDomain) tooltipDomain.textContent = slice.label;
    if (tooltipMarker) tooltipMarker.dataset.color = slice.color;
    if (tooltipValue) tooltipValue.textContent = value;
    if (tooltipShare) tooltipShare.textContent = share;
    svg?.querySelector("[data-inspected]")?.removeAttribute("data-inspected");
    svg?.querySelector(`[data-part-index="${index}"]`)?.setAttribute("data-inspected", "true");
    if (tooltip) {
      tooltip.hidden = false;
      tooltip.dataset.index = String(index);
      tooltip.dataset.side = slice.centroidX > viewport.width() / 2 ? "start" : "end";
      tooltip.style.setProperty("--sheen-chart-tooltip-x", `${slice.centroidX}px`);
      tooltip.style.setProperty("--sheen-chart-tooltip-y", `${Math.max(0, slice.centroidY - 24)}px`);
      const updates = Number.parseInt(tooltip.dataset.updates ?? "0", 10);
      tooltip.dataset.updates = String(Number.isFinite(updates) ? updates + 1 : 1);
    }
    if (announce && keyboardStatus) keyboardStatus.textContent = `${slice.label}, ${props.valueLabel}: ${value}, ${messages().shareColumn}: ${share}`;
  }

  function handlePointerMove(event: PointerEvent): void {
    const target = event.target instanceof Element ? event.target.closest("[data-part-index]") : null;
    const index = target instanceof SVGElement ? Number.parseInt(target.dataset.partIndex ?? "", 10) : Number.NaN;
    if (Number.isSafeInteger(index)) inspect(index, false);
    else hideInspection();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      hideInspection();
      if (keyboardStatus) keyboardStatus.textContent = "";
      return;
    }
    const order = inspectable();
    const position = order.indexOf(inspectedIndex);
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
    if (inspectedIndex < 0) return;
    if (current.slices[inspectedIndex]?.visible) inspect(inspectedIndex, false);
    else hideInspection();
  });

  const showCenter = () => resolved().inner >= 24;

  return <figure class={cn("sheen-svg-chart", "sheen-donut-chart", props.class)} aria-busy={props.loading || undefined} data-shape={(props.innerRadius ?? defaultInnerRadius) === 0 ? "pie" : "donut"}>
    <figcaption class="sheen-chart-caption"><span class="sheen-chart-title">{props.label}</span><span id={summaryId} class="sheen-chart-summary">{props.summary}</span></figcaption>
    <div class="sheen-svg-chart-plot" style={{ height: `${resolved().height}px` }}>
      <svg ref={element => { svg = element; viewport.ref(element); }} viewBox={`0 0 ${viewport.width()} ${resolved().height}`} role="img" aria-label={props.label} aria-describedby={`${summaryId} ${instructionId}`}
        aria-keyshortcuts={props.tooltip === false ? undefined : "ArrowLeft ArrowRight Home End Escape"} tabIndex={props.tooltip === false ? undefined : 0}
        onPointerMove={handlePointerMove} onPointerLeave={hideInspection} onKeyDown={handleKeyDown} preserveAspectRatio="xMidYMid meet">
        <circle class="sheen-donut-track" aria-hidden="true" cx={resolved().centerX} cy={resolved().centerY} r={(resolved().outer + resolved().inner) / 2}
          stroke-width={Math.max(1, resolved().outer - resolved().inner)} />
        <g class="sheen-donut-slices" transform={`translate(${resolved().centerX} ${resolved().centerY})`}><Index each={resolved().slices}>{slice => <path class="sheen-chart-mark"
          data-part-index={slice().index} data-series={slice().key} data-color={slice().color} data-value={slice().value} data-hidden={!slice().visible || undefined} d={slice().path}>
          <title>{`${slice().label}: ${Number.isNaN(slice().value) ? messages().missingValue : format()(slice().value)}`}</title></path>}</Index></g>
      </svg>
      <Show when={showCenter()}><div class="sheen-donut-center" aria-hidden="true" style={{ "max-inline-size": `${Math.round(resolved().inner * 1.5)}px` }}>
        {props.center ?? <><span class="sheen-donut-total">{format()(resolved().visibleTotal)}</span><span class="sheen-donut-total-label">{props.valueLabel}</span></>}
      </div></Show>
      <div ref={tooltip} class="sheen-chart-tooltip" hidden aria-hidden="true">
        <div ref={tooltipDomain} class="sheen-chart-tooltip-domain" />
        <ul>
          <li><span ref={tooltipMarker} class="sheen-chart-legend-marker" data-shape="square" aria-hidden="true" /><span>{props.valueLabel}</span><span ref={tooltipValue} class="sheen-chart-tooltip-value" /></li>
          <li><span aria-hidden="true" /><span>{messages().shareColumn}</span><span ref={tooltipShare} class="sheen-chart-tooltip-value" /></li>
        </ul>
      </div>
      <div ref={keyboardStatus} class="sheen-chart-visually-hidden" aria-live="polite" />
      <span id={instructionId} class="sheen-chart-visually-hidden">{messages().keyboardInstructions}</span>
      <Show when={resolved().total === 0}><div class="sheen-chart-empty">{props.empty ?? theme.messages().empty}</div></Show>
    </div>
    <ChartLegend series={resolved().definitions} layout={props.legend} marker="swatch" visible={visibility.values()} onToggle={visibility.toggle} />
    <ChartRecordTable component="DonutChart" label={props.label} summary={props.summary} headerLabel={props.categoryLabel}
      columns={[{ label: props.valueLabel }, { label: messages().shareColumn }]} rowCount={resolved().definitions.length}
      header={row => resolved().definitions[row]?.label ?? ""}
      cell={(row, column) => {
        const value = partValue(resolved().values, row);
        if (Number.isNaN(value)) return undefined;
        return column === 0 ? format()(value) : percent().format(resolved().total > 0 ? value / resolved().total : 0);
      }}
      {...(props.table?.pageSize === undefined ? {} : { pageSize: props.table.pageSize })}
      {...(props.table?.viewLabel === undefined ? {} : { viewLabel: props.table.viewLabel })}
      {...(props.loading === undefined ? {} : { loading: props.loading })} />
  </figure>;
}
