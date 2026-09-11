interface ZoneRecord { readonly id: string; readonly label: string; readonly description: string }

const zones: readonly ZoneRecord[] = [
  { id: "UTC", label: "UTC", description: "Coordinated Universal Time" },
  { id: "America/New_York", label: "New York", description: "Eastern Time" },
  { id: "America/Chicago", label: "Chicago", description: "Central Time" },
  { id: "America/Denver", label: "Denver", description: "Mountain Time" },
  { id: "America/Los_Angeles", label: "Los Angeles", description: "Pacific Time" },
  { id: "Europe/London", label: "London", description: "United Kingdom" },
  { id: "Europe/Berlin", label: "Berlin", description: "Central Europe" },
  { id: "Asia/Tokyo", label: "Tokyo", description: "Japan Standard Time" },
  { id: "Australia/Sydney", label: "Sydney", description: "Australian Eastern Time" },
];

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const revision = Number(parameters.get("revision") ?? "1");
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > 100) return new Response("Invalid date option revision", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, 350));
  return Response.json(zones.map(zone => ({ ...zone, label: `${zone.label} · r${revision}` })), { headers: { "cache-control": "no-store" } });
}
