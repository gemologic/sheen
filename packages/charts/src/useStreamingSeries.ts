import { createSignal, getOwner, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";
import { defineSeries, validateColumnar } from "./chart-types.ts";
import type { ChartData, ChartSeries } from "./chart-types.ts";
import { createStreamingBuffer } from "./streaming-buffer.ts";

export interface StreamingSeriesOptions {
  readonly capacity: number;
  readonly interval: number;
  readonly series: readonly ChartSeries[];
  readonly initial?: ChartData;
}

export type StreamingAppendResult =
  | { readonly kind: "accepted" }
  | { readonly kind: "rejected"; readonly reason: "out-of-order" };

export interface StreamingBatchResult {
  readonly accepted: number;
  readonly rejected: number;
}

export interface StreamingSeries {
  readonly data: Accessor<ChartData>;
  readonly size: Accessor<number>;
  readonly dropped: Accessor<number>;
  readonly rejected: Accessor<number>;
  readonly append: (timestamp: number, values: Float64Array) => StreamingAppendResult;
  readonly appendBatch: (data: ChartData) => StreamingBatchResult;
  readonly clear: () => void;
}

const acceptedResult: StreamingAppendResult = Object.freeze({ kind: "accepted" });
const rejectedResult: StreamingAppendResult = Object.freeze({ kind: "rejected", reason: "out-of-order" });

export function useStreamingSeries(options: StreamingSeriesOptions): StreamingSeries {
  if (getOwner() === null) throw new Error("useStreamingSeries must run inside a Solid owner");
  if (!Number.isFinite(options.interval) || options.interval < 0) throw new Error("Streaming interval must be a finite nonnegative number of milliseconds");
  const definitions = defineSeries(options.series);
  const keys = Object.freeze(definitions.map(definition => definition.key));
  const buffer = createStreamingBuffer(options.capacity, keys);
  const scratch = new Float64Array(keys.length);

  if (options.initial !== undefined) {
    const initial = validateColumnar(options.initial, definitions);
    for (let row = 0; row < initial.t.length; row++) {
      for (let seriesIndex = 0; seriesIndex < keys.length; seriesIndex++) {
        const key = keys[seriesIndex];
        scratch[seriesIndex] = key === undefined ? Number.NaN : initial[key]?.[row] ?? Number.NaN;
      }
      buffer.append(initial.t[row] ?? Number.NaN, scratch);
    }
  }

  const initialData = buffer.snapshot();
  buffer.resetCounters();
  const [data, setData] = createSignal<ChartData>(initialData);
  const [size, setSize] = createSignal(buffer.size());
  const [dropped, setDropped] = createSignal(0);
  const [rejected, setRejected] = createSignal(0);
  const browser = typeof window === "undefined" ? undefined : window;
  let disposed = false;
  let dirty = false;
  let frame: number | undefined;
  let timer: number | undefined;
  let lastPublished: number | undefined;

  const publish = (time: number) => {
    frame = undefined;
    if (disposed || !dirty) return;
    dirty = false;
    setData(buffer.snapshot());
    setSize(buffer.size());
    lastPublished = time;
    if (dirty) schedule();
  };

  const requestFrame = () => {
    timer = undefined;
    if (browser === undefined || disposed || frame !== undefined) return;
    frame = browser.requestAnimationFrame(publish);
  };

  function schedule(): void {
    if (browser === undefined || disposed || frame !== undefined || timer !== undefined) return;
    const remaining = lastPublished === undefined ? 0 : Math.max(0, options.interval - (browser.performance.now() - lastPublished));
    if (remaining > 0) timer = browser.setTimeout(requestFrame, remaining);
    else requestFrame();
  }

  const synchronizeCounters = () => {
    setDropped(buffer.dropped());
    setRejected(buffer.rejected());
  };

  const append = (timestamp: number, values: Float64Array): StreamingAppendResult => {
    if (disposed) throw new Error("Cannot append to a disposed streaming series");
    const accepted = buffer.append(timestamp, values);
    synchronizeCounters();
    if (!accepted) return rejectedResult;
    dirty = true;
    schedule();
    return acceptedResult;
  };

  const appendBatch = (next: ChartData): StreamingBatchResult => {
    if (disposed) throw new Error("Cannot append to a disposed streaming series");
    const batch = validateColumnar(next, definitions);
    let accepted = 0;
    let rejectedCount = 0;
    for (let row = 0; row < batch.t.length; row++) {
      for (let seriesIndex = 0; seriesIndex < keys.length; seriesIndex++) {
        const key = keys[seriesIndex];
        scratch[seriesIndex] = key === undefined ? Number.NaN : batch[key]?.[row] ?? Number.NaN;
      }
      if (buffer.append(batch.t[row] ?? Number.NaN, scratch)) accepted += 1;
      else rejectedCount += 1;
    }
    synchronizeCounters();
    if (accepted > 0) {
      dirty = true;
      schedule();
    }
    return Object.freeze({ accepted, rejected: rejectedCount });
  };

  onCleanup(() => {
    disposed = true;
    if (frame !== undefined) browser?.cancelAnimationFrame(frame);
    if (timer !== undefined) browser?.clearTimeout(timer);
  });

  return Object.freeze({
    data,
    size,
    dropped,
    rejected,
    append,
    appendBatch,
    clear: () => {
      if (disposed) throw new Error("Cannot clear a disposed streaming series");
      buffer.clear();
      dirty = true;
      schedule();
    },
  });
}
