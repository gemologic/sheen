import type { JSX } from "solid-js";
import type uPlot from "uplot";

export type ChartColorToken =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "chart-6"
  | "chart-7"
  | "chart-8"
  | "market-up"
  | "market-down"
  | "market-flat"
  | "accent";

export const chartColorTokens: readonly ChartColorToken[] = Object.freeze([
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8",
  "market-up", "market-down", "market-flat", "accent",
]);

export type ChartTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type ChartLegend = false | "inline" | "stacked";
export type ChartValueFormat = "number" | "duration" | "percent" | "bytes";
export type ChartSeriesEncoding = "solid" | "dashed" | "dotted" | "dash-dot";

const seriesEncodings: readonly ChartSeriesEncoding[] = Object.freeze(["solid", "dashed", "dotted", "dash-dot"]);
const seriesEncodingSet: ReadonlySet<string> = new Set(seriesEncodings);

export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  readonly color: ChartColorToken;
  readonly encoding?: ChartSeriesEncoding;
  readonly hidden?: boolean;
}

export function resolveChartSeriesEncoding(series: ChartSeries, index: number): ChartSeriesEncoding {
  return series.encoding ?? seriesEncodings[index % seriesEncodings.length] ?? "solid";
}

export interface ChartTimeAxis {
  readonly type: "time";
  readonly tz?: string;
}

export interface ChartNumberAxis {
  readonly type: "number";
  readonly format?: Intl.NumberFormatOptions;
  readonly zero?: boolean;
}

export interface ChartValueAxis {
  readonly format?: ChartValueFormat | Intl.NumberFormatOptions;
  readonly zero?: boolean;
}

export interface ChartTableOptions {
  readonly pageSize?: number;
  readonly viewLabel?: string;
}

export interface ChartCursorOptions {
  readonly sync?: string;
}

export interface ChartAnnotation {
  readonly x: number;
  readonly label: string;
  readonly tone?: ChartTone;
}

export interface ChartCommonProps {
  readonly label: string;
  readonly summary: string;
  readonly xLabel: string;
  readonly series: readonly ChartSeries[];
  readonly data: ChartData;
  readonly x: ChartTimeAxis | ChartNumberAxis;
  readonly y?: ChartValueAxis;
  readonly height: number;
  readonly legend?: ChartLegend;
  readonly tooltip?: boolean;
  readonly annotations?: readonly ChartAnnotation[];
  readonly empty?: JSX.Element;
  readonly loading?: boolean;
  readonly table?: ChartTableOptions;
  readonly class?: string;
}

export interface TimeSeriesUPlotOptions {
  readonly bands?: uPlot.Band[];
  readonly drawOrder?: uPlot.DrawOrderKey[];
  readonly focus?: uPlot.Focus;
  readonly padding?: uPlot.Padding;
  readonly plugins?: uPlot.Plugin[];
  readonly pxAlign?: boolean | number;
  readonly select?: uPlot.Select;
}

export interface TimeSeriesProps extends ChartCommonProps {
  readonly x: ChartTimeAxis;
  readonly cursor?: ChartCursorOptions;
  readonly onZoom?: (range: readonly [number, number] | null) => void;
  readonly __unsafe_uplot?: TimeSeriesUPlotOptions;
}

export interface LineChartProps extends ChartCommonProps {
  readonly curve?: "linear" | "step";
}

export interface AreaChartProps extends ChartCommonProps {
  readonly curve?: "linear" | "step";
  readonly stacked?: boolean;
}

export interface BarChartProps {
  readonly label: string;
  readonly summary: string;
  readonly categoryLabel: string;
  readonly valueLabel: string;
  readonly series: readonly ChartSeries[];
  readonly data: ChartCategoricalData;
  readonly y?: ChartValueAxis;
  readonly height: number;
  readonly legend?: ChartLegend;
  readonly tooltip?: boolean;
  readonly empty?: JSX.Element;
  readonly loading?: boolean;
  readonly table?: ChartTableOptions;
  readonly class?: string;
  readonly layout?: "vertical" | "horizontal";
  readonly arrangement?: "grouped" | "stacked";
}

export interface SparklineProps {
  readonly values: Float64Array;
  readonly label: string;
  readonly color?: ChartColorToken;
  readonly width?: number;
  readonly height?: number;
}

export type StatTrend = "up" | "down" | "flat";

export interface StatProps {
  readonly label: string;
  readonly value: string | number;
  readonly trend?: StatTrend;
  readonly trendLabel?: string;
  readonly class?: string;
}

export interface StatGroupProps {
  readonly label: string;
  readonly stats: readonly StatProps[];
  readonly class?: string;
}

export interface ChartDataTableProps {
  readonly label: string;
  readonly summary: string;
  readonly xLabel: string;
  readonly series: readonly ChartSeries[];
  readonly data: ChartData;
  readonly x: ChartTimeAxis | ChartNumberAxis;
  readonly y?: ChartValueAxis;
  readonly pageSize?: number;
  readonly viewLabel?: string;
  readonly loading?: boolean;
  readonly class?: string;
}

