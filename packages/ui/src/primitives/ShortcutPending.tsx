import { For, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { usePendingShortcut } from "./ShortcutProvider.tsx";
import { Kbd } from "./Typography.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface ShortcutPendingProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  label?: string;
}

/** A persistent, single-line status slot; sequence updates never take focus. */
export function ShortcutPending(props: ShortcutPendingProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "class"]);
  const pending = usePendingShortcut();
  const theme = useTheme();
  return <div {...others} class={cn("sheen-shortcut-pending", local.class)} role="status" aria-live="polite" aria-atomic="true"
    aria-label={local.label ?? theme.messages().pendingShortcut} data-pending={pending().length > 0 || undefined}>
    <For each={pending()}>{(candidate, index) => <span><Kbd>{candidate.displayKeys}</Kbd>{": "}{candidate.label}{index() < pending().length - 1 ? "; " : ""}</span>}</For>
  </div>;
}
