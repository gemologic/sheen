import * as Primitive from "#sheen-kobalte/tooltip";
import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "./Button.tsx";
import type { ButtonProps } from "./Button.tsx";
import type { ShortcutAction } from "../utils/shortcut-registry.ts";
import { createTooltipLayer, TooltipLayer } from "./tooltip-layer.tsx";

export interface TooltipProps extends Omit<ButtonProps, "type" | "shortcut"> {
  type?: "button" | "submit" | "reset";
  content: string;
  shortcut?: string | ShortcutAction;
  placement?: "top" | "bottom" | "left" | "right";
  openDelay?: number;
  closeDelay?: number;
}

/** A native action button with noninteractive supporting text. */
export function Tooltip(props: TooltipProps): JSX.Element {
  const [local, button] = splitProps(props, ["content", "shortcut", "placement", "openDelay", "closeDelay", "ref", "children", "aria-describedby"]);
  let trigger: HTMLButtonElement | undefined;
  const disabled = () => button.disabled || button.loading || false;
  const state = createTooltipLayer(() => trigger, disabled);
  const shortcutAction = () => typeof local.shortcut === "string" ? undefined : local.shortcut;
  const shortcutHint = () => {
    state.open();
    if (typeof local.shortcut === "string") return local.shortcut;
    return trigger?.getAttribute("data-sheen-shortcut") ?? local.shortcut?.keys;
  };
  return <Primitive.Root open={state.open()} onOpenChange={state.change} disabled={disabled()}
    placement={local.placement ?? "top"} openDelay={local.openDelay ?? 500} closeDelay={local.closeDelay ?? 100} gutter={6}>
    <Primitive.Trigger as={Button} {...button} shortcut={shortcutAction()} type={button.type ?? "button"}
      aria-describedby={[local["aria-describedby"], state.open() ? `${state.id}-content` : undefined].filter(Boolean).join(" ") || undefined}
      onClick={button.onClick ?? (() => {})} onFocus={button.onFocus ?? (() => {})} onBlur={button.onBlur ?? (() => {})}
      onPointerDown={button.onPointerDown ?? (() => {})} onPointerEnter={button.onPointerEnter ?? (() => {})} onPointerLeave={button.onPointerLeave ?? (() => {})}
      ref={(element: HTMLButtonElement) => { trigger = element; if (typeof local.ref === "function") local.ref(element); }}>
      {local.children}
    </Primitive.Trigger>
    <TooltipLayer state={state} content={local.content} shortcut={shortcutHint} />
  </Primitive.Root>;
}
