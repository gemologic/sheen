export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const revision = Number(parameters.get("revision") ?? "0");
  const delay = Number(parameters.get("delay") ?? "0");
  if (!Number.isSafeInteger(revision) || revision < 0 || !Number.isSafeInteger(delay) || delay < 0 || delay > 5_000) return new Response("Invalid tree request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  return Response.json({ revision }, { headers: { "cache-control": "no-store" } });
}
