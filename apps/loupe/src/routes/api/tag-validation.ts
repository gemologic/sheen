export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const value = parameters.get("value") ?? "";
  const delay = Number(parameters.get("delay") ?? "0");
  if (!value.trim() || !Number.isSafeInteger(delay) || delay < 0 || delay > 5_000) return new Response("Invalid tag validation request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  if (value === "taken") return Response.json({ kind: "rejected", message: "That label is reserved." }, { headers: { "cache-control": "no-store" } });
  if (value === "failure") return new Response("Validation service unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  return Response.json({ kind: "accepted", value: value.toLocaleLowerCase("en-US") }, { headers: { "cache-control": "no-store" } });
}
