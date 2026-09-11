import { Button, Heading, useTheme } from "@gemologic/sheen";
import { Show, createMemo, createSignal, createUniqueId, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export interface ErrorStateProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title"> {
  kind?: "not-found" | "server" | "permission-denied";
  title?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  description?: string;
  onRetry?: () => void | Promise<void>;
}

export function ErrorState(props: ErrorStateProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["kind", "title", "headingLevel", "description", "onRetry", "class", "children"]);
  const headingId = createUniqueId();
  const [pending, setPending] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const title = createMemo(() => {
    const messages = theme.messages();
    const value = local.title ?? (local.kind === "not-found" ? messages.notFound : local.kind === "permission-denied" ? messages.permissionDenied : messages.serverError);
    if (!value.trim()) throw new Error("ErrorState requires a nonempty title");
    return value;
  });
  const retry = async () => {
    const callback = local.onRetry;
    if (!callback || pending()) return;
    setFailed(false);
    setPending(true);
    try { await callback(); }
    catch { if (!disposed) setFailed(true); }
    finally { if (!disposed) setPending(false); }
  };
  return <div {...others} role="region" aria-labelledby={headingId} class={`sheen-error-state ${local.class ?? ""}`} data-kind={local.kind ?? "server"}>
    <Heading id={headingId} level={local.headingLevel ?? 2} size="h4">{title()}</Heading>
    <Show when={local.description}><p class="sheen-error-description">{local.description}</p></Show>
    <Show when={local.onRetry}>
      <Button loading={pending()} onClick={() => { void retry(); }}>{theme.messages().retry}</Button>
      <div role="status" aria-atomic="true" class="sheen-error-retry-status">{pending() ? theme.messages().retrying : failed() ? theme.messages().retryFailed : ""}</div>
    </Show>
    {local.children}
  </div>;
}
