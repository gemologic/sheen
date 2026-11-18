import { ActivityTimeline, Badge, Button, Text, Textarea } from "@gemologic/sheen";
import type { ActivityTimelineItem } from "@gemologic/sheen";
import { ListDetailLayout, PageHeader, resolveListDetailActive } from "@gemologic/sheen-patterns";
import type { ListDetailItem } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { Show, batch, createEffect, createMemo, createSignal, on, onCleanup, onMount } from "solid-js";
import { initialData } from "../bootstrap.ts";
import { useConsole } from "../console.tsx";
import { UPDATE_INTERVAL_MS, findIncident, incidents, parseIncidentDetail } from "../lib/incidents.ts";
import type { Incident, IncidentDetail } from "../lib/incidents.ts";

const timeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const severityTone = (incident: Incident) => incident.severity === "SEV1" ? "danger" : incident.severity === "SEV2" ? "warning" : "neutral";

export default function Incidents() {
  // Badge JSX is created inside the component owner so it is disposed with the route.
  const items: readonly ListDetailItem[] = incidents.map(incident => ({
    id: incident.id,
    label: `${incident.id} · ${incident.title}`,
    href: `/incidents?incident=${incident.id}`,
    description: `${incident.status} · ${incident.service}`,
    leading: <Badge tone={severityTone(incident)} size="sm">{incident.severity}</Badge>,
  }));
  const router = useSolidRouterAdapter();
  const shell = useConsole();
  const activeId = createMemo(() => resolveListDetailActive(items, router.location()));
  const active = createMemo(() => { const id = activeId(); return id ? findIncident(id) : undefined; });
  const [detail, setDetail] = createSignal<IncidentDetail | null>(initialData("incident"));
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal(false);
  // Drafts are keyed by incident so switching away and back keeps unsent notes.
  const [drafts, setDrafts] = createSignal<Readonly<Record<string, string>>>({});
  let request: AbortController | undefined;
  let token = 0;

  async function load(id: string): Promise<void> {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    const current = ++token;
    setPending(true);
    try {
      const response = await fetch(`/api/incidents?id=${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Incident failed (${response.status})`);
      const next = parseIncidentDetail(await response.json());
      // Reject a response for an incident the user has already left, even if abort was ignored.
      if (current !== token || next.id !== activeId()) return;
      batch(() => { setDetail(next); setError(false); });
    } catch {
      if (current === token && !controller.signal.aborted) setError(true);
    } finally {
      if (current === token) { request = undefined; setPending(false); }
    }
  }

  onMount(() => {
    createEffect(on(activeId, id => {
      if (!id) { request?.abort(); token++; setDetail(null); return; }
      if (detail()?.id !== id) void load(id);
      const timer = window.setInterval(() => { void load(id); }, Math.max(UPDATE_INTERVAL_MS, shell.liveInterval()));
      onCleanup(() => window.clearInterval(timer));
    }));
  });
  onCleanup(() => request?.abort());

  const timeline = createMemo<readonly ActivityTimelineItem[]>(() => {
    const current = detail();
    if (!current || current.id !== activeId()) return [];
    return current.updates.map((update, index) => ({
      id: update.id, title: update.message, actor: update.author, timestamp: new Date(update.at).toISOString(), timeLabel: `${timeFormat.format(update.at)} UTC`,
      state: index === 0 && active()?.status !== "Resolved" ? "current" : "completed",
    }));
  });

  return <div class="ops-fill ops-fill-headed">
    <PageHeader title="Incidents" />
    <ListDetailLayout router={router} items={items} listLabel="Incidents" detailLabel="Incident detail" listHref="/incidents" backLabel="Back to incidents"
      detailReady={detail()?.id === activeId()}
      emptyDetail={<div class="ops-detail"><Text tone="muted">Select an incident to see its timeline.</Text></div>}
      detail={<Show when={active()}>{incident => <article class="ops-detail" data-testid="incident-detail">
        <header>
          <h2>{incident().id} · {incident().title}</h2>
          <Badge tone={severityTone(incident())}>{incident().severity} · {incident().status}</Badge>
        </header>
        <div class="ops-meta">
          <span>Commander: {incident().commander}</span>
          <span>Started {timeFormat.format(incident().startedAt)} UTC</span>
          <span>{error() ? "Refresh failed; showing the last accepted timeline." : pending() ? "Refreshing…" : `Revision ${detail()?.id === incident().id ? detail()?.revision ?? 0 : 0}`}</span>
          <Button size="sm" variant="outline" disabled={pending()} onClick={() => { void load(incident().id); }}>Refresh</Button>
        </div>
        <Textarea label="Responder note" description="Drafts are kept per incident while you browse." autoResize value={drafts()[incident().id] ?? ""}
          onInput={event => { const value = event.currentTarget.value; setDrafts(previous => ({ ...previous, [incident().id]: value })); }} />
        <ActivityTimeline label={`${incident().id} timeline`} items={timeline()} density="compact" refreshing={pending()} />
      </article>}</Show>} />
  </div>;
}
