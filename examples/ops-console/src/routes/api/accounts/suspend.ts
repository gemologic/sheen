import { parseFilter } from "@gemologic/sheen-table/core";
import type { BulkSelection } from "@gemologic/sheen-table";
import { accountSchema } from "../../../lib/accounts.ts";
import { latency, noStore } from "../../../lib/latency.ts";
import { canViewAccounts, forbidden, requestRole } from "../../../lib/session.ts";
import { suspendAccounts } from "../../../server/accounts-store.ts";

function strings(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === "string")) throw new Error("Expected string IDs");
  return value.map((item: string) => item);
}

function parseSelection(value: unknown): BulkSelection {
  if (typeof value !== "object" || value === null || !("kind" in value)) throw new Error("Invalid selection");
  if (value.kind === "ids" && "ids" in value) return { kind: "ids", ids: strings(value.ids) };
  if (value.kind === "query" && "filter" in value && "excluded" in value) return { kind: "query", filter: parseFilter(value.filter, accountSchema.filterColumns), excluded: strings(value.excluded) };
  throw new Error("Invalid selection");
}

export async function POST(event: { request: Request }): Promise<Response> {
  if (!canViewAccounts(requestRole(event.request))) return forbidden();
  let selection: BulkSelection;
  try {
    const body: unknown = await event.request.json();
    selection = parseSelection(typeof body === "object" && body !== null && "selection" in body ? body.selection : null);
  } catch {
    return new Response("Invalid suspend request", { status: 400 });
  }
  await latency(500, 700, event.request.signal);
  const outcome = suspendAccounts(selection);
  if (outcome.kind === "rejected") return new Response(outcome.message, { status: outcome.status, headers: noStore });
  return Response.json({ suspended: outcome.suspended }, { headers: noStore });
}
