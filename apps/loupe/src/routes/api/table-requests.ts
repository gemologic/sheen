/** Stateless, bounded transport for request continuity qualification. */
export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const dataset = parameters.get("dataset");
  const revision = Number(parameters.get("revision"));
  const delay = Number(parameters.get("delay"));
  if ((dataset !== "a" && dataset !== "b") || !Number.isSafeInteger(revision) || revision < 0 || !Number.isInteger(delay) || delay < 0 || delay > 1500) return new Response("Invalid table fixture query", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  if (parameters.get("reject") === "true") return new Response("Table request failed", { status: 503 });
  return Response.json({ rows: Array.from({ length: 3 }, (_, index) => ({ id: `${dataset}-${index + 1}`, label: `${dataset}-${index + 1} revision ${revision}` })), total: 3 }, { headers: { "cache-control": "no-store" } });
}
