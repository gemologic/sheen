import * as Primitive from "@kobalte/core/tooltip";
import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { createTooltipLayer, TooltipLayer } from "./tooltip-layer.tsx";
import { cn } from "../utils/cn.ts";

export interface LinkTooltipProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  content: string;
  tooltipDisabled?: boolean;
  placement?: "top" | "bottom" | "left" | "right";
  openDelay?: number;
  closeDelay?: number;
}

/** Native navigation with contextual help; disabling the tooltip never disables the link. */
export function LinkTooltip(props: LinkTooltipProps): JSX.Element {
  const [local, link] = splitProps(props, ["content", "tooltipDisabled", "placement", "openDelay", "closeDelay", "children", "ref", "class", "aria-describedby", "type"]);
  const Anchor = (attributes: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...attributes} type={local.type} />;
  let trigger: HTMLAnchorElement | undefined;
  const state = createTooltipLayer(() => trigger, () => local.tooltipDisabled ?? false);
  return <Primitive.Root open={state.open()} onOpenChange={state.change} disabled={local.tooltipDisabled ?? false}
    placement={local.placement ?? "top"} openDelay={local.openDelay ?? 500} closeDelay={local.closeDelay ?? 100} gutter={6}>
    <Primitive.Trigger as={Anchor} {...link} class={cn("sheen-link-tooltip", local.class)}
      aria-describedby={[local["aria-describedby"], state.open() ? `${state.id}-content` : undefined].filter(Boolean).join(" ") || undefined}
      onClick={link.onClick ?? (() => {})} onFocus={link.onFocus ?? (() => {})} onBlur={link.onBlur ?? (() => {})}
      onPointerDown={link.onPointerDown ?? (() => {})} onPointerEnter={link.onPointerEnter ?? (() => {})} onPointerLeave={link.onPointerLeave ?? (() => {})}
      ref={(element: HTMLAnchorElement) => { trigger = element; if (typeof local.ref === "function") local.ref(element); }}>{local.children}</Primitive.Trigger>
    <TooltipLayer state={state} content={local.content} />
  </Primitive.Root>;
}
