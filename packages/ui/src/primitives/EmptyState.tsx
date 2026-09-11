import { Show, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface EmptyStateProps extends JSX.HTMLAttributes<HTMLDivElement> {
  kind?: "empty" | "no-results";
  heading?: string;
  description?: string;
}

export function EmptyState(props: EmptyStateProps): JSX.Element {
  const theme = useTheme();
  const headingId = createUniqueId();
  const [local, others] = splitProps(props, ["class", "kind", "heading", "description", "children", "aria-label", "aria-labelledby"]);
  return <div {...others} class={cn("sheen-empty-state", local.class)} data-kind={local.kind ?? "empty"} role="region" aria-label={local["aria-label"]} aria-labelledby={local["aria-labelledby"] ?? (local["aria-label"] ? undefined : headingId)}>
    <strong id={headingId} class="sheen-empty-state-heading">{local.heading ?? (local.kind === "no-results" ? theme.messages().noResults : theme.messages().empty)}</strong>
    <Show when={local.description}><p class="sheen-empty-state-description">{local.description}</p></Show>
    {local.children}
  </div>;
}
