import { unit } from "./prng.ts";

export const METRIC_INTERVAL_MS = 1_000;
export const METRIC_HISTORY = 300;
const SEED = 0x0b5e;

export interface MetricSample {
  readonly rate: number;
  readonly p50: number;
  readonly p99: number;
  readonly errorRate: number;
}

/** Columnar wire format: UTC epoch milliseconds plus values, with null encoding a collector gap. */
export interface MetricWindow {
  readonly t: readonly number[];
  readonly rate: readonly (number | null)[];
  readonly p50: readonly (number | null)[];
  readonly p99: readonly (number | null)[];
  readonly errorRate: readonly (number | null)[];
}

/** One sample per UTC second. Every 4th two-minute window has a 7-second collector outage reported as a gap. */
export function metricAt(second: number): MetricSample | null {
  const window = Math.floor(second / 120);
  if (unit(SEED, window) < 0.25 && second % 120 >= 40 && second % 120 < 47) return null;
  const phase = (second % 600) / 600 * Math.PI * 2;
  const burst = unit(SEED + 1, Math.floor(second / 30)) > 0.9 ? 1.35 : 1;
  const rate = (1_800 + 420 * Math.sin(phase) + 140 * (unit(SEED + 2, second) - 0.5)) * burst;
  const p50 = 38 + 6 * Math.sin(phase + 1) + 4 * unit(SEED + 3, second) + (burst - 1) * 30;
  const p99 = p50 * (2.6 + unit(SEED + 4, second) * 0.9) + (burst - 1) * 120;
  const errorRate = Math.max(0, 0.002 + 0.0015 * Math.sin(phase * 3) + (burst - 1) * 0.02 + 0.001 * unit(SEED + 5, second));
  return { rate: Math.round(rate), p50: Math.round(p50 * 10) / 10, p99: Math.round(p99 * 10) / 10, errorRate };
}

/** Samples with afterMs < t <= untilMs, bounded to the newest `limit` seconds. */
export function metricWindow(afterMs: number, untilMs: number, limit: number): MetricWindow {
  const last = Math.floor(untilMs / 1_000);
  const first = Math.max(Math.floor(afterMs / 1_000) + 1, last - limit + 1);
  const t: number[] = [];
  const rate: (number | null)[] = [];
  const p50: (number | null)[] = [];
  const p99: (number | null)[] = [];
  const errorRate: (number | null)[] = [];
  for (let second = first; second <= last; second++) {
    const sample = metricAt(second);
    t.push(second * 1_000);
    rate.push(sample?.rate ?? null);
    p50.push(sample?.p50 ?? null);
    p99.push(sample?.p99 ?? null);
    errorRate.push(sample?.errorRate ?? null);
  }
  return { t, rate, p50, p99, errorRate };
}

function numbers(value: unknown): readonly (number | null)[] {
  if (!Array.isArray(value) || !value.every(item => item === null || typeof item === "number")) throw new Error("Invalid metric column");
  return value.map((item: number | null) => item);
}

export function parseMetricWindow(value: unknown): MetricWindow {
  if (typeof value !== "object" || value === null || !("t" in value) || !("rate" in value) || !("p50" in value) || !("p99" in value) || !("errorRate" in value)) throw new Error("Invalid metric window");
  const t = numbers(value.t);
  if (t.some(item => item === null)) throw new Error("Metric timestamps must be numbers");
  const window = { t: t.map(item => item ?? 0), rate: numbers(value.rate), p50: numbers(value.p50), p99: numbers(value.p99), errorRate: numbers(value.errorRate) };
  if ([window.rate, window.p50, window.p99, window.errorRate].some(column => column.length !== window.t.length)) throw new Error("Metric columns must align");
  return window;
}
