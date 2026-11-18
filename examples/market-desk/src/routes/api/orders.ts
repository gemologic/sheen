import { latency, noStore } from "../../lib/latency.ts";
import { findInstrument, isHalted, quote } from "../../lib/market.ts";
import type { OrderRequest, OrderResponse, PlannedFill } from "../../lib/orders.ts";
import { parseOrderRequest } from "../../lib/orders.ts";
import { hash32 } from "../../lib/prng.ts";

let serial = 0;

function plan(order: OrderRequest, price: number, seed: number): readonly PlannedFill[] {
  const parts = 1 + (seed % 3);
  const fills: PlannedFill[] = [];
  let remaining = order.quantity;
  for (let index = 0; index < parts && remaining > 0; index++) {
    const quantity = index === parts - 1 ? remaining : Math.max(1, Math.floor(order.quantity / parts));
    remaining -= quantity;
    fills.push({ delayMs: 250 + index * (300 + (hash32(seed, index) % 700)), quantity, price });
  }
  return fills;
}

/** Validates against the server's own quote at receipt time and plans deterministic partial fills. */
export async function POST(event: { request: Request }): Promise<Response> {
  let order: OrderRequest;
  try { order = parseOrderRequest(await event.request.json()); } catch { return new Response("Invalid order", { status: 400 }); }
  const instrument = findInstrument(order.symbol);
  if (!instrument) return new Response("Unknown instrument", { status: 404 });
  await latency(120, 380, event.request.signal);
  const now = Date.now();
  const respond = (body: OrderResponse) => Response.json(body, { headers: noStore });
  if (isHalted(instrument, now)) return respond({ kind: "rejected", clientId: order.clientId, reason: `${instrument.symbol} is halted.` });
  if (order.quantity > 50_000) return respond({ kind: "rejected", clientId: order.clientId, reason: "Quantity exceeds the 50,000 share limit." });
  const market = quote(instrument, now);
  const reference = order.side === "Buy" ? market.ask : market.bid;
  if (order.limitPrice !== null && Math.abs(order.limitPrice - reference) / reference > 0.1) return respond({ kind: "rejected", clientId: order.clientId, reason: "Limit price is more than 10% away from the market." });
  const marketable = order.limitPrice === null || (order.side === "Buy" ? order.limitPrice >= reference : order.limitPrice <= reference);
  const id = `ORD-${String(++serial).padStart(5, "0")}`;
  const fills = marketable ? plan(order, order.limitPrice === null ? reference : order.side === "Buy" ? Math.min(order.limitPrice, reference) : Math.max(order.limitPrice, reference), hash32(instrument.seed, serial)) : [];
  return respond({ kind: "accepted", id, clientId: order.clientId, acceptedAt: now, fills });
}
