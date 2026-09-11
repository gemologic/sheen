import type { SavedViewRecord } from "@gemologic/sheen-table";

const stores = new Map<string, Map<string, SavedViewRecord>>();
const rejectedOnce = new Set<string>();

function requestState(request: Request): { store: Map<string, SavedViewRecord>; reject: boolean } | null {
  const parameters = new URL(request.url).searchParams;
  const session = parameters.get("session") ?? "";
  if (!/^[A-Za-z0-9-]{1,80}$/.test(session)) return null;
  const store = stores.get(session) ?? new Map<string, SavedViewRecord>();
  stores.set(session, store);
  const rejection = parameters.get("reject");
  const reject = rejection === "true" || (rejection === "once" && !rejectedOnce.has(session));
  if (rejection === "once") rejectedOnce.add(session);
  return { store, reject };
}
async function delayed(): Promise<void> { await new Promise<void>(resolve => setTimeout(resolve, 300)); }

export async function GET(event: { request: Request }): Promise<Response> {
  const state = requestState(event.request);
  if (!state) return new Response("Invalid session", { status: 400 });
  await delayed();
  if (state.reject) return new Response("Rejected", { status: 503 });
  return Response.json([...state.store.values()], { headers: { "cache-control": "no-store" } });
}

export async function POST(event: { request: Request }): Promise<Response> {
  const state = requestState(event.request);
  if (!state) return new Response("Invalid session", { status: 400 });
  let value: unknown;
  try { value = await event.request.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }
  if (typeof value !== "object" || value === null || !("id" in value) || (value.id !== null && typeof value.id !== "string") || !("name" in value) || typeof value.name !== "string" || !("state" in value) || typeof value.state !== "string") return new Response("Invalid view", { status: 400 });
  await delayed();
  if (state.reject) return new Response("Rejected", { status: 503 });
  const id = value.id ?? `view-${state.store.size + 1}`;
  const saved = { id, name: value.name, state: value.state };
  state.store.set(id, saved);
  return Response.json(saved, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(event: { request: Request }): Promise<Response> {
  const state = requestState(event.request);
  if (!state) return new Response("Invalid session", { status: 400 });
  const id = await event.request.text();
  if (!id) return new Response("Invalid ID", { status: 400 });
  await delayed();
  if (state.reject) return new Response("Rejected", { status: 503 });
  state.store.delete(id);
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
