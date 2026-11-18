import type { Bootstrap } from "../bootstrap.ts";
import { defaultAccountState } from "../lib/accounts.ts";
import { findIncident, incidentDetail } from "../lib/incidents.ts";
import { METRIC_HISTORY, metricWindow } from "../lib/metrics.ts";
import { canViewAccounts, requestRole } from "../lib/session.ts";
import { queryAccounts } from "./accounts-store.ts";

/** Computes exactly the data the requested route renders, so server markup is complete and hydration does not refetch it. */
export function loadBootstrap(request: Request): Bootstrap {
  const url = new URL(request.url);
  const now = Math.floor(Date.now() / 1_000) * 1_000;
  const role = requestRole(request);
  const incidentId = url.searchParams.get("incident");
  const incident = url.pathname === "/incidents" && incidentId ? findIncident(incidentId) : undefined;
  return {
    now,
    role,
    accounts: url.pathname === "/accounts" && canViewAccounts(role) ? queryAccounts(defaultAccountState) : null,
    metrics: url.pathname === "/" ? metricWindow(now - METRIC_HISTORY * 1_000, now, METRIC_HISTORY) : null,
    incident: incident ? incidentDetail(incident, now) : null,
  };
}
