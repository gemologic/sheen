import { delay, unit } from "./prng.ts";

let serial = 0;

/** Realistic, bounded, reproducible-per-process latency. Rejects when the client disconnects. */
export function latency(minimum: number, spread: number, signal: AbortSignal): Promise<void> {
  return delay(minimum + Math.round(unit(0x1a7, serial++) * spread), signal);
}

export const noStore = { "cache-control": "no-store" } as const;
