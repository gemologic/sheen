import * as KobalteDialog from "@kobalte/core/dialog";
import type { JSX, ParentProps } from "solid-js";
import { Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { Button } from "./Button.tsx";
import { buttonVariants } from "./button-variants.ts";
import { cn } from "../utils/cn.ts";
import { useModalShortcutScope } from "./ShortcutProvider.tsx";

export interface DialogProps extends ParentProps {
  title: string;
  contentId?: string;
  trigger?: string;
  description?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  closeLabel?: string;
  initialFocus?: () => HTMLElement | undefined;
  returnFocus?: () => HTMLElement | undefined;
  shortcutScope?: string;
  class?: string;
  footer?: JSX.Element;
}

export function ModalFrame(props: DialogProps & { alert?: boolean }): JSX.Element {
  const theme = useTheme();
  const [uncontrolled, setUncontrolled] = createSignal(props.defaultOpen ?? false);
  const open = () => props.open === undefined ? uncontrolled() : props.open;
  const dismissible = () => props.dismissible ?? true;
  const change = (next: boolean) => {
    if (!next && !dismissible()) return;
    if (next === open()) return;
    if (props.open === undefined) setUncontrolled(next);
    props.onOpenChange?.(next);
  };
  const id = createUniqueId();
  useModalShortcutScope(() => props.shortcutScope ?? `dialog:${id}`, open);
  let content: HTMLDivElement | undefined;
  let closeButton: HTMLButtonElement | undefined;
  createEffect(() => {
    if (open()) onCleanup(theme.layers.register(id));
  });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(id) : previous ?? 100);
  return <KobalteDialog.Root open={open()} onOpenChange={change}>
    <Show when={props.trigger}><KobalteDialog.Trigger class={buttonVariants({ variant: "outline" })} data-variant="outline">{props.trigger}</KobalteDialog.Trigger></Show>
    <Show when={theme.portal()}>{target => <KobalteDialog.Portal mount={target()}>
      <KobalteDialog.Overlay class="sheen-dialog-overlay" style={{ "z-index": layer() }} />
      <KobalteDialog.Content {...(props.contentId === undefined ? {} : { id: props.contentId })} ref={element => { content = element; }} role={props.alert ? "alertdialog" : "dialog"} aria-hidden={!open() || undefined} inert={!open()} class={cn("sheen-dialog", props.class)} style={{ "z-index": layer() + 1 }}
        onEscapeKeyDown={event => { if (!theme.layers.isTop(id) || !dismissible()) event.preventDefault(); }}
        onPointerDownOutside={event => { if (props.alert || !dismissible() || !theme.layers.isTop(id)) event.preventDefault(); }}
        onOpenAutoFocus={event => {
          const target = props.initialFocus?.() ?? (props.alert ? closeButton : undefined);
          if (target?.isConnected && content?.contains(target) && !target.matches(":disabled,[inert]")) {
            target.focus({ preventScroll: true });
            if (target.ownerDocument.activeElement === target) event.preventDefault();
          }
        }}
        onCloseAutoFocus={event => {
          const target = props.returnFocus?.();
          if (target?.isConnected && !target.matches(":disabled,[inert]")) {
            target.focus({ preventScroll: true });
            if (target.ownerDocument.activeElement === target) event.preventDefault();
          }
        }}>
        <div class="sheen-dialog-header">
          <KobalteDialog.Title>{props.title}</KobalteDialog.Title>
          <Show when={props.description}><KobalteDialog.Description>{props.description}</KobalteDialog.Description></Show>
        </div>
        <div class="sheen-dialog-body">{props.children}</div>
        <div class="sheen-dialog-footer">
          <KobalteDialog.CloseButton as={Button} ref={element => { closeButton = element; }} disabled={!dismissible()} aria-label={props.closeLabel ?? theme.messages().close}>{props.closeLabel ?? theme.messages().close}</KobalteDialog.CloseButton>
          {props.footer}
        </div>
      </KobalteDialog.Content>
    </KobalteDialog.Portal>}</Show>
  </KobalteDialog.Root>;
}

export function Dialog(props: DialogProps): JSX.Element { return <ModalFrame {...props} />; }
