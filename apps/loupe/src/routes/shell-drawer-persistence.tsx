import { Show, createSignal, onCleanup } from "solid-js";
import { Alert, Button, Input, Switch } from "@gemologic/sheen";
import { AppShell } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function PersistedDrawerFixture() {
  const [mounted, setMounted] = createSignal(true);
  return <Show when={mounted()} fallback={<main><Button onClick={() => setMounted(true)}>Restore persistence shell</Button></main>}>
    <PersistedDrawer onRemove={() => setMounted(false)} />
  </Show>;
}

function PersistedDrawer(props: { onRemove: () => void }) {
  const [open, setOpen] = createSignal(false);
  const [reject, setReject] = createSignal(true);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const [requests, setRequests] = createSignal(0);
  let controller: AbortController | undefined;
  let alive = true;
  onCleanup(() => { alive = false; controller?.abort(); });
  const persistClose = async () => {
    if (pending()) return;
    controller = new AbortController();
    setPending(true);
    setError("");
    setRequests(value => value + 1);
    try {
      const response = await fetch("/api/optimistic", {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reject: reject() }),
      });
      if (!alive) return;
      if (!response.ok) throw new Error("Could not save drawer preference");
      setOpen(false);
    } catch (failure) {
      if (alive) setError(failure instanceof Error ? failure.message : "Could not save drawer preference");
    } finally {
      if (alive) setPending(false);
    }
  };
  return <AppShell label="Persisted drawer workspace" mobileSidebarOpen={open()}
    onMobileSidebarOpenChange={next => { if (next) setOpen(true); else void persistClose(); }}
    sidebar={<>
      <Input label="Persisted drawer draft" />
      <Switch label="Reject preference save" checked={reject()} onCheckedChange={setReject} />
      <output aria-label="Preference pending">{String(pending())}</output>
      <output aria-label="Preference requests">{requests()}</output>
      <Button onClick={props.onRemove}>Remove persistence shell</Button>
      <Show when={error()}>{message => <Alert tone="danger">{message()}<Button onClick={() => void persistClose()}>Retry preference save</Button></Alert>}</Show>
    </>}>
    <Input label="Persistence main draft" />
  </AppShell>;
}
