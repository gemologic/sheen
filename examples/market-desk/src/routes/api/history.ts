import { latency, noStore } from "../../lib/latency.ts";
import { findInstrument, priceHistory } from "../../lib/market.ts";

/** Two minutes of 4 Hz quotes ending now, with null for halted samples. */
export async function GET(event: { request: Request }): Promise<Response> {
  const instrument = findInstrument(new URL(event.request.url).searchParams.get("symbol") ?? "");
  if (!instrument) return new Response("Unknown instrument", { status: 404 });
  await latency(150, 450, event.request.signal);
  return Response.json(priceHistory(instrument, Date.now()), { headers: noStore });
}
