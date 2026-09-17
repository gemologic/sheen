import { parseAdminPolicy } from "../../fixtures/admin-policy-data.ts";

export async function POST(event: { request: Request }): Promise<Response> {
  const origin = event.request.headers.get("origin");
  if (origin !== new URL(event.request.url).origin) return new Response("Invalid origin", { status: 403 });
  try {
    const policy = parseAdminPolicy(await event.request.json());
    await new Promise<void>(resolve => setTimeout(resolve, 400));
    return Response.json(policy, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Invalid policy", { status: 400 });
  }
}
