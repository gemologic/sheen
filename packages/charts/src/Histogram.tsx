import { createMemo } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "@gemologic/sheen";
import { scaleLinear } from "d3-scale";
import { renderBarChart } from "./BarChart.tsx";
import type { BarChartVariant } from "./BarChart.tsx";
import { defineSeries } from "./chart-types.ts";
import type { ChartCategoricalData, HistogramBinning, HistogramBins, HistogramProps } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";

const maximumBins = 200;
const histogramVariant: BarChartVariant = Object.freeze({ component: "Histogram", class: "sheen-histogram", padding: 0.04 });
const countFormat = Object.freeze({ format: Object.freeze({ maximumFractionDigits: 0 }) });

function explicitEdges(bins: readonly number[]): Float64Array {
  if (bins.length < 2) throw new Error("Histogram explicit bins require at least two edges");
  const edges = Float64Array.from(bins);
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index] ?? Number.NaN;
    if (!Number.isFinite(edge)) throw new Error(`Histogram bin edge ${index} must be finite`);
    if (index > 0 && edge <= (edges[index - 1] ?? edge)) throw new Error("Histogram bin edges must be strictly increasing");
  }
  return edges;
}

function niceEdges(minimum: number, maximum: number, count: number): Float64Array {
  if (minimum === maximum) return Float64Array.of(minimum, maximum);
  const scale = scaleLinear().domain([minimum, maximum]).nice(count);
  const ticks = scale.ticks(count);
  const first = ticks[0] ?? minimum;
  const last = ticks[ticks.length - 1] ?? maximum;
  return Float64Array.from([...(first > minimum ? [minimum] : []), ...ticks, ...(last < maximum ? [maximum] : [])]);
}

/**
 * Deterministically bins finite values. A count requests approximately that many equal-width bins on nice
 * boundaries that cover the data extent; the default count is Sturges' rule, ceil(log2(n) + 1). Explicit edges
 * are used exactly. Bins are half-open except the last, which includes its upper edge. NaN values and values
 * outside explicit edges are reported instead of counted.
 */
export function binValues(values: Float64Array, bins?: HistogramBins): HistogramBinning {
  if (!(values instanceof Float64Array)) throw new Error("Histogram values must be a Float64Array");
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let finite = 0;
  let missing = 0;
  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? Number.NaN;
    if (Number.isNaN(value)) { missing++; continue; }
    if (!Number.isFinite(value)) throw new Error(`Histogram value ${index} must be finite or NaN`);
    finite++;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  let edges: Float64Array;
  if (Array.isArray(bins)) edges = explicitEdges(bins);
  else {
    const count = bins ?? Math.ceil(Math.log2(Math.max(1, finite)) + 1);
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 || count > maximumBins) throw new Error(`Histogram bin count must be an integer from 1 to ${maximumBins}`);
    edges = finite === 0 ? new Float64Array() : niceEdges(minimum, maximum, count);
  }
  const binCount = Math.max(0, edges.length - 1);
  const counts = new Float64Array(edges.length === 2 && edges[0] === edges[1] ? 1 : binCount);
  const first = edges[0] ?? Number.NaN;
  const last = edges[edges.length - 1] ?? Number.NaN;
  let outside = 0;
  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? Number.NaN;
    if (Number.isNaN(value)) continue;
    if (!(value >= first && value <= last)) { outside++; continue; }
    let low = 0;
    let high = counts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if ((edges[middle] ?? Number.POSITIVE_INFINITY) <= value) low = middle;
      else high = middle - 1;
    }
    counts[low] = (counts[low] ?? 0) + 1;
  }
  return Object.freeze({ edges, counts, missing, outside });
}

export function Histogram(props: HistogramProps): JSX.Element {
  const theme = useTheme();
  const series = createMemo(() => defineSeries([{ key: "count", label: props.countLabel, color: props.color ?? "chart-1" }]));
  const data = createMemo((): ChartCategoricalData => {
    const binning = binValues(props.values, props.bins);
    const format = createChartTableFormatters(theme.state().locale, { type: "number" }, props.format === undefined ? undefined : { format: props.format }).value;
    const categories = Array.from(binning.counts, (_count, index) => {
      const start = binning.edges[index] ?? Number.NaN;
      const end = binning.edges[index + 1] ?? start;
      return start === end ? format(start) : `${format(start)}–${format(end)}`;
    });
    if (new Set(categories).size !== categories.length) throw new Error("Histogram bin labels collide; increase the format precision or widen the bins");
    return Object.freeze({ categories: Object.freeze(categories), values: Object.freeze({ count: binning.counts }) });
  });
  return renderBarChart({
    get label() { return props.label; },
    get summary() { return props.summary; },
    get categoryLabel() { return props.valueLabel; },
    get valueLabel() { return props.countLabel; },
    get series() { return series(); },
    get data() { return data(); },
    get height() { return props.height; },
    get tooltip() { return props.tooltip; },
    get empty() { return props.empty; },
    get loading() { return props.loading; },
    get table() { return props.table; },
    get class() { return props.class; },
    y: countFormat,
    legend: false,
  }, histogramVariant);
}
