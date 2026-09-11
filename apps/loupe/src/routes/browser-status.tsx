import { Show, createSignal } from "solid-js";
import { Button, useOnlineStatus, useIsWindowFocused } from "@gemologic/sheen";

function Status() {
  const online = useOnlineStatus();
  const focused = useIsWindowFocused();
  return <section aria-label="Browser observations">
    <output aria-label="Browser online">{String(online())}</output>
    <output aria-label="Window focused">{String(focused())}</output>
  </section>;
}

export default function BrowserStatusFixture() {
  const [mounted, setMounted] = createSignal(true);
  return <main><h1>Browser status qualification</h1>
    <Button onClick={() => setMounted(value => !value)}>Toggle observer</Button>
    <Show when={mounted()}><Status /></Show>
  </main>;
}
