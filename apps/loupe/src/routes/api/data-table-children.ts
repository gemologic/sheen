export function GET(event: { request: Request }): Promise<Response> | Response {
  const url = new URL(event.request.url);
  const parent = url.searchParams.get("parent") ?? "unknown";
  const attempt = Number(url.searchParams.get("attempt") ?? "1");
  const delay = Number(url.searchParams.get("delay") ?? "5");
  const fail = url.searchParams.get("fail") === "true";
  if (!Number.isInteger(attempt) || attempt < 1 || !Number.isFinite(delay) || delay < 0 || delay > 1000) return new Response("Invalid request", { status: 400 });
  return new Promise<Response>(resolve => {
    setTimeout(() => {
      if (fail) {
        resolve(new Response("Child load failed", { status: 503 }));
        return;
      }
      resolve(Response.json([
        { id: `${parent}-child-${attempt}`, name: `${parent} child ${attempt}`, amount: attempt * 100 },
      ]));
    }, delay);
  });
}
