import { delay, unit } from "./prng.ts";

let serial = 0;

/** Realistic, bounded latency that rejects when the client disconnects. */
export function latency(minimum: number, spread: number, signal: AbortSignal): Promise<void> {
  return delay(minimum + Math.round(unit(0x77d, serial++) * spread), signal);
}

export const noStore = { "cache-control": "no-store" } as const;
