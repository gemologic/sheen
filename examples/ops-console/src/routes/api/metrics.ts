import { latency, noStore } from "../../lib/latency.ts";
import { METRIC_HISTORY, metricWindow } from "../../lib/metrics.ts";

/** Samples strictly after `after` (UTC epoch ms), up to the current second. */
export async function GET(event: { request: Request }): Promise<Response> {
  const after = Number(new URL(event.request.url).searchParams.get("after"));
  if (!Number.isSafeInteger(after) || after < 0) return new Response("Invalid metrics cursor", { status: 400 });
  await latency(80, 260, event.request.signal);
  return Response.json(metricWindow(after, Date.now(), METRIC_HISTORY), { headers: noStore });
}
