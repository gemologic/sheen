import { deserializeState, serializeState } from "./table-state.ts";
import type { TableState, TableStateSchema } from "./table-state.ts";

export interface TableUrlLocation { readonly pathname: string; readonly search: string; readonly hash: string }
export interface TableUrlRouter {
  readonly location: () => TableUrlLocation;
  readonly navigate: (to: string, options?: { readonly replace?: boolean; readonly scroll?: boolean }) => void;
}
export type TableUrlRead =
  | { readonly kind: "absent" }
  | { readonly kind: "accepted"; readonly state: TableState }
  | { readonly kind: "invalid"; readonly error: unknown };
export type TableUrlWrite =
  | { readonly kind: "unchanged"; readonly to: string }
  | { readonly kind: "navigated"; readonly to: string };

function parameterName(value: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(value)) throw new Error("Table URL parameter must start with a letter and contain only letters, digits, dot, underscore, or hyphen");
  return value;
}
function locationParts(location: TableUrlLocation): { pathname: string; parameters: URLSearchParams; hash: string } {
  if (!location.pathname.startsWith("/") || location.pathname.includes("?") || location.pathname.includes("#")) throw new Error("Router pathname must be an absolute path without query or hash");
  if (location.hash && !location.hash.startsWith("#")) throw new Error("Router hash must be empty or start with #");
  return { pathname: location.pathname, parameters: new URLSearchParams(location.search), hash: location.hash };
}
function target(pathname: string, parameters: URLSearchParams, hash: string): string {
  const search = parameters.toString();
  return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

/** Pull-based URL state using the same structural adapter as AppShell. */
export function createTableUrlState(router: TableUrlRouter, parameter: string, schema: TableStateSchema) {
  const name = parameterName(parameter);
  function read(): TableUrlRead {
    try {
      const { parameters } = locationParts(router.location());
      const values = parameters.getAll(name);
      if (values.length === 0) return Object.freeze({ kind: "absent" });
      if (values.length !== 1) throw new Error(`Table URL parameter ${name} must occur exactly once`);
      return Object.freeze({ kind: "accepted", state: deserializeState(values[0] ?? "", schema) });
    } catch (error) { return Object.freeze({ kind: "invalid", error }); }
  }
  function write(state: TableState, options: { readonly replace?: boolean } = {}): TableUrlWrite {
    const current = locationParts(router.location());
    const present = target(current.pathname, current.parameters, current.hash);
    current.parameters.set(name, serializeState(state, schema));
    const to = target(current.pathname, current.parameters, current.hash);
    if (to === present) return Object.freeze({ kind: "unchanged", to });
    router.navigate(to, { replace: options.replace ?? true, scroll: false });
    return Object.freeze({ kind: "navigated", to });
  }
  function clear(options: { readonly replace?: boolean } = {}): TableUrlWrite {
    const current = locationParts(router.location());
    const present = target(current.pathname, current.parameters, current.hash);
    current.parameters.delete(name);
    const to = target(current.pathname, current.parameters, current.hash);
    if (to === present) return Object.freeze({ kind: "unchanged", to });
    router.navigate(to, { replace: options.replace ?? true, scroll: false });
    return Object.freeze({ kind: "navigated", to });
  }
  return { read, write, clear };
}
