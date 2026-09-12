import { Index, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import uPlot from "uplot";
import { ChartDataTable } from "./ChartDataTable.tsx";
import { createChartAxisFormatter, createChartTableFormatters } from "./format.ts";
import { chartColumnAnalysis, defineSeries, resolveChartSeriesEncoding, validateColumnar } from "./chart-types.ts";
import type { ChartAnnotation, ChartColorToken, ChartData, ChartSeries, ChartSeriesEncoding, TimeSeriesProps } from "./chart-types.ts";
import { useThemeTokens } from "./theme-tokens.ts";
import type { ThemeTokenName, ThemeTokenValues } from "./theme-tokens.ts";
import { ChartLegend, createSeriesVisibility } from "./ChartLegend.tsx";
import { resolveChartMessages } from "./messages.ts";
import { downsampleTimeSeriesRendererData, sourceIndexAtTimestamp } from "./renderer-data.ts";

const tokenNames: readonly ThemeTokenName[] = Object.freeze([
  "--sheen-chart-1", "--sheen-chart-2", "--sheen-chart-3", "--sheen-chart-4",
  "--sheen-chart-5", "--sheen-chart-6", "--sheen-chart-7", "--sheen-chart-8",
  "--sheen-color-market-up", "--sheen-color-market-down", "--sheen-color-market-flat",
  "--sheen-color-accent", "--sheen-chart-grid", "--sheen-chart-axis", "--sheen-chart-crosshair",
  "--sheen-chart-line-width", "--sheen-font-sans", "--sheen-text-caption-size", "--sheen-text-caption-weight",
]);

const tokenByColor: Readonly<Record<ChartColorToken, ThemeTokenName>> = Object.freeze({
  "chart-1": "--sheen-chart-1",
  "chart-2": "--sheen-chart-2",
  "chart-3": "--sheen-chart-3",
  "chart-4": "--sheen-chart-4",
  "chart-5": "--sheen-chart-5",
  "chart-6": "--sheen-chart-6",
  "chart-7": "--sheen-chart-7",
  "chart-8": "--sheen-chart-8",
  "market-up": "--sheen-color-market-up",
  "market-down": "--sheen-color-market-down",
  "market-flat": "--sheen-color-market-flat",
  accent: "--sheen-color-accent",
});
const annotationTones = new Set(["neutral", "accent", "success", "warning", "danger"]);

interface StaticPath {
  readonly key: string;
  readonly color: ChartColorToken;
  readonly encoding: ChartSeriesEncoding;
  readonly d: string;
  readonly visible: boolean;
}

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`TimeSeries ${name} must be nonempty`);
  return value;
}

function chartHeight(value: number): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error("TimeSeries height must be a positive finite number");
  return value;
}

function validateAnnotations(input: readonly ChartAnnotation[] | undefined): readonly ChartAnnotation[] {
  if (input === undefined) return Object.freeze([]);
  if (!Array.isArray(input)) throw new Error("TimeSeries annotations must be an array");
  return Object.freeze(input.map((annotation, index) => {
    if (!Number.isFinite(annotation.x)) throw new Error(`TimeSeries annotation ${index} x must be finite`);
    if (typeof annotation.label !== "string" || !annotation.label.trim()) throw new Error(`TimeSeries annotation ${index} label must be nonempty`);
    if (annotation.tone !== undefined && !annotationTones.has(annotation.tone)) throw new Error(`TimeSeries annotation ${index} tone is unsupported`);
    return Object.freeze({ x: annotation.x, label: annotation.label, ...(annotation.tone === undefined ? {} : { tone: annotation.tone }) });
  }));
}

function annotationPercent(data: ChartData, x: number): number {
  const first = data.t[0];
  const last = data.t[data.t.length - 1];
  if (first === undefined || last === undefined || first === last) return 50;
  return Math.max(0, Math.min(100, ((x - first) / (last - first)) * 100));
}

function coordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function staticPaths(data: ChartData, series: readonly ChartSeries[], visible: readonly boolean[]): readonly StaticPath[] {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const definition = series[seriesIndex];
    if (definition === undefined || !visible[seriesIndex]) continue;
    const column = data[definition.key];
    if (!column) continue;
    const analysis = chartColumnAnalysis(column, definition.key);
    minimum = Math.min(minimum, analysis.minimum);
    maximum = Math.max(maximum, analysis.maximum);
  }
  if (minimum === Number.POSITIVE_INFINITY) return Object.freeze([]);
  const firstTime = data.t[0] ?? 0;
  const lastTime = data.t[data.t.length - 1] ?? firstTime;
  const timeRange = lastTime - firstTime;
  const valueRange = maximum - minimum;
  const paths: StaticPath[] = [];
  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const definition = series[seriesIndex];
    if (definition === undefined) continue;
    const column = data[definition.key];
    if (!column) continue;
    const commands: string[] = [];
    const stride = Math.max(1, Math.ceil(column.length / 512));
    const analysis = chartColumnAnalysis(column, definition.key);
    for (const [start, end] of analysis.segments) {
      let lastWritten = -1;
      for (let index = start; index <= end; index += stride) {
        const value = column[index];
        const timestamp = data.t[index];
        if (value === undefined || timestamp === undefined) continue;
        const x = timeRange === 0 ? 50 : ((timestamp - firstTime) / timeRange) * 100;
        const y = valueRange === 0 ? 50 : ((maximum - value) / valueRange) * 100;
        commands.push(`${index === start ? "M" : "L"}${coordinate(x)} ${coordinate(y)}`);
        lastWritten = index;
      }
      if (lastWritten !== end) {
        const value = column[end];
        const timestamp = data.t[end];
        if (value !== undefined && timestamp !== undefined) {
          const x = timeRange === 0 ? 50 : ((timestamp - firstTime) / timeRange) * 100;
          const y = valueRange === 0 ? 50 : ((maximum - value) / valueRange) * 100;
          commands.push(`${lastWritten < 0 ? "M" : "L"}${coordinate(x)} ${coordinate(y)}`);
        }
      }
    }
    paths.push(Object.freeze({ key: definition.key, color: definition.color, encoding: resolveChartSeriesEncoding(definition, seriesIndex), d: commands.join(" "), visible: visible[seriesIndex] ?? false }));
  }
  return Object.freeze(paths);
}

function uPlotColumn(column: Float64Array, key: string): Float64Array | (number | null)[] {
  if (!chartColumnAnalysis(column, key).hasGap) return column;
  return Array.from(column, value => Number.isNaN(value) ? null : value);
}

function alignedData(data: ChartData, series: readonly ChartSeries[]): uPlot.AlignedData {
  const output: [Float64Array, ...(Float64Array | (number | null)[])[]] = [data.t];
  for (const definition of series) {
    const column = data[definition.key];
    if (!column) throw new Error(`TimeSeries data is missing series ${definition.key}`);
    output.push(uPlotColumn(column, definition.key));
  }
  return output;
}

function color(values: ThemeTokenValues, name: ThemeTokenName, fallback: string): string {
  return values[name] || fallback;
}

