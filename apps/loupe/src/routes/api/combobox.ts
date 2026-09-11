interface FixtureOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

const options: readonly FixtureOption[] = [
  { value: "ada", label: "Ada Lovelace", description: "Analytical engine" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
  { value: "linus", label: "Linus Torvalds", description: "Kernel development" },
  { value: "margaret", label: "Margaret Hamilton", description: "Flight software" },
  { value: "radia", label: "Radia Perlman", description: "Network protocols" },
];

export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const query = parameters.get("query") ?? "";
  const attempt = Number(parameters.get("attempt") ?? "1");
  const delay = Number(parameters.get("delay") ?? "450");
  if (query.length > 80 || !Number.isSafeInteger(attempt) || attempt < 1 || !Number.isSafeInteger(delay) || delay < 0 || delay > 5_000) return new Response("Invalid combobox request", { status: 400 });
  await new Promise<void>(resolve => setTimeout(resolve, delay));
  if (query.toLocaleLowerCase("en-US") === "fail" && attempt === 1) return new Response("Search service unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  const normalized = query.toLocaleLowerCase("en-US");
  return Response.json(options.filter(option => option.label.toLocaleLowerCase("en-US").includes(normalized)), { headers: { "cache-control": "no-store" } });
}
