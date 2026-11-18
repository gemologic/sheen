import { instruments, midPrice } from "./market.ts";
import type { Side } from "./orders.ts";
import { hash32, unit } from "./prng.ts";

/**
 * Simulated desk order flow, a pure function of UTC time like the rest of the market. A fixed pool of order slots
 * keeps row identity stable: each slot works one parent order at a time and recycles into a new one when its
 * lifetime ends, so the analysis table stays bounded while every tick changes fills and marks. It is a type alias,
 * not an interface, so rows are assignable to Perspective's `Record<string, unknown>` input.
 */
export type FlowOrder = {
  readonly id: string;
  readonly symbol: string;
  readonly venue: string;
  readonly side: Side;
  readonly status: "Working" | "Filled" | "Halted";
  readonly quantity: number;
  readonly filled: number;
  /** Mark price, or null while the instrument is halted. */
  readonly price: number | null;
  /** Filled quantity marked at the live price, or null while halted. */
  readonly notional: number | null;
  readonly updated: number;
};

export const FLOW_SLOTS = 240;
const LIFETIME_MS = 24_000;

export function orderFlow(at: number): readonly FlowOrder[] {
  const rows: FlowOrder[] = [];
  for (let slot = 0; slot < FLOW_SLOTS; slot++) {
    const elapsed = at + (hash32(0xf10, slot) % LIFETIME_MS);
    const generation = Math.floor(elapsed / LIFETIME_MS);
    const instrument = instruments[hash32(0xf11 + slot, generation) % instruments.length];
    if (!instrument) continue;
    const quantity = 100 * (1 + (hash32(0xf12 + slot, generation) % 50));
    const fillTime = LIFETIME_MS * (0.35 + 0.6 * unit(0xf13 + slot, generation));
    const progress = Math.min(1, (elapsed - generation * LIFETIME_MS) / fillTime);
    const filled = Math.floor((quantity * progress) / 10) * 10;
    const price = midPrice(instrument, at);
    const halted = !Number.isFinite(price);
    rows.push({
      id: `flow-${String(slot).padStart(3, "0")}`,
      symbol: instrument.symbol,
      venue: instrument.venue,
      side: unit(0xf14 + slot, generation) < 0.5 ? "Buy" : "Sell",
      status: halted ? "Halted" : filled >= quantity ? "Filled" : "Working",
      quantity,
      filled,
      price: halted ? null : price,
      notional: halted ? null : filled * price,
      updated: at,
    });
  }
  return rows;
}
