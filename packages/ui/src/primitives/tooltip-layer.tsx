import * as Primitive from "@kobalte/core/tooltip";
import { Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";
import { Kbd } from "./Typography.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";

export function createTooltipLayer(trigger: Accessor<HTMLElement | undefined>, disabled: Accessor<boolean>) {
  const theme = useTheme();
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  let dismissedWhileEngaged = false;
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  createEffect(() => {
    if (disabled()) setOpen(false);
    else { const element = trigger(); if (element && element.ownerDocument.activeElement === element) setOpen(true); }
  });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(id) : previous ?? 100);
  onMount(() => {
    const element = trigger();
    if (!element) return;
    const releaseDismissal = () => { dismissedWhileEngaged = false; };
    element.addEventListener("blur", releaseDismissal);
    element.addEventListener("pointerleave", releaseDismissal);
    onCleanup(() => {
      element.removeEventListener("blur", releaseDismissal);
      element.removeEventListener("pointerleave", releaseDismissal);
    });
    if (!disabled() && (element.ownerDocument.activeElement === element || element.matches(":hover"))) setOpen(true);
  });
  return {
    theme,
    id,
    open,
    layer,
    change: (next: boolean) => setOpen(next && !disabled() && !dismissedWhileEngaged),
    dismiss: () => {
      dismissedWhileEngaged = true;
      setOpen(false);
    },
  };
}

export function TooltipLayer(props: { state: ReturnType<typeof createTooltipLayer>; content: string; shortcut?: Accessor<string | undefined> | undefined }) {
  return <Show when={props.state.theme.portal()}>{target => <Primitive.Portal mount={target()}>
    <Primitive.Content id={`${props.state.id}-content`} data-kb-top-layer="true" class="sheen-tooltip" aria-hidden={!props.state.open() || undefined} style={{ "z-index": props.state.layer() }}
      onEscapeKeyDown={event => {
        if (!props.state.theme.layers.isTop(props.state.id)) event.preventDefault();
        else props.state.dismiss();
      }}>
      <span>{props.content}</span><Show when={props.shortcut?.()}>{shortcut => <Kbd>{shortcut()}</Kbd>}</Show>
    </Primitive.Content>
  </Primitive.Portal>}</Show>;
}
