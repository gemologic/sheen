interface FixtureRow { readonly id: string; readonly name: string; readonly amount: number; readonly desk: "Alpha" | "Beta" }

const rows: readonly FixtureRow[] = Array.from({ length: 55 }, (_, index) => ({ id: `server-${index}`, name: `Server row ${index}`, amount: index * 10, desk: index < 30 ? "Alpha" : "Beta" }));

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const pageIndex = Number(parameters.get("pageIndex"));
  const pageSize = Number(parameters.get("pageSize"));
  const direction = parameters.get("direction");
  const search = parameters.get("search") ?? "";
  const fail = parameters.get("fail") ?? "false";
  const grouped = parameters.get("grouped") ?? "false";
  if (!Number.isSafeInteger(pageIndex) || pageIndex < 0 || !Number.isSafeInteger(pageSize) || pageSize <= 0 || (direction !== "none" && direction !== "asc" && direction !== "desc") || (fail !== "false" && fail !== "true") || (grouped !== "false" && grouped !== "true")) return new Response("Invalid DataTable fixture request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, 450));
  if (fail === "true") return new Response("Requested DataTable fixture failure", { status: 503 });
  const matched = search ? rows.filter(row => row.name.toLocaleLowerCase("en-US").includes(search.toLocaleLowerCase("en-US"))) : rows;
  const ordered = direction === "desc" ? [...matched].reverse() : matched;
  const start = pageIndex * pageSize;
  const page = ordered.slice(start, start + pageSize);
  if (grouped === "false") return Response.json({ rows: page, total: matched.length }, { headers: { "cache-control": "no-store" } });
  const groups = new Map<FixtureRow["desk"], FixtureRow[]>();
  for (const row of page) {
    const group = groups.get(row.desk);
    if (group) group.push(row);
    else groups.set(row.desk, [row]);
  }
  return Response.json({
    rows: page,
    total: rows.length,
    groups: [...groups].map(([desk, groupRows]) => ({
      value: desk,
      rowIds: groupRows.map(row => row.id),
      count: rows.filter(row => row.desk === desk).length,
      aggregates: [{ column: "amount", value: rows.filter(row => row.desk === desk).reduce((sum, row) => sum + row.amount, 0) }],
    })),
  }, { headers: { "cache-control": "no-store" } });
}
