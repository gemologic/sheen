import { For, Index, Show, createEffect, createMemo, createSignal, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import {
  Pagination, Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow, cn, useTheme,
} from "@gemologic/sheen";
import { scaleBand, scaleLinear } from "d3-scale";
import { createChartTableFormatters } from "./format.ts";
import { resolveChartMessages } from "./messages.ts";
import { defineSeries, resolveChartSeriesEncoding, validateCategorical } from "./chart-types.ts";
import type { BarChartProps, ChartCategoricalData, ChartColorToken, ChartSeries, ChartSeriesEncoding, ChartValueAxis } from "./chart-types.ts";
import { createResponsiveSvgWidth } from "./responsive-svg.ts";
import { ChartLegend, createSeriesVisibility } from "./ChartLegend.tsx";

const maximumMarks = 2_000;
const defaultPageSize = 50;
const maximumPageSize = 200;

interface BarMark {
  readonly key: string;
  readonly seriesIndex: number;
  readonly category: string;
  readonly label: string;
  readonly color: ChartColorToken;
  readonly encoding: ChartSeriesEncoding;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;
}

interface Tick {
  readonly position: number;
  readonly label: string;
}

interface CategoryTick extends Tick {
  readonly category: string;
}

interface BarModel {
  readonly data: ChartCategoricalData;
  readonly definitions: readonly ChartSeries[];
  readonly marks: readonly BarMark[];
  readonly valueTicks: readonly Tick[];
  readonly categoryTicks: readonly CategoryTick[];
  readonly categoryPositions: readonly number[];
  readonly categoryBandwidth: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly zero: number;
  readonly layout: "vertical" | "horizontal";
}

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`BarChart ${name} must be nonempty`);
  return value;
}

function truncateLabel(value: string): string {
  return value.length > 18 ? `${value.slice(0, 17)}…` : value;
}

function bandPosition(scale: ReturnType<typeof scaleBand<string>>, value: string): number {
  const position = scale(value);
  if (position === undefined) throw new Error(`BarChart could not position category ${value}`);
  return position;
}

function extent(data: ChartCategoricalData, definitions: readonly ChartSeries[], arrangement: "grouped" | "stacked", visible: readonly boolean[]): readonly [number, number] {
  let minimum = 0;
  let maximum = 0;
  for (let categoryIndex = 0; categoryIndex < data.categories.length; categoryIndex++) {
    let positive = 0;
    let negative = 0;
    for (let seriesIndex = 0; seriesIndex < definitions.length; seriesIndex++) {
      const definition = definitions[seriesIndex];
      if (definition === undefined || !visible[seriesIndex]) continue;
      const value = data.values[definition.key]?.[categoryIndex] ?? Number.NaN;
      if (Number.isNaN(value)) continue;
      if (arrangement === "grouped") {
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      } else if (value >= 0) positive += value;
      else negative += value;
    }
    if (arrangement === "stacked") {
      minimum = Math.min(minimum, negative);
      maximum = Math.max(maximum, positive);
    }
  }
  if (minimum === maximum) return [minimum, maximum + 1];
  return [minimum, maximum];
}

