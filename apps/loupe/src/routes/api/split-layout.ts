function delayFrom(url: string): number {
  const value = Number(new URL(url).searchParams.get("delay") ?? "0");
  return Number.isFinite(value) && value >= 0 && value <= 2_000 ? value : 0;
}

async function pause(delay: number): Promise<void> {
  if (delay > 0) await new Promise<void>(resolve => setTimeout(resolve, delay));
}

function validSizes(value: unknown): value is readonly number[] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const first: unknown = value[0];
  const second: unknown = value[1];
  return typeof first === "number" && Number.isFinite(first) && first >= 0.2 && first <= 0.8
    && typeof second === "number" && Number.isFinite(second) && second >= 0.2 && second <= 0.8
    && Math.abs(first + second - 1) <= 0.001;
}

export async function GET(event: { request: Request }): Promise<Response> {
  await pause(delayFrom(event.request.url));
  const revision = Number(new URL(event.request.url).searchParams.get("revision") ?? "1");
  if (!Number.isSafeInteger(revision) || revision < 1) return new Response("Invalid revision", { status: 400 });
  return Response.json({ revision }, { headers: { "cache-control": "no-store" } });
}

export async function POST(event: { request: Request }): Promise<Response> {
  const origin = event.request.headers.get("origin");
  if (origin && origin !== new URL(event.request.url).origin) return new Response("Forbidden origin", { status: 403 });
  await pause(delayFrom(event.request.url));
  let value: unknown;
  try { value = await event.request.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }
  if (typeof value !== "object" || value === null || !("sizes" in value) || !validSizes(value.sizes)) return new Response("Invalid sizes", { status: 400 });
  return Response.json({ sizes: value.sizes }, { headers: { "cache-control": "no-store" } });
}
