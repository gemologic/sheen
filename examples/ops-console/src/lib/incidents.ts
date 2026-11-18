import { hash32, pick, unit } from "./prng.ts";

const SEED = 0x1dc;
/** Fixed origin keeps the incident list identical on every server and client render. */
const ORIGIN = Date.UTC(2026, 10, 14, 18, 0, 0);
export const UPDATE_INTERVAL_MS = 15_000;

export type Severity = "SEV1" | "SEV2" | "SEV3";
export type IncidentStatus = "Investigating" | "Mitigated" | "Resolved";

export interface Incident {
  readonly id: string;
  readonly title: string;
  readonly service: string;
  readonly severity: Severity;
  readonly status: IncidentStatus;
  readonly commander: string;
  readonly startedAt: number;
}

export interface IncidentUpdate {
  readonly id: string;
  readonly at: number;
  readonly author: string;
  readonly message: string;
}

export interface IncidentDetail {
  readonly id: string;
  readonly revision: number;
  readonly updates: readonly IncidentUpdate[];
}

const services = ["Public API", "Identity", "Event pipeline", "Billing", "Search", "Webhook relay", "Exports", "Notification delivery"] as const;
const symptoms = ["elevated 5xx responses", "p99 latency regression", "queue backlog growth", "replication lag", "certificate expiry warnings", "partial region outage", "stale cache reads"] as const;
const people = ["Ada Lovelace", "Grace Hopper", "Margaret Hamilton", "Katherine Johnson", "Radia Perlman", "Barbara Liskov"] as const;
const messages = [
  "Paged the owning team and opened a bridge.",
  "Rolled back the most recent deploy in the affected region.",
  "Error budget burn is slowing; continuing to watch.",
  "Shifted 30% of traffic to the secondary region.",
  "Identified a saturated connection pool on the primary.",
  "Customer support notified; status page updated.",
  "Applied a rate limit to the noisy tenant.",
  "Metrics back within SLO for ten minutes.",
] as const;

export const incidents: readonly Incident[] = Object.freeze(Array.from({ length: 48 }, (_, index): Incident => {
  const severityRoll = unit(SEED, index);
  const status: IncidentStatus = index < 4 ? "Investigating" : index < 9 ? "Mitigated" : "Resolved";
  return Object.freeze({
    id: `INC-${2400 - index}`,
    title: `${pick(services, SEED + 1, index)} ${pick(symptoms, SEED + 2, index)}`,
    service: pick(services, SEED + 1, index),
    severity: severityRoll < 0.15 ? "SEV1" : severityRoll < 0.5 ? "SEV2" : "SEV3",
    status,
    commander: pick(people, SEED + 3, index),
    startedAt: ORIGIN - index * 5_400_000 - (hash32(SEED + 4, index) % 3_600) * 1_000,
  });
}));

export function findIncident(id: string): Incident | undefined {
  return incidents.find(incident => incident.id === id);
}

/** Open incidents gain one update per interval; resolved incidents are frozen at their final revision. */
export function incidentDetail(incident: Incident, nowMs: number): IncidentDetail {
  const index = incidents.indexOf(incident);
  const base = 3 + (hash32(SEED + 5, index) % 4);
  const live = incident.status === "Resolved" ? 0 : Math.max(0, Math.floor((nowMs - ORIGIN) / UPDATE_INTERVAL_MS));
  const revision = base + live;
  const visible = Math.min(revision, 40);
  const updates = Array.from({ length: visible }, (_, offset): IncidentUpdate => {
    const serial = revision - offset;
    const at = serial <= base ? incident.startedAt + serial * 420_000 : ORIGIN + (serial - base) * UPDATE_INTERVAL_MS;
    return { id: `${incident.id}-u${serial}`, at, author: pick(people, SEED + 6, index * 97 + serial), message: pick(messages, SEED + 7, index * 89 + serial) };
  });
  return { id: incident.id, revision, updates };
}

export function parseIncidentDetail(value: unknown): IncidentDetail {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string" || !("revision" in value) || typeof value.revision !== "number" || !("updates" in value) || !Array.isArray(value.updates)) throw new Error("Invalid incident detail");
  const updates = value.updates.map((item: unknown): IncidentUpdate => {
    if (typeof item !== "object" || item === null || !("id" in item) || typeof item.id !== "string" || !("at" in item) || typeof item.at !== "number"
      || !("author" in item) || typeof item.author !== "string" || !("message" in item) || typeof item.message !== "string") throw new Error("Invalid incident update");
    return { id: item.id, at: item.at, author: item.author, message: item.message };
  });
  return { id: value.id, revision: value.revision, updates };
}
