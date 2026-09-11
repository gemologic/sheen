import { Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface CalloutProps extends JSX.HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "success" | "warning" | "danger";
  heading?: string;
}
export type AlertProps = CalloutProps;

export function Callout(props: CalloutProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "tone", "heading", "children"]);
  return <div {...others} class={cn("sheen-notice", local.class)} data-tone={local.tone ?? "info"} role="note">
    <Show when={local.heading}><strong class="sheen-notice-heading">{local.heading}</strong></Show>
    <div class="sheen-notice-content">{local.children}</div>
  </div>;
}

export function Alert(props: AlertProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "tone", "heading", "children"]);
  return <div {...others} class={cn("sheen-notice", local.class)} data-tone={local.tone ?? "danger"} role="alert" aria-atomic="true">
    <Show when={local.heading}><strong class="sheen-notice-heading">{local.heading}</strong></Show>
    <div class="sheen-notice-content">{local.children}</div>
  </div>;
}
