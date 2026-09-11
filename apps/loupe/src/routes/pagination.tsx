import { createSignal, onCleanup, Show } from "solid-js";
import { Button, Pagination, ThemeScope } from "@gemologic/sheen";

export default function PaginationFixture() {
  const [accepted, setAccepted] = createSignal({ index: 0, count: 10 });
  const [pending, setPending] = createSignal(false);
  const [reject, setReject] = createSignal(false);
  const [error, setError] = createSignal(false);
  const [requests, setRequests] = createSignal(0);
  const [rtl, setRtl] = createSignal(false);
  let requested = 0;
  let controller: AbortController | undefined;
  let alive = true;
  onCleanup(() => { alive = false; controller?.abort(); });
  async function request(index: number) {
    if (pending()) return;
    requested = index;
    controller = new AbortController();
    setPending(true);
    setError(false);
    setRequests(value => value + 1);
    try {
      const result = await fetch("/api/optimistic", { method: "POST", body: JSON.stringify({ reject: reject() }), signal: controller.signal });
      if (!alive) return;
      if (!result.ok) { setError(true); return; }
      setAccepted(value => ({ ...value, index }));
    } catch { if (alive) setError(true); }
    finally { if (alive) setPending(false); }
  }
  return <ThemeScope direction={rtl() ? "rtl" : "ltr"} locale={rtl() ? "ar-EG" : "en-US"}>
    <main onKeyDown={event => {
      if (!event.altKey || pending()) return;
      if (event.key.toLowerCase() === "e") { event.preventDefault(); setAccepted({ index: 0, count: 0 }); }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); setAccepted({ index: 1, count: 2 }); }
    }}>
      <Pagination pageIndex={accepted().index} pageCount={accepted().count} pending={pending()} onPageChange={index => void request(index)} />
      <output aria-label="Pagination requests">{requests()}</output>
      <Button disabled={pending()} onClick={() => setReject(value => !value)}>Toggle page rejection</Button>
      <Button disabled={pending()} onClick={() => setAccepted({ index: 99995, count: 100000 })}>Many pages</Button>
      <Button disabled={pending()} onClick={() => setAccepted({ index: 0, count: 0 })}>Empty pages</Button>
      <Button onClick={() => setRtl(value => !value)}>Toggle page locale</Button>
      <Show when={error()}><p role="alert">Page request failed. Accepted results are unchanged.</p><Button onClick={() => void request(requested)}>Retry page</Button></Show>
    </main>
  </ThemeScope>;
}
