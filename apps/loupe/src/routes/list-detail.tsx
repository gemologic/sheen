import { Button } from "@gemologic/sheen";
import { AppShell, ListDetailLayout, resolveListDetailActive } from "@gemologic/sheen-patterns";
import type { ListDetailItem } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import "@gemologic/sheen-patterns/styles.css";

const items: readonly ListDetailItem[] = Array.from({ length: 60 }, (_, index) => ({
  id: `message-${index + 1}`,
  label: `Message ${index + 1}`,
  href: `/list-detail?item=message-${index + 1}`,
  description: index % 3 === 0 ? "Unread account update" : "Account update",
  trailing: String(index + 1),
}));

function parseRefresh(value: unknown): { readonly id: string; readonly revision: number } {
  if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string" || !("revision" in value) || typeof value.revision !== "number" || !Number.isSafeInteger(value.revision)) throw new Error("Invalid list-detail refresh response");
  return Object.freeze({ id: value.id, revision: value.revision });
}

export default function ListDetailFixture() {
  const router = useSolidRouterAdapter();
  const activeId = createMemo(() => resolveListDetailActive(items, router.location()));
  const active = createMemo(() => items.find(item => item.id === activeId()));
  const [acceptedRevision, setAcceptedRevision] = createSignal(0);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string>();
  let request: AbortController | undefined;
  let token = 0;
  createEffect(() => { activeId(); request?.abort(); request = undefined; token++; setPending(false); setError(undefined); setAcceptedRevision(0); });
  onCleanup(() => request?.abort());
  async function refresh(): Promise<void> {
    const id = activeId();
    if (!id || pending()) return;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    const current = ++token;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/list-detail?id=${encodeURIComponent(id)}&delay=650&revision=${acceptedRevision() + 1}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Refresh failed (${response.status})`);
      const result = parseRefresh(await response.json());
      if (current === token && result.id === activeId()) setAcceptedRevision(result.revision);
    } catch (value) {
      if (!controller.signal.aborted && current === token) setError(value instanceof Error ? value.message : "Refresh failed");
    } finally {
      if (current === token) { request = undefined; setPending(false); }
    }
  }
  return <AppShell label="List detail fixture" router={router} contentReady={!pending()} header={<div class="loupe-list-detail-header"><strong>Inbox</strong><output aria-label="Accepted location">{router.location().search || "list"}</output></div>}>
    <ListDetailLayout router={router} items={items} listLabel="Messages" detailLabel="Message detail" listHref="/list-detail" backLabel="Back to messages" detailReady={!pending()}
      emptyDetail={<p>Select a message from the list.</p>} detail={<Show when={active()}>{item => <article class="loupe-list-detail-article" data-detail-root>
        <h1>{item().label}</h1>
        <div class="loupe-list-detail-actions"><Button onClick={() => void refresh()} disabled={pending()}>Refresh detail</Button><output aria-label="Refresh state">{pending() ? "Refreshing" : error() ?? "Ready"}</output></div>
        <output aria-label="Accepted revision">Revision {acceptedRevision()}</output>
        {Array.from({ length: 50 }, (_, index) => <p>{item().label} retained content line {index + 1}, revision {acceptedRevision()}.</p>)}
      </article>}</Show>} />
  </AppShell>;
}
