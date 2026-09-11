export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const id = parameters.get("id") ?? "";
  const delay = Number(parameters.get("delay") ?? "0");
  const revision = Number(parameters.get("revision") ?? "0");
  if (!/^message-[0-9]+$/u.test(id) || !Number.isSafeInteger(delay) || delay < 0 || delay > 5_000 || !Number.isSafeInteger(revision) || revision < 0) return new Response("Invalid list-detail request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  return Response.json({ id, revision }, { headers: { "cache-control": "no-store" } });
}
