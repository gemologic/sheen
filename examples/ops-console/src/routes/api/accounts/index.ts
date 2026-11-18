import { parseTableState } from "@gemologic/sheen-table/core";
import type { TableState } from "@gemologic/sheen-table";
import { accountSchema } from "../../../lib/accounts.ts";
import { latency, noStore } from "../../../lib/latency.ts";
import { canViewAccounts, forbidden, requestRole } from "../../../lib/session.ts";
import { queryAccounts } from "../../../server/accounts-store.ts";

/** Numbered server query over the synthetic 1,000,000-account dataset. */
export async function POST(event: { request: Request }): Promise<Response> {
  if (!canViewAccounts(requestRole(event.request))) return forbidden();
  let state: TableState;
  try {
    const body: unknown = await event.request.json();
    state = parseTableState(typeof body === "object" && body !== null && "state" in body ? body.state : null, accountSchema);
  } catch {
    return new Response("Invalid account query", { status: 400 });
  }
  if (state.pagination === false || state.pagination.pageSize > 200) return new Response("Accounts require numbered pages of at most 200 rows", { status: 400 });
  const started = performance.now();
  const result = queryAccounts(state);
  await latency(Math.max(0, 180 - (performance.now() - started)), 320, event.request.signal);
  return Response.json(result, { headers: noStore });
}
