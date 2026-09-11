import type { APIEvent } from "@solidjs/start/server";

export function GET(event: APIEvent): Response {
  const query = new URL(event.request.url).searchParams.get("query")?.trim() ?? "";
  return Response.json([{ id: "remote-report", label: query ? `Remote ${query} result` : "Remote report" }], { headers: { "cache-control": "no-store" } });
}
