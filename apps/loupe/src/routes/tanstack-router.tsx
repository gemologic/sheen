import { createMemoryHistory } from "@tanstack/solid-router";
import { Button, Heading, Stack, Switch, Text } from "@gemologic/sheen";
import { createTanStackRouterAdapter } from "@gemologic/sheen-patterns/tanstack-router";
import { createSignal, onCleanup } from "solid-js";
import type { NavigationAttempt } from "@gemologic/sheen-patterns";

export default function TanStackRouterRoute() {
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const adapter = createTanStackRouterAdapter(history);
  const [dirty, setDirty] = createSignal(false);
  const [blocked, setBlocked] = createSignal(false);
  let pending: NavigationAttempt | undefined;
  const disposeBlock = adapter.block(attempt => {
    if (!dirty()) return;
    attempt.preventDefault();
    pending = attempt;
    setBlocked(true);
  });
  onCleanup(disposeBlock);
  const approve = () => {
    const attempt = pending;
    pending = undefined;
    setBlocked(false);
    setDirty(false);
    attempt?.retry();
  };
  const cancel = () => {
    pending = undefined;
    setBlocked(false);
  };
  return <main>
    <Stack>
      <Heading level={1}>TanStack Router adapter</Heading>
      <Text>Real memory-history fixture for navigation, exact retry, and reactive location ownership.</Text>
      <Switch label="Unsaved changes" checked={dirty()} onCheckedChange={setDirty} />
      <div class="actions">
        <Button onClick={() => adapter.navigate("/next?view=detail#result", { state: { source: "fixture" } })}>Open next route</Button>
        <Button onClick={() => adapter.navigate(-1)}>Back</Button>
      </div>
      <output aria-label="TanStack location">{`${adapter.location().pathname}${adapter.location().search}${adapter.location().hash}`}</output>
      <output aria-label="TanStack block state">{blocked() ? "blocked" : "idle"}</output>
      <div class="actions" hidden={!blocked()}>
        <Button onClick={approve}>Discard and continue</Button>
        <Button onClick={cancel}>Stay here</Button>
      </div>
      <Text>{adapter.location().pathname === "/next" ? "Next route" : "Index route"}</Text>
    </Stack>
  </main>;
}
