import { Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface SpinnerProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  size?: "sm" | "md" | "lg";
  label?: string;
  decorative?: boolean;
}

export function Spinner(props: SpinnerProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["class", "size", "label", "decorative"]);
  return <span {...others} class={cn("sheen-spinner", local.class)} data-size={local.size ?? "md"} role={local.decorative ? undefined : "status"} aria-hidden={local.decorative || undefined} aria-atomic={local.decorative ? undefined : true}>
    <span class="sheen-spinner-mark" aria-hidden="true" />
    <Show when={!local.decorative}><span class="sheen-spinner-label">{local.label ?? theme.messages().loading}</span></Show>
  </span>;
}
