interface AdminControlRequest {
  readonly action: "workspace" | "account" | "notification" | "mark-all-read";
  readonly id?: string;
}

function parseRequest(payload: unknown): AdminControlRequest {
  if (typeof payload !== "object" || payload === null || !("action" in payload) || typeof payload.action !== "string") throw new Error("Invalid admin control request");
  const actions = new Set(["workspace", "account", "notification", "mark-all-read"]);
  if (!actions.has(payload.action)) throw new Error("Invalid admin control action");
  if ("id" in payload && payload.id !== undefined && typeof payload.id !== "string") throw new Error("Invalid admin control ID");
  if (payload.action === "workspace" || payload.action === "account" || payload.action === "notification") {
    if (!("id" in payload) || typeof payload.id !== "string" || !payload.id.trim()) throw new Error("Admin control ID is required");
    if (payload.action === "workspace") return { action: "workspace", id: payload.id };
    if (payload.action === "account") return { action: "account", id: payload.id };
    return { action: "notification", id: payload.id };
  }
  return { action: "mark-all-read" };
}

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const revision = Number(parameters.get("revision") ?? "0");
  const delay = Number(parameters.get("delay") ?? "0");
  if (!Number.isSafeInteger(revision) || revision < 0 || !Number.isSafeInteger(delay) || delay < 0 || delay > 5_000) return new Response("Invalid admin controls request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  if (parameters.get("fail") === "true") return new Response("Workspace service is temporarily unavailable.", { status: 503 });
  return Response.json({ revision }, { headers: { "cache-control": "no-store" } });
}

export async function POST(event: { request: Request }): Promise<Response> {
  let request: AdminControlRequest;
  try { request = parseRequest(await event.request.json()); }
  catch { return new Response("Invalid admin control request", { status: 400 }); }
  await new Promise<void>(resolve => setTimeout(resolve, 180));
  return Response.json(request, { headers: { "cache-control": "no-store" } });
}
