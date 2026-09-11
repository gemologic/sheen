import plexSansRegular from "@gemologic/sheen-tokens/fonts/IBMPlexSans-Regular.woff2?url";

export async function GET(event: { request: Request }): Promise<Response> {
  const delay = Number(new URL(event.request.url).searchParams.get("delay"));
  if (!Number.isSafeInteger(delay) || delay < 0 || delay > 5_000) return new Response("Invalid font delay", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  const target = new URL(plexSansRegular, event.request.url);
  target.searchParams.set("sheen-font-direct", "true");
  return new Response(null, {
    status: 307,
    headers: { "cache-control": "no-store", location: target.href },
  });
}
