import { Button, Heading, Input, Row, Stack, Text } from "@gemologic/sheen";
import { SplitLayout } from "@gemologic/sheen-patterns";
import { createSignal } from "solid-js";
import "@gemologic/sheen-patterns/styles.css";

function revisionPayload(value: unknown): number {
  if (typeof value !== "object" || value === null || !("revision" in value) || typeof value.revision !== "number" || !Number.isSafeInteger(value.revision)) throw new Error("Invalid split refresh response");
  return value.revision;
}

export default function SplitLayoutRoute() {
  const [sizes, setSizes] = createSignal<readonly number[]>([0.36, 0.64]);
  const [savedSizes, setSavedSizes] = createSignal<readonly number[]>([0.36, 0.64]);
  const [saveStatus, setSaveStatus] = createSignal("idle");
  const [revision, setRevision] = createSignal(1);
  const [refreshing, setRefreshing] = createSignal(false);
  const [draft, setDraft] = createSignal("A native draft survives resizing, refresh, and responsive handoff.");
  async function save(next: readonly number[]): Promise<void> {
    setSaveStatus("saving");
    const response = await fetch("/api/split-layout?delay=250", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sizes: next }) });
    if (!response.ok) { setSaveStatus("failed"); throw new Error(`Split size save failed (${response.status})`); }
    setSavedSizes(next);
    setSaveStatus("saved");
  }
  async function refresh(): Promise<void> {
    if (refreshing()) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/split-layout?delay=400&revision=${revision() + 1}`);
      if (!response.ok) throw new Error(`Split refresh failed (${response.status})`);
      setRevision(revisionPayload(await response.json()));
    } finally { setRefreshing(false); }
  }
  return <main class="loupe-split-layout-page"><Stack>
    <header><Heading level={1}>Split layout</Heading><Text tone="muted">One persistent editor and preview pair, resizable on wide containers and stacked when narrow.</Text></header>
    <Row><Button aria-disabled={refreshing() || undefined} onClick={() => { void refresh(); }}>Refresh preview</Button><output aria-label="Preview revision">Revision {revision()}</output><output aria-label="Split save status">{saveStatus()}</output><output aria-label="Persisted split sizes">{savedSizes().map(size => Math.round(size * 100)).join(" / ")}</output></Row>
    <SplitLayout class="loupe-split-layout-fixture" label="Document workspace" startLabel="Source editor" endLabel="Rendered preview" handleLabel="Resize source and preview"
      sizes={sizes()} onSizesChange={setSizes} persistence={{ initialSizes: [0.36, 0.64], save, onError: () => setSaveStatus("failed") }} refreshing={refreshing()}
      start={<div class="loupe-split-pane-content" data-pane-content="source"><Heading level={2} size="h3">Source</Heading><Input label="Draft note" value={draft()} onInput={event => setDraft(event.currentTarget.value)} /><Text tone="muted">Keyboard and pointer resizing share the same persisted fractions.</Text></div>}
      end={<article class="loupe-split-pane-content" data-pane-content="preview"><Heading level={2} size="h3">Preview</Heading><Text>Accepted preview revision {revision()}</Text><Text>{draft()}</Text><div class="loupe-split-tall-content" aria-hidden="true" /></article>} />
  </Stack></main>;
}