function model(props: BarChartProps, locale: string, chartWidth: number, visibleState: readonly boolean[]): BarModel {
  requiredText(props.label, "label");
  requiredText(props.summary, "summary");
  requiredText(props.categoryLabel, "categoryLabel");
  requiredText(props.valueLabel, "valueLabel");
  if (!Number.isFinite(props.height) || props.height < 160) throw new Error("BarChart height must be a finite number of at least 160");
  const definitions = defineSeries(props.series);
  const data = validateCategorical(props.data, definitions);
  if (data.categories.length * definitions.length > maximumMarks) throw new Error(`BarChart supports at most ${maximumMarks} SVG marks`);
  const layout = props.layout ?? "vertical";
  const arrangement = props.arrangement ?? "grouped";
  const left = layout === "horizontal" ? 120 : 52;
  const right = chartWidth - 16;
  const top = 12;
  const bottom = props.height - 56;
  const domain = extent(data, definitions, arrangement, visibleState);
  const valueScale = scaleLinear().domain(domain).nice(4).range(layout === "horizontal" ? [left, right] : [bottom, top]);
  const categoryScale = scaleBand<string>().domain(data.categories).range(layout === "horizontal" ? [top, bottom] : [left, right]).padding(0.18);
  const visible = definitions.filter((_definition, index) => visibleState[index]);
  const groupScale = scaleBand<string>().domain(visible.map(definition => definition.key)).range([0, categoryScale.bandwidth()]).padding(0.08);
  const positive = new Map<string, number>();
  const negative = new Map<string, number>();
  const marks: BarMark[] = [];
  for (let categoryIndex = 0; categoryIndex < data.categories.length; categoryIndex++) {
    const category = data.categories[categoryIndex];
    if (category === undefined) continue;
    positive.set(category, 0);
    negative.set(category, 0);
    for (let seriesIndex = 0; seriesIndex < definitions.length; seriesIndex++) {
      const definition = definitions[seriesIndex];
      if (!definition) continue;
      const value = data.values[definition.key]?.[categoryIndex] ?? Number.NaN;
      if (Number.isNaN(value)) continue;
      const seriesVisible = visibleState[seriesIndex] ?? false;
      let from = 0;
      let to = value;
      if (!seriesVisible) {
        to = 0;
      } else if (arrangement === "stacked") {
        if (value >= 0) {
          from = positive.get(category) ?? 0;
          to = from + value;
          positive.set(category, to);
        } else {
          from = negative.get(category) ?? 0;
          to = from + value;
          negative.set(category, to);
        }
      }
      const categoryPosition = bandPosition(categoryScale, category);
      const groupPosition = arrangement === "grouped" && seriesVisible ? bandPosition(groupScale, definition.key) : 0;
      const thickness = seriesVisible ? arrangement === "grouped" ? groupScale.bandwidth() : categoryScale.bandwidth() : 0;
      const start = valueScale(from);
      const end = valueScale(to);
      marks.push(Object.freeze({
        key: `${categoryIndex}:${definition.key}`,
        seriesIndex,
        category,
        label: definition.label,
        color: definition.color,
        encoding: resolveChartSeriesEncoding(definition, seriesIndex),
        value,
        x: layout === "horizontal" ? Math.min(start, end) : categoryPosition + groupPosition,
        y: layout === "horizontal" ? categoryPosition + groupPosition : Math.min(start, end),
        width: layout === "horizontal" ? Math.abs(end - start) : thickness,
        height: layout === "horizontal" ? thickness : Math.abs(end - start),
        visible: seriesVisible,
      }));
    }
  }
  const formatter = createChartTableFormatters(locale, { type: "number" }, props.y).value;
  const valueTicks = Object.freeze(valueScale.ticks(4).map(value => Object.freeze({ position: valueScale(value), label: formatter(value) })));
  const step = Math.max(1, Math.ceil(data.categories.length / 10));
  const categoryTicks = Object.freeze(data.categories.flatMap((category, index): readonly CategoryTick[] => {
    if (index % step !== 0 && index !== data.categories.length - 1) return [];
    return [Object.freeze({ category, position: bandPosition(categoryScale, category) + categoryScale.bandwidth() / 2, label: truncateLabel(category) })];
  }));
  const categoryPositions = Object.freeze(data.categories.map(category => bandPosition(categoryScale, category) + categoryScale.bandwidth() / 2));
  return Object.freeze({ data, definitions, marks: Object.freeze(marks), valueTicks, categoryTicks, categoryPositions, categoryBandwidth: categoryScale.bandwidth(), height: props.height, left, right, top, bottom, zero: valueScale(0), layout });
}

