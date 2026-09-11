import { Show, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";
import type { ToastNotification } from "./create-toaster.ts";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface ToastProps {
  notification: ToastNotification;
  onAction: () => void;
  onDismiss: () => void;
  class?: string;
}

/** Message card. Its presenter owns live announcements, lifetime, and removal. */
export function Toast(props: ToastProps): JSX.Element {
  const theme = useTheme();
  const id = createUniqueId();
  const options = () => props.notification.options;
  const pending = () => props.notification.state === "pending";
  const failed = () => props.notification.state === "failed";
  const description = () => [options().description ? `${id}-description` : "", failed() && options().action ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div class={cn("sheen-toast", props.class)} role="group" aria-labelledby={`${id}-title`} aria-describedby={description()}
    aria-busy={pending() || undefined} data-pending={pending() || undefined} data-invalid={failed() || undefined} data-tone={failed() ? "danger" : options().tone}>
    <strong class="sheen-toast-title" id={`${id}-title`}>{options().title}</strong>
    <Button class="sheen-toast-close" size="sm" aria-label={theme.messages().close} onClick={() => props.onDismiss()}>{theme.messages().close}</Button>
    <Show when={options().description}><p class="sheen-toast-description" id={`${id}-description`}>{options().description}</p></Show>
    <Show when={failed() && options().action}><p class="sheen-toast-error" id={`${id}-error`}>{options().action?.errorMessage}</p></Show>
    <Show when={options().action}>{action => <div class="sheen-toast-actions">
      <Button variant="outline" size="sm" loading={pending()} onClick={() => props.onAction()}>
        {failed() ? action().retryLabel ?? theme.messages().retry : action().label}
      </Button>
      <Show when={pending()}><span class="sheen-toast-pending">{theme.messages().loading}</span></Show>
    </div>}</Show>
  </div>;
}
