import { ROLE_COOKIE, parseRole } from "../../lib/session.ts";
import { noStore } from "../../lib/latency.ts";

/** Demo-only role switch. Real applications derive authorization from their identity provider. */
export async function POST(event: { request: Request }): Promise<Response> {
  const body: unknown = await event.request.json().catch(() => null);
  const role = parseRole(typeof body === "object" && body !== null && "role" in body ? body.role : null);
  if (!role) return new Response("Invalid role", { status: 400 });
  return Response.json({ role }, { headers: { ...noStore, "set-cookie": `${ROLE_COOKIE}=${role}; Path=/; SameSite=Lax; HttpOnly` } });
}
