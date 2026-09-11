import { countClientFacets, filterClientRows, parseFilter, removeFilterColumnConditions } from "@gemologic/sheen-table";
import { filterRows, filterSchema, filterValue } from "../../fixtures/filter-table";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(event: { request: Request }): Promise<Response> {
  let body: unknown;
  try { body = await event.request.json(); }
  catch { return new Response("Invalid filter request", { status: 400 }); }
  if (!record(body) || !Object.hasOwn(body, "filter")) return new Response("Invalid filter request", { status: 400 });
  let filter;
  try { filter = parseFilter(body.filter, filterSchema); }
  catch { return new Response("Invalid filter request", { status: 400 }); }
  await new Promise<void>(resolve => setTimeout(resolve, 350));
  const rows = filterClientRows(filterRows, filter, filterSchema, { locale: "en-US", getValue: filterValue });
  const counted = filterSchema.flatMap(column => column.type === "enum"
    ? countClientFacets(filterClientRows(filterRows, removeFilterColumnConditions(filter, column.id), filterSchema, { locale: "en-US", getValue: filterValue }), [column], { getValue: filterValue })
    : []);
  const facets: Record<string, Readonly<Record<string, number>>> = {};
  for (const facet of counted) facets[facet.column] = Object.freeze(Object.fromEntries(facet.options.map(option => [option.value, option.count])));
  return Response.json({ rows, total: rows.length, facets: Object.freeze(facets) }, { headers: { "cache-control": "no-store" } });
}
