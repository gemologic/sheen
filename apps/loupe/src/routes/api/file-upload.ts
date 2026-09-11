export async function POST(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const attempt = Number(parameters.get("attempt") ?? "1");
  const delay = Number(parameters.get("delay") ?? "0");
  if (!Number.isSafeInteger(attempt) || attempt < 1 || !Number.isSafeInteger(delay) || delay < 0 || delay > 5_000) return new Response("Invalid upload request", { status: 400 });
  const form = await event.request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name) return new Response("Missing file", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  if (file.name === "retry.txt" && attempt === 1) return new Response("Retry requested", { status: 503, headers: { "cache-control": "no-store" } });
  return Response.json({ name: file.name, size: file.size, attempt }, { headers: { "cache-control": "no-store" } });
}