function CategoricalDataTable(props: {
  readonly label: string;
  readonly summary: string;
  readonly categoryLabel: string;
  readonly series: readonly ChartSeries[];
  readonly data: ChartCategoricalData;
  readonly y?: ChartValueAxis;
  readonly pageSize?: number;
  readonly viewLabel?: string;
  readonly loading?: boolean;
}): JSX.Element {
  const theme = useTheme();
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const pageSize = createMemo(() => {
    const value = props.pageSize ?? defaultPageSize;
    if (!Number.isSafeInteger(value) || value < 1 || value > maximumPageSize) throw new Error(`BarChart table pageSize must be an integer from 1 to ${maximumPageSize}`);
    return value;
  });
  const [requestedPage, setRequestedPage] = createSignal(0);
  const pageCount = createMemo(() => Math.ceil(props.data.categories.length / pageSize()));
  const page = createMemo(() => Math.min(requestedPage(), Math.max(0, pageCount() - 1)));
  createEffect(() => { if (page() !== requestedPage()) setRequestedPage(page()); });
  const indices = createMemo(() => {
    const start = page() * pageSize();
    return Array.from({ length: Math.min(pageSize(), Math.max(0, props.data.categories.length - start)) }, (_, offset) => start + offset);
  });
  const format = createMemo(() => createChartTableFormatters(theme.state().locale, { type: "number" }, props.y).value);
  return <details class="sheen-chart-data" aria-busy={props.loading || undefined}>
    <summary>{props.viewLabel ?? messages().viewAsTable}</summary>
    <p class="sheen-chart-data-summary">{props.summary}</p>
    <div class="sheen-chart-data-scroll" tabIndex={0} aria-label={props.label}>
      <Table striped>
        <TableCaption>{props.label}</TableCaption>
        <TableHead><TableRow><TableHeaderCell>{props.categoryLabel}</TableHeaderCell><For each={props.series}>{series => <TableHeaderCell numeric>{series.label}</TableHeaderCell>}</For></TableRow></TableHead>
        <TableBody><Show when={indices().length > 0} fallback={<TableRow><TableCell colSpan={props.series.length + 1}>{theme.messages().empty}</TableCell></TableRow>}>
          <For each={indices()}>{index => <TableRow data-chart-row={index}><TableHeaderCell scope="row">{props.data.categories[index]}</TableHeaderCell>
            <For each={props.series}>{series => {
              const value = () => props.data.values[series.key]?.[index] ?? Number.NaN;
              return <TableCell numeric>{Number.isNaN(value())
                ? <><span aria-hidden="true">—</span><span class="sheen-chart-visually-hidden">{messages().missingValue}</span></>
                : format()(value())}</TableCell>;
            }}</For>
          </TableRow>}</For>
        </Show></TableBody>
      </Table>
    </div>
    <Show when={pageCount() > 1}><Pagination class="sheen-chart-data-pagination" label={messages().tablePagination}
      pageIndex={page()} pageCount={pageCount()} pending={props.loading ?? false} onPageChange={setRequestedPage} /></Show>
  </details>;
}

