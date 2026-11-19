import * as Primitive from "#sheen-kobalte/tooltip";
import type { TooltipTriggerRenderProps } from "#sheen-kobalte/tooltip";
import { onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { createTooltipLayer, TooltipLayer } from "./tooltip-layer.tsx";
import { useShortcutLabel } from "./ShortcutProvider.tsx";

/** Spread onto the one focusable element that owns the tooltip. */
export interface TooltipTriggerBindings {
  readonly ref: (element: HTMLElement) => void;
  readonly "aria-describedby": string | undefined;
}

export interface TooltipTriggerProps {
  content: string;
  shortcut?: string;
  tooltipDisabled?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  openDelay?: number;
  closeDelay?: number;
  "aria-describedby"?: string;
  children: (trigger: TooltipTriggerBindings) => JSX.Element;
}

function callHandler(handler: unknown, event: Event): void {
  if (typeof handler === "function") handler(event);
  else if (Array.isArray(handler) && typeof handler[0] === "function") handler[0](handler[1], event);
}

/** Hover/focus help attached to an existing focusable element, without rendering another control. */
export function TooltipTrigger(props: TooltipTriggerProps): JSX.Element {
  const [local] = splitProps(props, ["content", "shortcut", "tooltipDisabled", "placement", "openDelay", "closeDelay", "aria-describedby", "children"]);
  let trigger: HTMLElement | undefined;
  const state = createTooltipLayer(() => trigger, () => local.tooltipDisabled ?? false);
  const shortcutLabel = useShortcutLabel(() => local.shortcut);
  // Primitive handlers attach natively so the element keeps its own JSX event handlers.
  const Target = (primitive: TooltipTriggerRenderProps): JSX.Element => {
    const listeners: readonly (readonly [string, (event: Event) => void])[] = [
      ["pointerenter", event => callHandler(primitive.onPointerEnter, event)], ["pointerleave", event => callHandler(primitive.onPointerLeave, event)],
      ["pointerdown", event => callHandler(primitive.onPointerDown, event)], ["click", event => callHandler(primitive.onClick, event)],
      ["focus", event => callHandler(primitive.onFocus, event)], ["blur", event => callHandler(primitive.onBlur, event)],
    ];
    const detach = () => { for (const [type, listener] of listeners) trigger?.removeEventListener(type, listener); };
    onCleanup(detach);
    return local.children({
      ref: element => {
        detach();
        trigger = element;
        for (const [type, listener] of listeners) element.addEventListener(type, listener);
        if (typeof primitive.ref === "function") primitive.ref(element);
      },
      get "aria-describedby"() { return [local["aria-describedby"], state.open() ? `${state.id}-content` : undefined].filter(Boolean).join(" ") || undefined; },
    });
  };
  return <Primitive.Root open={state.open()} onOpenChange={state.change} disabled={local.tooltipDisabled ?? false}
    placement={local.placement ?? "top"} openDelay={local.openDelay ?? 500} closeDelay={local.closeDelay ?? 100} gutter={6}>
    <Primitive.Trigger as={Target} aria-describedby={undefined} />
    <TooltipLayer state={state} content={local.content} shortcut={shortcutLabel} />
  </Primitive.Root>;
}
