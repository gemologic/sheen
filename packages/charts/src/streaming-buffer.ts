import type { ChartData } from "./chart-types.ts";

interface MutableChartData {
  t: Float64Array;
  [key: string]: Float64Array;
}

function validateTimestamp(timestamp: number): void {
  if (!Number.isFinite(timestamp) || Math.abs(timestamp) > 8_640_000_000_000_000) {
    throw new Error("Streaming sample timestamp must be valid UTC milliseconds");
  }
}

function validateValue(value: number, key: string): void {
  if (!Number.isFinite(value) && !Number.isNaN(value)) throw new Error(`Streaming sample ${key} must be finite or NaN`);
}

export interface StreamingBuffer {
  readonly size: () => number;
  readonly dropped: () => number;
  readonly rejected: () => number;
  readonly append: (timestamp: number, values: Float64Array) => boolean;
  readonly snapshot: () => ChartData;
  readonly clear: () => void;
  readonly resetCounters: () => void;
}

export function createStreamingBuffer(capacity: number, keys: readonly string[]): StreamingBuffer {
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error("Streaming capacity must be a positive safe integer");
  if (!Array.isArray(keys) || keys.length === 0) throw new Error("Streaming series requires at least one key");
  const unique = new Set<string>();
  for (const key of keys) {
    if (typeof key !== "string" || !key || key === "t" || unique.has(key)) throw new Error("Streaming series keys must be unique nonempty identifiers other than t");
    unique.add(key);
  }

  const timestamps = new Float64Array(capacity);
  const columns: Record<string, Float64Array> = {};
  for (const key of keys) columns[key] = new Float64Array(capacity);
  const presented = new Uint8Array(capacity);
  let start = 0;
  let length = 0;
  let lastTimestamp: number | undefined;
  let dropped = 0;
  let rejected = 0;

  const append = (timestamp: number, values: Float64Array): boolean => {
    validateTimestamp(timestamp);
    if (!(values instanceof Float64Array) || values.length !== keys.length) {
      throw new Error(`Streaming sample values must be a Float64Array with ${keys.length} entries`);
    }
    for (let index = 0; index < keys.length; index++) validateValue(values[index] ?? Number.NaN, keys[index] ?? String(index));
    if (lastTimestamp !== undefined && timestamp <= lastTimestamp) {
      rejected += 1;
      return false;
    }

    let slot: number;
    if (length < capacity) {
      slot = (start + length) % capacity;
      length += 1;
    } else {
      slot = start;
      if (presented[slot] === 0) dropped += 1;
      start = (start + 1) % capacity;
    }
    timestamps[slot] = timestamp;
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index];
      const column = key === undefined ? undefined : columns[key];
      if (column === undefined) throw new Error("Streaming series storage is inconsistent");
      column[slot] = values[index] ?? Number.NaN;
    }
    presented[slot] = 0;
    lastTimestamp = timestamp;
    return true;
  };

  const snapshot = (): ChartData => {
    const output: MutableChartData = { t: new Float64Array(length) };
    for (const key of keys) output[key] = new Float64Array(length);
    for (let outputIndex = 0; outputIndex < length; outputIndex++) {
      const slot = (start + outputIndex) % capacity;
      output.t[outputIndex] = timestamps[slot] ?? 0;
      for (const key of keys) {
        const source = columns[key];
        const target = output[key];
        if (source === undefined || target === undefined) throw new Error("Streaming series storage is inconsistent");
        target[outputIndex] = source[slot] ?? Number.NaN;
      }
      presented[slot] = 1;
    }
    return Object.freeze(output);
  };

  return Object.freeze({
    size: () => length,
    dropped: () => dropped,
    rejected: () => rejected,
    append,
    snapshot,
    clear: () => {
      start = 0;
      length = 0;
      lastTimestamp = undefined;
      presented.fill(0);
    },
    resetCounters: () => {
      dropped = 0;
      rejected = 0;
    },
  });
}
