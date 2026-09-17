export const policyScopeGroups = Object.freeze([
  { id: "accounts", label: "Accounts", options: [
    { value: "accounts:read", label: "Read accounts" },
    { value: "accounts:review", label: "Review accounts" },
  ] },
  { id: "operations", label: "Operations", options: [
    { value: "deployments:read", label: "Read deployments" },
    { value: "audit:read", label: "Read audit log" },
    { value: "workspace:admin", label: "Administer workspace", disabled: true },
  ] },
]);

export interface AdminPolicy {
  readonly name: string;
  readonly scopes: readonly string[];
}

const allowedScopes = new Set(["accounts:read", "accounts:review", "deployments:read", "audit:read"]);

export class AdminPolicyValidationError extends Error {
  constructor(message: string, readonly field: "name" | "scopes") {
    super(message);
    this.name = "AdminPolicyValidationError";
  }
}

export function parseAdminPolicy(value: unknown): AdminPolicy {
  if (typeof value !== "object" || value === null || !("name" in value) || typeof value.name !== "string" || !("scopes" in value) || !Array.isArray(value.scopes)) throw new Error("Provide a policy name and permissions.");
  const name = value.name.trim();
  if (!/^[a-z][a-z0-9-]{2,47}$/.test(name)) throw new AdminPolicyValidationError("Use 3–48 lowercase letters, numbers, or hyphens, starting with a letter.", "name");
  const scopes: string[] = [];
  for (const scope of value.scopes) {
    if (typeof scope !== "string" || !allowedScopes.has(scope)) throw new AdminPolicyValidationError("This permission is unavailable for your role.", "scopes");
    if (!scopes.includes(scope)) scopes.push(scope);
  }
  if (scopes.length === 0) throw new AdminPolicyValidationError("Select at least one permission.", "scopes");
  return { name, scopes };
}
