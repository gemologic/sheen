import { getRequestEvent, isServer } from "solid-js/web";
import type { DataTableResult } from "@gemologic/sheen-table";
import { parseAccountResult } from "./lib/accounts.ts";
import type { AccountRow } from "./lib/accounts.ts";
import { parseIncidentDetail } from "./lib/incidents.ts";
import type { IncidentDetail } from "./lib/incidents.ts";
import { parseMetricWindow } from "./lib/metrics.ts";
import type { MetricWindow } from "./lib/metrics.ts";
import { parseRole } from "./lib/session.ts";
import type { Role } from "./lib/session.ts";

/** Request-time data the server rendered with. The client hydrates from the same values instead of refetching. */
export interface Bootstrap {
  readonly now: number;
  readonly role: Role;
  readonly accounts: DataTableResult<AccountRow> | null;
  readonly metrics: MetricWindow | null;
  readonly incident: IncidentDetail | null;
}

type BootstrapLoader = (request: Request) => Bootstrap;
let serverLoader: BootstrapLoader | undefined;
const serverCache = new WeakMap<Request, Bootstrap>();
let clientCache: Bootstrap | undefined;

/** Called once by entry-server so server-only modules never enter the client graph. */
export function registerBootstrapLoader(loader: BootstrapLoader): void {
  serverLoader = loader;
}

export function bootstrap(): Bootstrap {
  if (isServer) {
    const request = getRequestEvent()?.request;
    if (!request || !serverLoader) throw new Error("Bootstrap requires a server request");
    const cached = serverCache.get(request);
    if (cached) return cached;
    const value = serverLoader(request);
    serverCache.set(request, value);
    return value;
  }
  clientCache ??= parseBootstrap(JSON.parse(document.getElementById("ops-bootstrap")?.textContent ?? "null"));
  return clientCache;
}

type InitialKey = "accounts" | "metrics" | "incident";
const consumed = new Set<InitialKey>();

/**
 * Initial route data is valid only for the document it was rendered into. On the client each value is handed out once,
 * so later client navigations load fresh data instead of reusing an old snapshot.
 */
export function initialData<K extends InitialKey>(key: K): Bootstrap[K] | null {
  if (isServer) return bootstrap()[key];
  if (consumed.has(key)) return null;
  consumed.add(key);
  return bootstrap()[key];
}

export function serializeBootstrap(value: Bootstrap): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function parseBootstrap(value: unknown): Bootstrap {
  if (typeof value !== "object" || value === null || !("now" in value) || typeof value.now !== "number" || !("role" in value)) throw new Error("Missing server bootstrap");
  const role = parseRole(value.role);
  if (!role) throw new Error("Invalid bootstrap role");
  return {
    now: value.now,
    role,
    accounts: "accounts" in value && value.accounts !== null ? parseAccountResult(value.accounts) : null,
    metrics: "metrics" in value && value.metrics !== null ? parseMetricWindow(value.metrics) : null,
    incident: "incident" in value && value.incident !== null ? parseIncidentDetail(value.incident) : null,
  };
}
