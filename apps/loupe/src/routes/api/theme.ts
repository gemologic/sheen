import { defaultThemeState, readThemeState } from "@gemologic/sheen";

export async function POST(event: { request: Request }): Promise<Response> {
  const origin = event.request.headers.get("origin");
  if (origin && origin !== new URL(event.request.url).origin) return new Response("Forbidden origin", { status: 403 });
  let value: unknown;
  try { value = await event.request.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }
  const state = readThemeState(value, defaultThemeState);
  const cookie = `sheen=${encodeURIComponent(JSON.stringify(state))}; Path=/; HttpOnly; SameSite=Strict${new URL(event.request.url).protocol === "https:" ? "; Secure" : ""}`;
  return Response.json(state, { headers: { "set-cookie": cookie, "cache-control": "no-store" } });
}
