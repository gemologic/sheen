interface FixtureRow { readonly id: string; readonly name: string; readonly amount: number }

const rows: readonly FixtureRow[] = Array.from({ length: 55 }, (_, index) => ({ id: `server-${index}`, name: `Server row ${index}`, amount: index * 10 }));

/** Keyset-style fixture: `after` or `before` names an opaque row cursor, and there are no page numbers. */
export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const limit = Number(parameters.get("limit"));
  const after = parameters.get("after");
  const before = parameters.get("before");
  const direction = parameters.get("direction");
  if (!Number.isSafeInteger(limit) || limit <= 0 || (after !== null && before !== null) || (direction !== "none" && direction !== "asc" && direction !== "desc")) return new Response("Invalid cursor DataTable fixture request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, 150));
  const ordered = direction === "desc" ? [...rows].reverse() : rows;
  const anchor = ordered.findIndex(row => row.id === (after ?? before));
  if ((after !== null || before !== null) && anchor < 0) return Response.json({ rows: [], next_cursor: null, prev_cursor: null }, { headers: { "cache-control": "no-store" } });
  const start = after !== null ? anchor + 1 : before !== null ? Math.max(0, anchor - limit) : 0;
  const end = before !== null ? anchor : Math.min(ordered.length, start + limit);
  const page = ordered.slice(start, end);
  return Response.json({
    rows: page,
    next_cursor: end < ordered.length ? page.at(-1)?.id ?? null : null,
    prev_cursor: start > 0 ? page[0]?.id ?? null : null,
    total_estimate: Math.ceil(ordered.length / 10) * 10,
  }, { headers: { "cache-control": "no-store" } });
}
