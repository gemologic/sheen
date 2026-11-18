export type Role = "operator" | "viewer";

export const ROLE_COOKIE = "ops-role";

export function parseRole(value: unknown): Role | null {
  return value === "operator" || value === "viewer" ? value : null;
}

/** Server-side role resolution. Missing or malformed cookies resolve to the operator demo identity. */
export function requestRole(request: Request): Role {
  const cookie = request.headers.get("cookie") ?? "";
  const entry = cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${ROLE_COOKIE}=`));
  return parseRole(entry?.slice(ROLE_COOKIE.length + 1)) ?? "operator";
}

export function canViewAccounts(role: Role): boolean {
  return role === "operator";
}

export function forbidden(): Response {
  return new Response("This role cannot access accounts", { status: 403, headers: { "cache-control": "no-store" } });
}