export function BarChart(props: BarChartProps): JSX.Element {
  const theme = useTheme();
  const summaryId = createUniqueId();
  const instructionId = createUniqueId();
  const viewport = createResponsiveSvgWidth();
  const definitions = createMemo(() => defineSeries(props.series));
  const visibility = createSeriesVisibility(definitions);
  const resolved = createMemo(() => model(props, theme.state().locale, viewport.width(), visibility.values()));
  const format = createMemo(() => createChartTableFormatters(theme.state().locale, { type: "number" }, props.y).value);
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const tooltipRows = new Map<string, HTMLLIElement>();
  const tooltipValues = new Map<string, HTMLSpanElement>();
  let tooltip: HTMLDivElement | undefined;
  let tooltipDomain: HTMLDivElement | undefined;
  let inspectionBand: SVGRectElement | undefined;
  let keyboardStatus: HTMLDivElement | undefined;
  let inspectedIndex = -1;

  function hideInspection(): void {
    inspectedIndex = -1;
    if (tooltip) {
      tooltip.hidden = true;
      tooltip.dataset.index = "";
    }
    inspectionBand?.setAttribute("data-active", "false");
  }

  function inspect(index: number, announce: boolean): void {
    const current = resolved();
    const category = current.data.categories[index];
    const position = current.categoryPositions[index];
    if (props.tooltip === false || category === undefined || position === undefined) {
      hideInspection();
      return;
    }
    inspectedIndex = index;
    if (tooltipDomain) tooltipDomain.textContent = category;
    const status = [category];
    const visible = visibility.values();
    for (let seriesIndex = 0; seriesIndex < current.definitions.length; seriesIndex++) {
      const definition = current.definitions[seriesIndex];
      if (definition === undefined) continue;
      const value = current.data.values[definition.key]?.[index];
      const missing = value === undefined || Number.isNaN(value);
      const formatted = missing ? "—" : format()(value);
      const row = tooltipRows.get(definition.key);
      if (row) row.hidden = !(visible[seriesIndex] ?? false);
      const valueElement = tooltipValues.get(definition.key);
      if (valueElement) valueElement.textContent = formatted;
      if (visible[seriesIndex]) status.push(`${definition.label}: ${missing ? messages().missingValue : formatted}`);
    }
    if (inspectionBand) {
      inspectionBand.setAttribute("data-active", "true");
      if (current.layout === "horizontal") {
        inspectionBand.setAttribute("x", String(current.left));
        inspectionBand.setAttribute("y", String(position - current.categoryBandwidth / 2));
        inspectionBand.setAttribute("width", String(current.right - current.left));
        inspectionBand.setAttribute("height", String(current.categoryBandwidth));
      } else {
        inspectionBand.setAttribute("x", String(position - current.categoryBandwidth / 2));
        inspectionBand.setAttribute("y", String(current.top));
        inspectionBand.setAttribute("width", String(current.categoryBandwidth));
        inspectionBand.setAttribute("height", String(current.bottom - current.top));
      }
    }
    if (tooltip) {
      const anchor = current.layout === "horizontal" ? current.right : position;
      tooltip.hidden = false;
      tooltip.dataset.index = String(index);
      tooltip.dataset.side = anchor > viewport.width() / 2 ? "start" : "end";
      tooltip.style.setProperty("--sheen-chart-tooltip-x", `${anchor}px`);
      tooltip.style.setProperty("--sheen-chart-tooltip-y", `${current.layout === "horizontal" ? Math.max(current.top, position - current.categoryBandwidth / 2) : current.top}px`);
      const updates = Number.parseInt(tooltip.dataset.updates ?? "0", 10);
      tooltip.dataset.updates = String(Number.isFinite(updates) ? updates + 1 : 1);
    }
    if (announce && keyboardStatus) keyboardStatus.textContent = status.join(", ");
  }

  function nearestCategory(position: number): number {
    const positions = resolved().categoryPositions;
    let closest = -1;
    let distance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < positions.length; index++) {
      const candidate = positions[index];
      if (candidate === undefined) continue;
      const nextDistance = Math.abs(candidate - position);
      if (nextDistance < distance) {
        closest = index;
        distance = nextDistance;
      }
    }
    return closest;
  }

  function handlePointerMove(event: PointerEvent & { readonly currentTarget: SVGSVGElement }): void {
    const current = resolved();
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * viewport.width();
    const y = ((event.clientY - box.top) / box.height) * current.height;
    const index = nearestCategory(current.layout === "horizontal" ? y : x);
    if (index >= 0) inspect(index, false);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const length = resolved().data.categories.length;
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
    if (inspectedIndex >= current.data.categories.length) hideInspection();
    else if (inspectedIndex >= 0) inspect(inspectedIndex, false);
  });

  return <figure class={cn("sheen-svg-chart", "sheen-bar-chart", props.class)} aria-busy={props.loading || undefined} data-layout={resolved().layout} data-arrangement={props.arrangement ?? "grouped"}>
    <figcaption class="sheen-chart-caption"><span class="sheen-chart-title">{props.label}</span><span id={summaryId} class="sheen-chart-summary">{props.summary}</span></figcaption>
    <div class="sheen-svg-chart-plot" style={{ height: `${resolved().height}px` }}>
      <svg ref={viewport.ref} viewBox={`0 0 ${viewport.width()} ${resolved().height}`} role="img" aria-label={props.label} aria-describedby={`${summaryId} ${instructionId}`}
        aria-keyshortcuts={props.tooltip === false ? undefined : "ArrowLeft ArrowRight Home End Escape"} tabIndex={props.tooltip === false ? undefined : 0}
        onPointerMove={handlePointerMove} onPointerLeave={hideInspection} onKeyDown={handleKeyDown} preserveAspectRatio="xMidYMid meet">
        <g class="sheen-chart-grid" aria-hidden="true"><Index each={resolved().valueTicks}>{tick => resolved().layout === "horizontal"
          ? <line x1={tick().position} x2={tick().position} y1={resolved().top} y2={resolved().bottom} />
          : <line x1={resolved().left} x2={resolved().right} y1={tick().position} y2={tick().position} />}</Index></g>
        <line class="sheen-chart-zero" aria-hidden="true" x1={resolved().layout === "horizontal" ? resolved().zero : resolved().left} x2={resolved().layout === "horizontal" ? resolved().zero : resolved().right}
          y1={resolved().layout === "horizontal" ? resolved().top : resolved().zero} y2={resolved().layout === "horizontal" ? resolved().bottom : resolved().zero} />
        <g class="sheen-chart-bars"><Index each={resolved().marks}>{mark => <rect data-hidden={!mark().visible || undefined} data-series={mark().label} data-category={mark().category} data-value={mark().value} data-color={mark().color} data-encoding={mark().encoding} data-series-index={mark().seriesIndex}
          x={mark().x} y={mark().y} width={mark().width} height={mark().height}><title>{`${mark().category}, ${mark().label}: ${format()(mark().value)}`}</title></rect>}</Index></g>
        <g class="sheen-chart-inspection" aria-hidden="true"><rect ref={inspectionBand} class="sheen-chart-inspection-band" data-active="false" /></g>
        <g class="sheen-chart-axis" aria-hidden="true">
          <Index each={resolved().valueTicks}>{tick => resolved().layout === "horizontal"
            ? <text class="sheen-chart-axis-x" x={tick().position} y={resolved().bottom + 18}>{tick().label}</text>
            : <text class="sheen-chart-axis-y" x={resolved().left - 8} y={tick().position}>{tick().label}</text>}</Index>
          <Index each={resolved().categoryTicks}>{tick => resolved().layout === "horizontal"
            ? <text class="sheen-chart-axis-y" x={resolved().left - 8} y={tick().position}>{tick().label}</text>
            : <text class="sheen-chart-axis-x" x={tick().position} y={resolved().bottom + 18}>{tick().label}</text>}</Index>
          <text class="sheen-chart-axis-label" x={resolved().layout === "horizontal" ? (resolved().left + resolved().right) / 2 : 12}
            y={resolved().layout === "horizontal" ? resolved().height - 12 : (resolved().top + resolved().bottom) / 2}
            transform={resolved().layout === "horizontal" ? undefined : `rotate(-90 12 ${(resolved().top + resolved().bottom) / 2})`}>{props.valueLabel}</text>
          <text class="sheen-chart-axis-label" x={resolved().layout === "horizontal" ? 12 : (resolved().left + resolved().right) / 2}
            y={resolved().layout === "horizontal" ? (resolved().top + resolved().bottom) / 2 : resolved().height - 12}
            transform={resolved().layout === "horizontal" ? `rotate(-90 12 ${(resolved().top + resolved().bottom) / 2})` : undefined}>{props.categoryLabel}</text>
        </g>
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
      <Show when={resolved().data.categories.length === 0}><div class="sheen-chart-empty">{props.empty ?? theme.messages().empty}</div></Show>
    </div>
    <ChartLegend series={resolved().definitions} layout={props.legend} visible={visibility.values()} onToggle={visibility.toggle} />
    <CategoricalDataTable label={props.label} summary={props.summary} categoryLabel={props.categoryLabel} series={resolved().definitions} data={resolved().data}
      {...(props.y === undefined ? {} : { y: props.y })}
      {...(props.table?.pageSize === undefined ? {} : { pageSize: props.table.pageSize })}
      {...(props.table?.viewLabel === undefined ? {} : { viewLabel: props.table.viewLabel })}
      {...(props.loading === undefined ? {} : { loading: props.loading })} />
  </figure>;
}
