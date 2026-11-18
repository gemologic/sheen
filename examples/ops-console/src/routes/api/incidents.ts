import { findIncident, incidentDetail } from "../../lib/incidents.ts";
import { latency, noStore } from "../../lib/latency.ts";

export async function GET(event: { request: Request }): Promise<Response> {
  const incident = findIncident(new URL(event.request.url).searchParams.get("id") ?? "");
  if (!incident) return new Response("Unknown incident", { status: 404 });
  await latency(300, 600, event.request.signal);
  return Response.json(incidentDetail(incident, Date.now()), { headers: noStore });
}
