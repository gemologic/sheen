import * as Primitive from "#sheen-kobalte/popover";
import { Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup } from "solid-js";
import type { JSX, ParentProps } from "solid-js";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface PopoverProps extends ParentProps {
  trigger: JSX.Element;
  title: string;
  description?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: "top" | "top-start" | "top-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "right";
  class?: string;
}

function PopoverTrigger(props: ParentProps): JSX.Element {
  const context = Primitive.usePopoverContext();
  return <Button ref={context.setTriggerRef} variant="outline" data-sheen-popover-trigger=""
    aria-haspopup="dialog" aria-expanded={context.isOpen()} aria-controls={context.isOpen() ? context.contentId() : undefined}
    onPointerDown={event => { if (event.pointerType === "mouse") event.preventDefault(); }}
    onClick={() => context.toggle()} {...context.dataset()}>{props.children}</Button>;
}

export function Popover(props: PopoverProps): JSX.Element {
  const theme = useTheme();
  const id = createUniqueId();
  const [draft, setDraft] = createSignal(props.defaultOpen ?? false);
  const open = () => props.open === undefined ? draft() : props.open;
  const change = (next: boolean) => {
    if (next === open()) return;
    if (props.open === undefined) setDraft(next);
    props.onOpenChange?.(next);
  };
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(id) : previous ?? 100);
  return <Primitive.Root open={open()} onOpenChange={change} placement={props.placement ?? "bottom"} gutter={6}>
    <PopoverTrigger>{props.trigger}</PopoverTrigger>
    <Show when={theme.portal()}>{target => <Primitive.Portal mount={target()}>
      <Primitive.Content data-kb-top-layer="true" class={cn("sheen-popover", props.class)} aria-hidden={!open() || undefined} inert={!open()} style={{ "z-index": layer() }}
        onEscapeKeyDown={event => { if (!theme.layers.isTop(id)) event.preventDefault(); }}>
        <div class="sheen-dialog-header"><Primitive.Title>{props.title}</Primitive.Title>
          <Show when={props.description}><Primitive.Description>{props.description}</Primitive.Description></Show>
        </div>
        <div class="sheen-dialog-body">{props.children}</div>
        <div class="sheen-dialog-footer"><Primitive.CloseButton as={Button} aria-label={theme.messages().close}>{theme.messages().close}</Primitive.CloseButton></div>
      </Primitive.Content>
    </Primitive.Portal>}</Show>
  </Primitive.Root>;
}