export interface ChartData {
  readonly t: Float64Array;
  readonly [key: string]: Float64Array;
}

export interface ChartCategoricalData {
  readonly categories: readonly string[];
  readonly values: Readonly<Record<string, Float64Array>>;
}

interface MutableChartData {
  t: Float64Array;
  [key: string]: Float64Array;
}

export interface RowSeries<Row extends object> extends ChartSeries {
  readonly value: (row: Row, index: number) => number;
}

export interface ToColumnarOptions<Row extends object> {
  readonly timestamp: (row: Row, index: number) => number;
  readonly series: readonly RowSeries<Row>[];
}

export interface ToCategoricalOptions<Row extends object> {
  readonly category: (row: Row, index: number) => string;
  readonly series: readonly RowSeries<Row>[];
}

const colorSet: ReadonlySet<string> = new Set(chartColorTokens);
const validatedTimestamps = new WeakSet<Float64Array>();

export interface ChartColumnAnalysis {
  readonly minimum: number;
  readonly maximum: number;
  readonly segments: readonly (readonly [number, number])[];
  readonly hasGap: boolean;
}

const columnAnalyses = new WeakMap<Float64Array, ChartColumnAnalysis>();

function segment(start: number, end: number): readonly [number, number] {
  const value: [number, number] = [start, end];
  return Object.freeze(value);
}

export function chartColumnAnalysis(column: Float64Array, key: string): ChartColumnAnalysis {
  const cached = columnAnalyses.get(column);
  if (cached) return cached;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let start: number | undefined;
  let hasGap = false;
  const segments: (readonly [number, number])[] = [];
  for (let index = 0; index < column.length; index++) {
    const value = column[index] ?? Number.NaN;
    validateValue(value, key, index);
    if (Number.isNaN(value)) {
      hasGap = true;
      if (start !== undefined) segments.push(segment(start, index - 1));
      start = undefined;
      continue;
    }
    if (start === undefined) start = index;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  if (start !== undefined) segments.push(segment(start, column.length - 1));
  const analysis = Object.freeze({ minimum, maximum, segments: Object.freeze(segments), hasGap });
  columnAnalyses.set(column, analysis);
  return analysis;
}

function validateSeriesRecord(series: ChartSeries, index: number, keys: Set<string>): ChartSeries {
  if (typeof series !== "object" || series === null || Array.isArray(series)) throw new Error(`Chart series ${index} must be an object`);
  if (typeof series.key !== "string" || !/^[A-Za-z][A-Za-z0-9_-]*$/u.test(series.key) || series.key === "t" || keys.has(series.key)) throw new Error("Chart series keys must be unique safe identifiers other than t");
  keys.add(series.key);
  if (typeof series.label !== "string" || !series.label.trim()) throw new Error(`Chart series ${series.key} requires a nonempty label`);
  if (!colorSet.has(series.color)) throw new Error(`Chart series ${series.key} has an unsupported color token`);
  if (series.encoding !== undefined && !seriesEncodingSet.has(series.encoding)) throw new Error(`Chart series ${series.key} has an unsupported non-color encoding`);
  if (series.hidden !== undefined && typeof series.hidden !== "boolean") throw new Error(`Chart series ${series.key} hidden must be boolean`);
  return Object.freeze({ key: series.key, label: series.label, color: series.color, ...(series.encoding === undefined ? {} : { encoding: series.encoding }), ...(series.hidden === undefined ? {} : { hidden: series.hidden }) });
}

export function defineSeries(series: readonly ChartSeries[]): readonly ChartSeries[] {
  if (!Array.isArray(series) || series.length === 0) throw new Error("Charts require at least one series");
  const keys = new Set<string>();
  return Object.freeze(series.map((value, index) => validateSeriesRecord(value, index, keys)));
}

function validateTimestamp(value: number, index: number, previous: number | undefined): void {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 8_640_000_000_000_000) throw new Error(`Chart timestamp at row ${index} must be valid UTC milliseconds`);
  if (previous !== undefined && value <= previous) throw new Error(`Chart timestamps must be strictly increasing; row ${index} is duplicate or out of order`);
}

function validateValue(value: number, key: string, index: number): void {
  if (typeof value !== "number" || (!Number.isFinite(value) && !Number.isNaN(value))) throw new Error(`Chart series ${key} row ${index} must be finite or NaN`);
}

export function validateColumnar(data: ChartData, series: readonly ChartSeries[]): ChartData {
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("Chart data must be a columnar object");
  const definitions = defineSeries(series);
  if (!(data.t instanceof Float64Array)) throw new Error("Chart timestamp column t must be a Float64Array");
  if (!validatedTimestamps.has(data.t)) {
    for (let index = 0; index < data.t.length; index++) validateTimestamp(data.t[index] ?? Number.NaN, index, index === 0 ? undefined : data.t[index - 1]);
    validatedTimestamps.add(data.t);
  }
  const expected = new Set(["t", ...definitions.map(definition => definition.key)]);
  for (const key of Object.keys(data)) if (!expected.has(key)) throw new Error(`Chart data has undeclared series column ${key}`);
  for (const definition of definitions) {
    const column = data[definition.key];
    if (!(column instanceof Float64Array)) throw new Error(`Chart series ${definition.key} must be a Float64Array`);
    if (column.length !== data.t.length) throw new Error(`Chart series ${definition.key} length must equal timestamp length ${data.t.length}`);
    chartColumnAnalysis(column, definition.key);
  }
  return data;
}

