type EditValue = string | number | boolean | null;
interface EditRequest { readonly commitId: string; readonly value: EditValue; readonly previous: EditValue }

function scalar(value: unknown): value is EditValue {
  return value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
}

function parse(value: unknown): EditRequest {
  if (typeof value !== "object" || value === null || !("commitId" in value) || typeof value.commitId !== "string" || !/^\d+$/.test(value.commitId) || !("value" in value) || !scalar(value.value) || !("previous" in value) || !scalar(value.previous)) throw new Error("Invalid edit request");
  return { commitId: value.commitId, value: value.value, previous: value.previous };
}

/** Stateless transport whose first commit deterministically exercises failure/conflict. */
export async function POST(event: { request: Request }): Promise<Response> {
  let request: EditRequest;
  try { request = parse(await event.request.json()); }
  catch { return new Response("Invalid edit request", { status: 400 }); }
  const slow = request.value === "slow";
  await new Promise<void>(resolve => setTimeout(resolve, slow ? 800 : 300));
  if (request.value === "transport failure" && request.commitId === "1") return new Response("Commit rejected", { status: 503 });
  if (request.value === "version conflict" && request.commitId === "1") return Response.json({ kind: "conflict", current: "Server version", detail: "version-mismatch" });
  return Response.json({ kind: "accepted", value: request.value });
}
