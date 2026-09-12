import * as Primitive from "#sheen-kobalte/collapsible";
import { createEffect, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { cn } from "../utils/cn.ts";

export interface CollapsibleProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function Collapsible(props: CollapsibleProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "open", "defaultOpen", "onOpenChange", "disabled", "class", "children", "id"]);
  const generatedId = createUniqueId();
  const id = () => local.id ?? `sheen-collapsible-${generatedId}`;
  const [draft, setDraft] = createSignal(local.defaultOpen ?? false);
  const open = () => local.open === undefined ? draft() : local.open;
  let trigger: HTMLButtonElement | undefined;
  let content: HTMLDivElement | undefined;
  const restoreFocus = () => {
    if (content?.contains(content.ownerDocument.activeElement)) trigger?.focus({ preventScroll: true });
  };
  const change = (next: boolean) => {
    if (local.disabled || next === open()) return;
    if (local.open === undefined) {
      if (!next) restoreFocus();
      setDraft(next);
    }
    local.onOpenChange?.(next);
  };
  createEffect(() => { if (!open()) restoreFocus(); });
  return <Primitive.Root {...others} id={id()} class={cn("sheen-collapsible", local.class)} open={open()} onOpenChange={change} disabled={local.disabled ?? false}>
    <Primitive.Trigger as={Button} ref={trigger} id={`${id()}-trigger`} aria-controls={`${id()}-content`} class="sheen-collapsible-trigger">
      <span class="sheen-collapsible-indicator" aria-hidden="true" />{local.label}
    </Primitive.Trigger>
    <div ref={content} id={`${id()}-content`} class="sheen-collapsible-content" data-open={open()} aria-hidden={!open() || undefined} inert={!open()}>
      <div class="sheen-collapsible-clip"><div class="sheen-collapsible-body">{local.children}</div></div>
    </div>
  </Primitive.Root>;
}
