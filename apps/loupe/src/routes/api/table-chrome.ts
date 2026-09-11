interface ChromeRow { readonly id: string; readonly name: string; readonly amount: number }

const rows: readonly ChromeRow[] = [
  { id: "alpha", name: "Alpha", amount: 10 },
  { id: "beta", name: "Beta", amount: 20 },
  { id: "gamma", name: "Gamma", amount: 30 },
];

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const delay = Number(parameters.get("delay") ?? "0");
  const fail = parameters.get("fail") ?? "false";
  const direction = parameters.get("direction") ?? "none";
  if (!Number.isSafeInteger(delay) || delay < 0 || delay > 5_000 || (fail !== "true" && fail !== "false") || (direction !== "none" && direction !== "asc" && direction !== "desc")) return new Response("Invalid table chrome request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  if (fail === "true") return new Response("Requested table chrome failure", { status: 503 });
  const ordered = direction === "desc" ? [...rows].reverse() : rows;
  return Response.json({ rows: ordered, total: ordered.length }, { headers: { "cache-control": "no-store" } });
}
