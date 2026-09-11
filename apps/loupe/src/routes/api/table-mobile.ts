interface MobileRow {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "paused";
  readonly amount: number;
}

const rows: readonly MobileRow[] = Array.from({ length: 45 }, (_, index) => ({
  id: `mobile-${index}`,
  name: `Account ${index}`,
  status: index % 3 === 0 ? "paused" : "active",
  amount: index * 125,
}));

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const delay = Number(parameters.get("delay") ?? "0");
  const direction = parameters.get("direction") ?? "none";
  if (!Number.isSafeInteger(delay) || delay < 0 || delay > 5_000 || (direction !== "none" && direction !== "asc" && direction !== "desc")) return new Response("Invalid mobile table request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  const ordered = [...rows].sort((left, right) => direction === "desc" ? right.name.localeCompare(left.name) : left.name.localeCompare(right.name));
  return Response.json({ rows: ordered, total: ordered.length }, { headers: { "cache-control": "no-store" } });
}