export function validateCategorical(data: ChartCategoricalData, series: readonly ChartSeries[]): ChartCategoricalData {
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("Categorical chart data must be an object");
  if (!Array.isArray(data.categories)) throw new Error("Categorical chart categories must be an array");
  const definitions = defineSeries(series);
  const categories = new Set<string>();
  for (let index = 0; index < data.categories.length; index++) {
    const category = data.categories[index];
    if (typeof category !== "string" || !category.trim()) throw new Error(`Categorical chart category ${index} must be nonempty text`);
    if (categories.has(category)) throw new Error(`Categorical chart category ${index} duplicates ${category}`);
    categories.add(category);
  }
  if (typeof data.values !== "object" || data.values === null || Array.isArray(data.values)) throw new Error("Categorical chart values must be an object");
  const expected = new Set(definitions.map(definition => definition.key));
  for (const key of Object.keys(data.values)) if (!expected.has(key)) throw new Error(`Categorical chart data has undeclared series column ${key}`);
  for (const definition of definitions) {
    const column = data.values[definition.key];
    if (!(column instanceof Float64Array)) throw new Error(`Categorical chart series ${definition.key} must be a Float64Array`);
    if (column.length !== data.categories.length) throw new Error(`Categorical chart series ${definition.key} length must equal category length ${data.categories.length}`);
    for (let index = 0; index < column.length; index++) validateValue(column[index] ?? Number.NaN, definition.key, index);
  }
  return data;
}

export function toColumnar<Row extends object>(rows: readonly Row[], options: ToColumnarOptions<Row>): ChartData {
  if (!Array.isArray(rows)) throw new Error("toColumnar rows must be an array");
  if (typeof options !== "object" || options === null || typeof options.timestamp !== "function") throw new Error("toColumnar requires a timestamp accessor");
  const definitions = defineSeries(options.series);
  const inputs = options.series.map((input, index) => {
    const definition = definitions[index];
    if (!definition) throw new Error("toColumnar series changed during conversion");
    if (typeof input.value !== "function") throw new Error(`Chart series ${definition.key} requires a value accessor`);
    return Object.freeze({ definition, value: input.value });
  });
  const t = new Float64Array(rows.length);
  const output: MutableChartData = { t };
  for (const definition of definitions) output[definition.key] = new Float64Array(rows.length);
  let previous: number | undefined;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row === undefined) throw new Error(`toColumnar row ${index} is missing`);
    const timestamp = options.timestamp(row, index);
    validateTimestamp(timestamp, index, previous);
    t[index] = timestamp;
    previous = timestamp;
    for (const input of inputs) {
      const { definition } = input;
      const value = input.value(row, index);
      validateValue(value, definition.key, index);
      const column = output[definition.key];
      if (!column) throw new Error(`toColumnar could not allocate series ${definition.key}`);
      column[index] = value;
    }
  }
  return Object.freeze(output);
}

export function toCategorical<Row extends object>(rows: readonly Row[], options: ToCategoricalOptions<Row>): ChartCategoricalData {
  if (!Array.isArray(rows)) throw new Error("toCategorical rows must be an array");
  if (typeof options !== "object" || options === null || typeof options.category !== "function") throw new Error("toCategorical requires a category accessor");
  const definitions = defineSeries(options.series);
  const inputs = options.series.map((input, index) => {
    const definition = definitions[index];
    if (!definition) throw new Error("toCategorical series changed during conversion");
    if (typeof input.value !== "function") throw new Error(`Chart series ${definition.key} requires a value accessor`);
    return Object.freeze({ definition, value: input.value });
  });
  const categories: string[] = [];
  const seen = new Set<string>();
  const values: Record<string, Float64Array> = {};
  for (const definition of definitions) values[definition.key] = new Float64Array(rows.length);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row === undefined) throw new Error(`toCategorical row ${index} is missing`);
    const category = options.category(row, index);
    if (typeof category !== "string" || !category.trim()) throw new Error(`Categorical chart category ${index} must be nonempty text`);
    if (seen.has(category)) throw new Error(`Categorical chart category ${index} duplicates ${category}`);
    categories.push(category);
    seen.add(category);
    for (const input of inputs) {
      const value = input.value(row, index);
      validateValue(value, input.definition.key, index);
      const column = values[input.definition.key];
      if (!column) throw new Error(`toCategorical could not allocate series ${input.definition.key}`);
      column[index] = value;
    }
  }
  return Object.freeze({ categories: Object.freeze(categories), values: Object.freeze(values) });
}