function lineWidth(values: ThemeTokenValues): number {
  const parsed = Number.parseFloat(values["--sheen-chart-line-width"] ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.5;
}

function chartSeries(definitions: readonly ChartSeries[], visible: readonly boolean[], values: () => ThemeTokenValues): uPlot.Series[] {
  return [
    {},
    ...definitions.map((definition, index) => ({
      label: definition.label,
      show: visible[index] ?? false,
      spanGaps: false,
      stroke: () => color(values(), tokenByColor[definition.color], "#ffffff"),
      width: lineWidth(values()),
      dash: seriesDash(resolveChartSeriesEncoding(definition, index)),
      points: { show: false },
    })),
  ];
}

function seriesDash(encoding: ChartSeriesEncoding): number[] {
  if (encoding === "dashed") return [7, 4];
  if (encoding === "dotted") return [2, 4];
  if (encoding === "dash-dot") return [9, 3, 2, 3];
  return [];
}

function axes(props: TimeSeriesProps, values: () => ThemeTokenValues, locale: string): uPlot.Axis[] {
  const formatters = createChartTableFormatters(locale, props.x, props.y);
  const formatAxis = createChartAxisFormatter(locale, props.x);
  const fontSize = values()["--sheen-text-caption-size"] || "11px";
  const fontWeight = values()["--sheen-text-caption-weight"] || "400";
  const fontFamily = values()["--sheen-font-sans"] || "system-ui";
  const font = `${fontWeight} ${fontSize} ${fontFamily}`;
  return [
    {
      label: props.xLabel,
      stroke: () => color(values(), "--sheen-chart-axis", "#ffffff"),
      font,
      labelFont: font,
      space: 64,
      values: (_plot, splits, _axisIndex, _foundSpace, increment) => splits.map(value => formatAxis(value, increment)),
      grid: { show: false },
      ticks: { show: false },
      border: { show: false },
    },
    {
      stroke: () => color(values(), "--sheen-chart-axis", "#ffffff"),
      font,
      labelFont: font,
      values: (_plot, splits) => splits.map(formatters.value),
      grid: { show: true, stroke: () => color(values(), "--sheen-chart-grid", "rgba(255, 255, 255, 0.08)"), width: 1 },
      ticks: { show: false },
      border: { show: false },
    },
  ];
}

function scales(props: TimeSeriesProps): uPlot.Scales {
  return props.y?.zero
    ? { x: { time: true }, y: { range: [0, null] } }
    : { x: { time: true }, y: {} };
}

interface TimeSeriesLifecycle {
  readonly cursor: (plot: uPlot) => void;
  readonly draw: (plot: uPlot) => void;
  readonly scale: (plot: uPlot, key: string) => void;
  readonly ready: (plot: uPlot) => void;
}

function options(props: TimeSeriesProps, definitions: readonly ChartSeries[], visible: readonly boolean[], values: () => ThemeTokenValues, locale: string, width: number, height: number, lifecycle: TimeSeriesLifecycle): uPlot.Options {
  return {
    ...props.__unsafe_uplot,
    width,
    height,
    ms: 1,
    series: chartSeries(definitions, visible, values),
    scales: scales(props),
    axes: axes(props, values, locale),
    legend: { show: false },
    cursor: {
      show: props.tooltip !== false,
      x: true,
      y: false,
      points: {
        stroke: () => color(values(), "--sheen-chart-crosshair", "#ffffff"),
        fill: () => color(values(), "--sheen-chart-crosshair", "#ffffff"),
      },
      drag: { x: true, y: false, setScale: true },
      ...(props.cursor?.sync ? { sync: { key: props.cursor.sync } } : {}),
    },
    hooks: {
      setCursor: [lifecycle.cursor],
      draw: [lifecycle.draw],
      setScale: [lifecycle.scale],
      ready: [lifecycle.ready],
    },
  };
}

export function TimeSeries(props: TimeSeriesProps): JSX.Element {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const tokens = useThemeTokens(tokenNames);
  const definitions = createMemo(() => defineSeries(props.series));
  const visibility = createSeriesVisibility(definitions);
  const data = createMemo(() => validateColumnar(props.data, definitions()));
  const height = createMemo(() => chartHeight(props.height));
  const label = createMemo(() => requiredText(props.label, "label"));
  const summary = createMemo(() => requiredText(props.summary, "summary"));
  const xLabel = createMemo(() => requiredText(props.xLabel, "xLabel"));
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const formatters = createMemo(() => createChartTableFormatters(locale(), props.x, props.y));
  const annotations = createMemo(() => validateAnnotations(props.annotations));
  const [enhanced, setEnhanced] = createSignal(false);
  const [rendererPending, setRendererPending] = createSignal(false);
  let fallbackSnapshot: readonly StaticPath[] | undefined;
  const fallback = createMemo(() => {
    if (enhanced() && fallbackSnapshot !== undefined) return fallbackSnapshot;
    fallbackSnapshot = staticPaths(data(), definitions(), visibility.values());
    return fallbackSnapshot;
  });
  const zoomAvailable = createMemo(() => data().t.length > 1);
  const summaryId = createUniqueId();
  const instructionId = createUniqueId();
  const configuration = createMemo(() => JSON.stringify({
    series: definitions().map(definition => ({ key: definition.key, label: definition.label, color: definition.color })),
    x: props.x,
    y: props.y,
    xLabel: xLabel(),
    cursor: props.cursor,
    tooltip: props.tooltip,
    locale: locale(),
  }));
  const [zoomed, setZoomed] = createSignal(false);
  let plotHost: HTMLDivElement | undefined;
  let tooltip: HTMLDivElement | undefined;
  let tooltipTimestamp: HTMLDivElement | undefined;
  let keyboardStatus: HTMLDivElement | undefined;
  const tooltipRowElements = new Map<string, HTMLLIElement>();
  const tooltipValueElements = new Map<string, HTMLSpanElement>();
  const annotationElements: SVGGElement[] = [];
  let plot: uPlot | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let resizeFrame: number | undefined;
  let initializationFrame: number | undefined;
  let rendererFrame: number | undefined;
  let pendingRendererUpdate: { readonly data: ChartData; readonly definitions: readonly ChartSeries[] } | undefined;
  let currentTokens: ThemeTokenValues = Object.freeze({});
  let currentConfiguration: string | undefined;
  let currentRendererSource: ChartData | undefined;
  let currentRendererData: ChartData | undefined;
  let currentRendererKeys = "";
  let plotReady = false;
  let suppressScale = false;
  let announceCursor = false;
  let keyboardIndex = -1;

  function fullRange(): readonly [number, number] | undefined {
    const current = data();
    const minimum = current.t[0];
    const maximum = current.t[current.t.length - 1];
    return minimum === undefined || maximum === undefined || minimum === maximum ? undefined : [minimum, maximum];
  }

  function hideTooltip(): void {
    if (tooltip) {
      tooltip.hidden = true;
      tooltip.dataset.index = "";
    }
  }

  function updateTooltip(current: uPlot): void {
    const rendererIndex = current.cursor.idx;
    const left = current.cursor.left;
    const xColumn = current.data[0];
    const rendererTimestamp = rendererIndex === null || rendererIndex === undefined ? undefined : xColumn?.[rendererIndex];
    const source = data();
    const index = announceCursor && keyboardIndex >= 0
      ? keyboardIndex
      : typeof rendererTimestamp === "number" ? sourceIndexAtTimestamp(source.t, rendererTimestamp) : undefined;
    const timestamp = index === undefined ? undefined : source.t[index];
    if (props.tooltip === false || index === undefined || typeof left !== "number" || left < 0 || typeof timestamp !== "number") {
      hideTooltip();
      announceCursor = false;
      return;
    }
    const formattedTimestamp = formatters().x(timestamp);
    if (tooltipTimestamp) tooltipTimestamp.textContent = formattedTimestamp;
    const status = [formattedTimestamp];
    const visible = visibility.values();
    const resolvedDefinitions = definitions();
    for (let seriesIndex = 0; seriesIndex < resolvedDefinitions.length; seriesIndex++) {
      const definition = resolvedDefinitions[seriesIndex];
      if (definition === undefined) continue;
      const row = tooltipRowElements.get(definition.key);
      const valueElement = tooltipValueElements.get(definition.key);
      const raw = source[definition.key]?.[index];
      const missing = typeof raw !== "number" || Number.isNaN(raw);
      const formatted = missing ? "—" : formatters().value(raw);
      if (row) row.hidden = !(visible[seriesIndex] ?? false);
      if (valueElement) valueElement.textContent = formatted;
      if (visible[seriesIndex]) status.push(`${definition.label}: ${missing ? messages().missingValue : formatted}`);
    }
    if (tooltip) {
      tooltip.hidden = false;
      tooltip.dataset.index = String(index);
      tooltip.dataset.side = left > current.over.clientWidth / 2 ? "start" : "end";
      tooltip.style.setProperty("--sheen-chart-tooltip-x", `${current.over.offsetLeft + left}px`);
      const updates = Number.parseInt(tooltip.dataset.updates ?? "0", 10);
      tooltip.dataset.updates = String(Number.isFinite(updates) ? updates + 1 : 1);
    }
    if (announceCursor && keyboardStatus) keyboardStatus.textContent = status.join(", ");
    announceCursor = false;
  }

  function updateAnnotations(current: uPlot): void {
    const scale = current.scales.x;
    const minimum = scale?.min;
    const maximum = scale?.max;
    const resolved = annotations();
    for (let index = 0; index < resolved.length; index++) {
      const annotation = resolved[index];
      const group = annotationElements[index];
      if (annotation === undefined || group === undefined) continue;
      const visible = minimum !== undefined && maximum !== undefined && annotation.x >= minimum && annotation.x <= maximum;
      group.style.display = visible ? "" : "none";
      if (!visible) continue;
      const position = current.over.offsetLeft + current.valToPos(annotation.x, "x");
      const line = group.querySelector<SVGLineElement>("line");
      const text = group.querySelector<SVGTextElement>("text");
      line?.setAttribute("x1", String(position));
      line?.setAttribute("x2", String(position));
      line?.setAttribute("y1", String(current.over.offsetTop));
      line?.setAttribute("y2", String(current.over.offsetTop + current.over.clientHeight));
      text?.setAttribute("x", String(position + 4));
      text?.setAttribute("y", String(current.over.offsetTop + 12));
    }
  }

  function updateZoom(current: uPlot, key: string): void {
    updateAnnotations(current);
    if (key !== "x" || !plotReady || suppressScale) return;
    const minimum = current.scales.x?.min;
    const maximum = current.scales.x?.max;
    const full = fullRange();
    if (minimum === undefined || maximum === undefined || full === undefined) return;
    const tolerance = Math.max(1, Math.abs(full[1] - full[0]) * 0.000001);
    const next = Math.abs(minimum - full[0]) > tolerance || Math.abs(maximum - full[1]) > tolerance;
    setZoomed(next);
    const range: readonly [number, number] = [minimum, maximum];
    props.onZoom?.(next ? range : null);
  }

  const lifecycle: TimeSeriesLifecycle = Object.freeze({
    cursor: updateTooltip,
    draw: updateAnnotations,
    scale: updateZoom,
    ready: (current: uPlot) => {
      plotReady = true;
      updateAnnotations(current);
    },
  });

  function measuredWidth(): number {
    return Math.max(1, Math.floor(plotHost?.getBoundingClientRect().width ?? 1));
  }

  function resolveRendererData(source: ChartData, resolvedDefinitions: readonly ChartSeries[]): ChartData {
    const keys = resolvedDefinitions.map(definition => definition.key).join("\u0000");
    if (currentRendererSource !== source || currentRendererKeys !== keys || currentRendererData === undefined) {
      currentRendererSource = source;
      currentRendererKeys = keys;
      currentRendererData = downsampleTimeSeriesRendererData(source, resolvedDefinitions);
    }
    return currentRendererData;
  }

  function disposePlot(): void {
    if (initializationFrame !== undefined) window.cancelAnimationFrame(initializationFrame);
    initializationFrame = undefined;
    if (rendererFrame !== undefined) window.cancelAnimationFrame(rendererFrame);
    rendererFrame = undefined;
    pendingRendererUpdate = undefined;
    if (resizeFrame !== undefined) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = undefined;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    plot?.destroy();
    plot = undefined;
    plotReady = false;
    keyboardIndex = -1;
    hideTooltip();
    setRendererPending(false);
    setEnhanced(false);
    setZoomed(false);
  }

  function scheduleInitialization(): void {
    if (initializationFrame !== undefined) return;
    initializationFrame = window.requestAnimationFrame(() => {
      initializationFrame = undefined;
      if (plot || !plotHost || !currentTokens["--sheen-chart-axis"] || !currentTokens["--sheen-chart-1"]) return;
      const preparedDefinitions = untrack(definitions);
      const preparedSource = untrack(data);
      const preparedConfiguration = untrack(configuration);
      const preparedData = alignedData(resolveRendererData(preparedSource, preparedDefinitions), preparedDefinitions);
      initializationFrame = window.requestAnimationFrame(() => {
        initializationFrame = undefined;
        if (plot || !plotHost || !currentTokens["--sheen-chart-axis"] || !currentTokens["--sheen-chart-1"]) return;
        if (preparedDefinitions !== untrack(definitions) || preparedSource !== untrack(data) || preparedConfiguration !== untrack(configuration)) {
          scheduleInitialization();
          return;
        }
        currentConfiguration = preparedConfiguration;
        plot = new uPlot(options(props, preparedDefinitions, untrack(visibility.values), () => currentTokens, locale(), measuredWidth(), height(), lifecycle), preparedData, plotHost);
        resizeObserver = new ResizeObserver(scheduleResize);
        resizeObserver.observe(plotHost);
        setEnhanced(true);
      });
    });
  }

  function scheduleRendererUpdate(): void {
    if (rendererFrame !== undefined) return;
    setRendererPending(true);
    rendererFrame = window.requestAnimationFrame(() => {
      rendererFrame = undefined;
      const current = plot;
      const update = pendingRendererUpdate;
      pendingRendererUpdate = undefined;
      if (!current || !update) {
        setRendererPending(false);
        return;
      }
      suppressScale = true;
      current.batch(() => current.setData(alignedData(resolveRendererData(update.data, update.definitions), update.definitions), !zoomed()), true);
      suppressScale = false;
      if (keyboardIndex >= update.data.t.length) keyboardIndex = update.data.t.length - 1;
      setRendererPending(false);
    });
  }

  function scheduleResize(): void {
    if (resizeFrame !== undefined) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = undefined;
      const nextWidth = measuredWidth();
      if (plot && (plot.width !== nextWidth || plot.height !== height())) plot.setSize({ width: nextWidth, height: height() });
    });
  }

  function resetZoom(): void {
    const range = fullRange();
    if (!plot || range === undefined) return;
    plot.setScale("x", { min: range[0], max: range[1] });
  }

  function zoomBy(factor: number): void {
    const range = fullRange();
    const minimum = plot?.scales.x?.min;
    const maximum = plot?.scales.x?.max;
    if (!plot || range === undefined || minimum === undefined || maximum === undefined) return;
    const fullSpan = range[1] - range[0];
    const span = Math.min(fullSpan, (maximum - minimum) * factor);
    let nextMinimum = (minimum + maximum - span) / 2;
    let nextMaximum = nextMinimum + span;
    if (nextMinimum < range[0]) {
      nextMinimum = range[0];
      nextMaximum = range[0] + span;
    }
    if (nextMaximum > range[1]) {
      nextMaximum = range[1];
      nextMinimum = range[1] - span;
    }
    plot.setScale("x", { min: nextMinimum, max: nextMaximum });
  }

  function visibleBounds(): readonly [number, number] | undefined {
    const values = data().t;
    if (values.length === 0) return undefined;
    const minimum = plot?.scales.x?.min ?? values[0];
    const maximum = plot?.scales.x?.max ?? values[values.length - 1];
    if (minimum === undefined || maximum === undefined) return undefined;
    let low = 0;
    let high = values.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if ((values[middle] ?? minimum) < minimum) low = middle + 1;
      else high = middle;
    }
    const first = Math.min(values.length - 1, low);
    low = first;
    high = values.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if ((values[middle] ?? maximum) <= maximum) low = middle + 1;
      else high = middle;
    }
    const last = Math.max(first, low - 1);
    return [first, last];
  }

  function inspectIndex(index: number): void {
    const current = plot;
    const timestamp = data().t[index];
    if (!current || timestamp === undefined) return;
    keyboardIndex = index;
    announceCursor = true;
    current.setCursor({ left: current.valToPos(timestamp, "x"), top: current.over.clientHeight / 2 });
  }

  function handlePlotKeyDown(event: KeyboardEvent): void {
    const bounds = visibleBounds();
    if (!plot || bounds === undefined) return;
    if (event.key === "Escape") {
      event.preventDefault();
      keyboardIndex = -1;
      if (keyboardStatus) keyboardStatus.textContent = "";
      plot.setCursor({ left: -10, top: -10 });
      hideTooltip();
      return;
    }
    let next: number | undefined;
    if (event.key === "Home") next = bounds[0];
    else if (event.key === "End") next = bounds[1];
    else if (event.key === "ArrowRight") next = keyboardIndex < bounds[0] ? bounds[0] : Math.min(bounds[1], keyboardIndex + 1);
    else if (event.key === "ArrowLeft") next = keyboardIndex > bounds[1] || keyboardIndex < 0 ? bounds[1] : Math.max(bounds[0], keyboardIndex - 1);
    if (next === undefined) return;
    event.preventDefault();
    inspectIndex(next);
  }

  onMount(() => {
    createEffect(() => {
      const values = tokens();
      const nextConfiguration = configuration();
      currentTokens = values;
      if (!plotHost || !values["--sheen-chart-axis"] || !values["--sheen-chart-1"]) return;
      if (!plot) {
        scheduleInitialization();
        return;
      }
      if (currentConfiguration !== nextConfiguration) {
        disposePlot();
        scheduleInitialization();
        return;
      }
      const fontSize = values["--sheen-text-caption-size"] || "11px";
      const fontWeight = values["--sheen-text-caption-weight"] || "400";
      const fontFamily = values["--sheen-font-sans"] || "system-ui";
      const font = `${fontWeight} ${fontSize} ${fontFamily}`;
      let fontChanged = false;
      for (const axis of plot.axes) {
        fontChanged = fontChanged || axis.font !== font || axis.labelFont !== font;
        axis.font = font;
        axis.labelFont = font;
      }
      const width = lineWidth(values);
      let widthChanged = false;
      for (let index = 1; index < plot.series.length; index++) {
        const series = plot.series[index];
        if (series) {
          widthChanged = widthChanged || series.width !== width;
          series.width = width;
        }
      }
      plot.redraw(widthChanged, fontChanged);
    });
    createEffect(() => {
      const resolvedDefinitions = definitions();
      const resolvedData = data();
      if (!plot) return;
      pendingRendererUpdate = Object.freeze({ data: resolvedData, definitions: resolvedDefinitions });
      scheduleRendererUpdate();
    });
    createEffect(() => {
      const resolvedVisibility = visibility.values();
      const current = plot;
      if (!current) return;
      current.batch(() => {
        for (let index = 0; index < resolvedVisibility.length; index++) current.setSeries(index + 1, { show: resolvedVisibility[index] ?? false }, false);
      }, true);
      if (!tooltip?.hidden) updateTooltip(current);
    });
    createEffect(() => {
      height();
      scheduleResize();
    });
    createEffect(() => {
      annotations();
      if (plot) updateAnnotations(plot);
    });
    onCleanup(disposePlot);
  });

  return <figure class={cn("sheen-time-series", props.class)} aria-busy={props.loading || rendererPending() || undefined} data-enhanced={enhanced() || undefined} data-zoomed={zoomed() || undefined}>
    <figcaption class="sheen-chart-caption"><span class="sheen-chart-title">{label()}</span><span id={summaryId} class="sheen-chart-summary">{summary()}</span></figcaption>
    <div ref={plotHost} class="sheen-time-series-plot" role="img" aria-label={label()} aria-describedby={`${summaryId} ${instructionId}`}
      aria-keyshortcuts={props.tooltip === false ? undefined : "ArrowLeft ArrowRight Home End Escape"} tabIndex={props.tooltip === false ? undefined : 0}
      onKeyDown={handlePlotKeyDown} onDblClick={event => { event.preventDefault(); resetZoom(); }} style={{ height: `${height()}px` }}>
      <svg class="sheen-time-series-fallback" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="sheen-chart-fallback-grid" d="M0 25H100M0 50H100M0 75H100" vector-effect="non-scaling-stroke" />
        <Index each={fallback()}>{path => <path class="sheen-chart-fallback-line" data-hidden={!path().visible || undefined} data-color={path().color} data-encoding={path().encoding} data-series={path().key} d={path().d} vector-effect="non-scaling-stroke" />}</Index>
        <g class="sheen-chart-annotations"><Index each={annotations()}>{annotation => <g class="sheen-chart-annotation" data-tone={annotation().tone ?? "neutral"} transform={`translate(${annotationPercent(data(), annotation().x)} 0)`}>
          <line x1="0" x2="0" y1="2" y2="98" vector-effect="non-scaling-stroke" /><text x="1" y="7">{annotation().label}</text>
        </g>}</Index></g>
      </svg>
      <svg class="sheen-time-series-annotations" aria-hidden="true"><Index each={annotations()}>{(annotation, index) => <g ref={element => { annotationElements[index] = element; }} class="sheen-chart-annotation" data-tone={annotation().tone ?? "neutral"}>
        <line vector-effect="non-scaling-stroke" /><text>{annotation().label}</text>
      </g>}</Index></svg>
      <div ref={tooltip} class="sheen-chart-tooltip" hidden aria-hidden="true">
        <div ref={tooltipTimestamp} class="sheen-chart-tooltip-domain" />
        <ul><Index each={definitions()}>{(series, index) => <li ref={element => { tooltipRowElements.set(series().key, element); }}>
          <span class="sheen-chart-legend-marker" data-color={series().color} data-encoding={resolveChartSeriesEncoding(series(), index)} aria-hidden="true" /><span>{series().label}</span>
          <span ref={element => { tooltipValueElements.set(series().key, element); }} class="sheen-chart-tooltip-value" />
        </li>}</Index></ul>
      </div>
      <div ref={keyboardStatus} class="sheen-chart-visually-hidden" aria-live="polite" />
      <span id={instructionId} class="sheen-chart-visually-hidden">{messages().keyboardInstructions}</span>
      <Show when={data().t.length === 0}><div class="sheen-chart-empty">{props.empty ?? theme.messages().empty}</div></Show>
    </div>
    <div class="sheen-chart-zoom-controls" role="toolbar" aria-label={messages().zoomControls}>
      <button type="button" disabled={!zoomAvailable()} onClick={() => zoomBy(0.5)}>{messages().zoomIn}</button>
      <button type="button" disabled={!zoomed()} onClick={() => zoomBy(2)}>{messages().zoomOut}</button>
      <button type="button" disabled={!zoomed()} onClick={resetZoom}>{messages().resetZoom}</button>
    </div>
    <ChartLegend series={definitions()} layout={props.legend} visible={visibility.values()} onToggle={visibility.toggle} />
    <ChartDataTable label={label()} summary={summary()} xLabel={xLabel()} series={definitions()} data={data()} x={props.x}
      {...(props.y === undefined ? {} : { y: props.y })}
      {...(props.table?.pageSize === undefined ? {} : { pageSize: props.table.pageSize })}
      {...(props.table?.viewLabel === undefined ? {} : { viewLabel: props.table.viewLabel })}
      {...(props.loading === undefined ? {} : { loading: props.loading })} />
  </figure>;
}
