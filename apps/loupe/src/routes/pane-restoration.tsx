import { For, Show, createSignal } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { Button, ScrollArea, ThemeScope } from "@gemologic/sheen";
import { AppShell, usePaneScrollRestoration, useUnsavedChanges } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import "@gemologic/sheen-patterns/styles.css";

const rows = Array.from({ length: 100 }, (_, index) => index + 1);
function Sidebar(props: { short: boolean; ready: boolean }) {
  const [viewport, setViewport] = createSignal<HTMLDivElement>();
  usePaneScrollRestoration("sidebar", viewport, { ready: () => props.ready });
  return <ScrollArea ref={setViewport} label="Restored sidebar" orientation="both" style={{ height: "100%" }}><div style={{ "inline-size": props.short ? "100%" : "700px" }}><For each={props.short ? rows.slice(0, 2) : rows}>{row => <p>Sidebar {row}</p>}</For></div></ScrollArea>;
}
function EntryObserver() {
  const router = useSolidRouterAdapter();
  return <output aria-label="Observer history entry">{router.location().entryKey ?? "server"}</output>;
}
function DirtyEditor() {
  const [dirty, setDirty] = createSignal(false);
  useUnsavedChanges(dirty);
  return <><Button onClick={() => setDirty(value => !value)}>Toggle history editor dirty</Button><output aria-label="History editor dirty">{String(dirty())}</output></>;
}
export default function PaneRestorationFixture() {
  const router = useSolidRouterAdapter();
  const location = useLocation();
  const [revision, setRevision] = createSignal(0);
  const [short, setShort] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [sidebar, setSidebar] = createSignal(true);
  const [rtl, setRtl] = createSignal(false);
  const [mounted, setMounted] = createSignal(true);
  const [observer, setObserver] = createSignal(false);
  const load = async (remainShort: boolean) => {
    setShort(true); setLoading(true);
    router.navigate(-1);
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
    if (response.ok) setShort(remainShort);
    setLoading(false);
  };
  return <Show when={mounted()} fallback={<main><Button onClick={() => setMounted(true)}>Restore shell</Button><output aria-label="Rows loading">{String(loading())}</output></main>}><ThemeScope direction={rtl() ? "rtl" : "ltr"}><AppShell router={router} contentReady={!loading()} label="Restored content" sidebar={<Show when={sidebar()}><Sidebar short={short()} ready={!loading()} /></Show>}
    header={<><h1>Pane restoration</h1><A href="?page=a" noScroll>Page A</A> <A href="?page=b" noScroll>Page B</A> <A href="/browser-status" noScroll>Leave fixture</A>
      <Button onClick={() => setRevision(value => value + 1)}>Refresh rows</Button>
      <Button onClick={() => setMounted(false)}>Remove shell</Button>
      <Button onClick={() => setRtl(value => !value)}>Toggle pane direction</Button>
      <Button onClick={() => setSidebar(value => !value)}>Toggle restored sidebar</Button>
      <Button onClick={() => load(false)}>Load Page A slowly</Button>
      <Button onClick={() => load(true)}>Load short Page A</Button>
      <Button onClick={() => setShort(false)}>Expand rows</Button></>}>
    <output aria-label="Current page">{router.location().search}</output>
    <div style={{ "block-size": "60px", overflow: "hidden", "white-space": "nowrap" }}>
      <output style={{ display: "block" }} aria-label="History entry">{router.location().entryKey ?? "server"}</output>
      <output style={{ display: "block" }} aria-label="Application route state">{JSON.stringify(location.state)}</output>
      <Show when={observer()}><EntryObserver /></Show>
    </div>
    <Button onClick={() => router.navigate("?page=b", { replace: true, scroll: false, state: { workspace: "Aperture", account: { id: "account-42" } } })}>Replace with Page B</Button>
    <Button onClick={() => router.navigate("?page=b", { scroll: false, state: window.history.state })}>Push Page B with copied state</Button>
    <Button onClick={() => setObserver(value => !value)}>Toggle entry observer</Button>
    <DirtyEditor />
    <output aria-label="Rows loading">{String(loading())}</output>
    <For each={short() ? rows.slice(0, 2) : rows}>{row => <p>Content {row}, revision {revision()}</p>}</For>
  </AppShell></ThemeScope></Show>;
}
