import { latency, noStore } from "../../../lib/latency.ts";
import { canViewAccounts, forbidden, requestRole } from "../../../lib/session.ts";
import { liveAccounts } from "../../../server/accounts-store.ts";

/** Revalidates fields of already-accepted rows without changing the table query. */
export async function GET(event: { request: Request }): Promise<Response> {
  if (!canViewAccounts(requestRole(event.request))) return forbidden();
  const ids = (new URL(event.request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length > 200) return new Response("Too many accounts", { status: 400 });
  await latency(250, 500, event.request.signal);
  return Response.json({ at: Date.now(), accounts: liveAccounts(ids, Date.now()) }, { headers: noStore });
}
