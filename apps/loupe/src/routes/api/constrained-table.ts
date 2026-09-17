import { deserializeState } from "@gemologic/sheen-table/core";
import { constrainedSchema, constrainedView } from "../../fixtures/constrained-table-data.ts";

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  try {
    const state = deserializeState(parameters.get("state") ?? "", constrainedSchema);
    await new Promise<void>(resolve => setTimeout(resolve, 650));
    if (parameters.get("fail") === "true") return new Response("Requested failure", { status: 503 });
    const result = constrainedView(state);
    if (parameters.get("export") === "true") return Response.json(result.view);
    const facets = Object.fromEntries(result.facets.map(facet => [facet.column, Object.fromEntries(facet.options.map(option => [option.value, option.count]))]));
    return Response.json({ rows: result.rows, total: result.total, facets }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Invalid request", { status: 400 });
  }
}
