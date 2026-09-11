/** Bounded, stateless transport fixture for the app-owned optimistic contract. */
export async function POST(event: { request: Request }): Promise<Response> {
  const origin = event.request.headers.get("origin");
  if (origin && origin !== new URL(event.request.url).origin) return new Response("Forbidden origin", { status: 403 });
  let payload: unknown;
  try { payload = await event.request.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }
  if (typeof payload !== "object" || payload === null || !("reject" in payload) || typeof payload.reject !== "boolean") {
    return new Response("Expected a rejection disposition", { status: 400 });
  }
  await new Promise<void>(resolve => setTimeout(resolve, 800));
  if (payload.reject) return new Response("Operation rejected", { status: 409, headers: { "cache-control": "no-store" } });
  return Response.json({ accepted: true }, { headers: { "cache-control": "no-store" } });
}
