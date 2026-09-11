const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#16a34a"/><path d="M19 45 32 14l13 31h-8l-2-6h-7l-2 6Zm11-13h3l-1-5Z" fill="white"/></svg>';

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  await new Promise<void>(resolve => setTimeout(resolve, 350));
  if (parameters.get("fail") === "true") return new Response("Missing avatar", { status: 404, headers: { "cache-control": "no-store" } });
  return new Response(svg, { headers: { "cache-control": "no-store", "content-type": "image/svg+xml" } });
}
