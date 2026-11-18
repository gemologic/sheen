import { latency, noStore } from "../../lib/latency.ts";
import { canViewAccounts, forbidden, requestRole } from "../../lib/session.ts";
import { deleteView, listViews, saveView } from "../../server/accounts-store.ts";

/** Saved account views for the demo user. Persistence is server-side, never localStorage. */
export async function GET(event: { request: Request }): Promise<Response> {
  if (!canViewAccounts(requestRole(event.request))) return forbidden();
  await latency(120, 200, event.request.signal);
  return Response.json(listViews(), { headers: noStore });
}

export async function POST(event: { request: Request }): Promise<Response> {
  if (!canViewAccounts(requestRole(event.request))) return forbidden();
  const body: unknown = await event.request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("name" in body) || typeof body.name !== "string" || !body.name.trim() || !("state" in body) || typeof body.state !== "string"
    || !("id" in body) || (body.id !== null && typeof body.id !== "string")) return new Response("Invalid view", { status: 400 });
  await latency(200, 300, event.request.signal);
  return Response.json(saveView({ id: body.id, name: body.name.trim(), state: body.state }), { headers: noStore });
}

export async function DELETE(event: { request: Request }): Promise<Response> {
  if (!canViewAccounts(requestRole(event.request))) return forbidden();
  const id = await event.request.text();
  await latency(200, 300, event.request.signal);
  return deleteView(id) ? new Response(null, { status: 204 }) : new Response("Unknown view", { status: 404 });
}
