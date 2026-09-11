import { useTheme } from "@gemologic/sheen";
import { createEffect, createMemo, createSignal, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export interface LoadingStateProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  phase: "idle" | "cold" | "refresh";
  fallback: JSX.Element;
}

export function LoadingState(props: LoadingStateProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["label", "phase", "fallback", "children", "class"]);
  const [visible, setVisible] = createSignal(false);
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("LoadingState requires a nonempty region label");
    return local.label;
  });
  createEffect(() => {
    const phase = local.phase;
    setVisible(false);
    if (phase === "idle") return;
    const timer = setTimeout(() => setVisible(true), phase === "cold" ? 200 : 500);
    onCleanup(() => clearTimeout(timer));
  });
  return <div {...others} role="region" aria-label={label()} aria-busy={local.phase !== "idle"} data-pending={local.phase !== "idle" || undefined} data-phase={local.phase} data-motion={theme.state().motion} class={`sheen-loading-state ${local.class ?? ""}`}>
    <div class="sheen-loading-fallback" hidden={local.phase !== "cold"} aria-hidden="true" inert style={{ visibility: visible() ? "visible" : "hidden" }}>{local.fallback}</div>
    <div class="sheen-loading-content" hidden={local.phase === "cold"}>{local.children}</div>
    <div class="sheen-loading-progress" role="progressbar" aria-label={theme.messages().loading} hidden={local.phase !== "refresh" || !visible()}><span /></div>
  </div>;
}
