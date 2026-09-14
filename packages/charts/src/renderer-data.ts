import type { ChartData, ChartSeries } from "./chart-types.ts";

const maximumSourcePoints = 8_192;
const bucketCount = 1_024;

/** Bound canvas work while retaining each pixel-scale bucket's shape and gap signal. */
export function downsampleTimeSeriesRendererData(data: ChartData, series: readonly ChartSeries[]): ChartData {
  if (data.t.length <= maximumSourcePoints) return data;
  const columns = series.map(definition => {
    const column = data[definition.key];
    if (!column) throw new Error(`TimeSeries data is missing series ${definition.key}`);
    return { key: definition.key, column };
  });
  const indices = new Set<number>();
  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = Math.floor(bucket * data.t.length / bucketCount);
    const end = Math.floor((bucket + 1) * data.t.length / bucketCount);
    if (start >= end) continue;
    indices.add(start);
    indices.add(end - 1);
    for (let seriesIndex = 0; seriesIndex < columns.length; seriesIndex += 1) {
      const entry = columns[seriesIndex];
      if (!entry) throw new Error(`TimeSeries renderer is missing series at index ${seriesIndex}`);
      const column = entry.column;
      let minimum = Number.POSITIVE_INFINITY;
      let maximum = Number.NEGATIVE_INFINITY;
      let minimumIndex = start;
      let maximumIndex = start;
      let gapIndex: number | undefined;
      for (let index = start; index < end; index += 1) {
        const value = column[index];
        if (value === undefined) continue;
        if (Number.isNaN(value)) {
          gapIndex ??= index;
          continue;
        }
        if (value < minimum) {
          minimum = value;
          minimumIndex = index;
        }
        if (value > maximum) {
          maximum = value;
          maximumIndex = index;
        }
      }
      if (minimum !== Number.POSITIVE_INFINITY) {
        indices.add(minimumIndex);
        indices.add(maximumIndex);
      }
      if (gapIndex !== undefined) {
        indices.add(Math.max(start, gapIndex - 1));
        indices.add(gapIndex);
        indices.add(Math.min(end - 1, gapIndex + 1));
      }
    }
  }
  const ordered = [...indices].sort((left, right) => left - right);
  const t = new Float64Array(ordered.length);
  const output: { readonly t: Float64Array; [key: string]: Float64Array } = { t };
  for (let target = 0; target < ordered.length; target += 1) {
    const source = ordered[target];
    if (source === undefined) continue;
    t[target] = data.t[source] ?? Number.NaN;
  }
  for (const entry of columns) {
    const rendered = new Float64Array(ordered.length);
    output[entry.key] = rendered;
    for (let target = 0; target < ordered.length; target += 1) {
      const source = ordered[target];
      if (source !== undefined) rendered[target] = entry.column[source] ?? Number.NaN;
    }
  }
  return Object.freeze(output);
}

export function sourceIndexAtTimestamp(timestamps: Float64Array, timestamp: number): number | undefined {
  let low = 0;
  let high = timestamps.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const value = timestamps[middle];
    if (value === undefined) return undefined;
    if (value < timestamp) low = middle + 1;
    else high = middle;
  }
  return timestamps[low] === timestamp ? low : undefined;
}
