import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { buttonVariants } from "./button-variants.ts";
import type { ButtonVariantProps } from "./button-variants.ts";
import { useShortcutAction } from "./ShortcutProvider.tsx";
import type { ShortcutAction } from "../utils/shortcut-registry.ts";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NonNullable<ButtonVariantProps["variant"]>;
  tone?: NonNullable<ButtonVariantProps["tone"]>;
  size?: NonNullable<ButtonVariantProps["size"]>;
  loading?: boolean;
  shortcut?: ShortcutAction | undefined;
}

export function Button(props: ButtonProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "variant", "tone", "size", "loading", "disabled", "shortcut", "ref", "onClick", "children"]);
  let element: HTMLButtonElement | undefined;
  const binding = useShortcutAction(() => local.shortcut, () => {
    if (!local.disabled && !local.loading) element?.click();
  });
  // Loading keeps the native button enabled so focus survives the pending work; activation is suppressed here instead.
  const click: JSX.EventHandler<HTMLButtonElement, MouseEvent> = event => {
    if (local.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const handler = local.onClick;
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
  };
  return <button {...others} onClick={click} ref={node => { element = node; if (typeof local.ref === "function") local.ref(node); }} type={others.type ?? "button"}
    class={cn(buttonVariants({ variant: local.variant, tone: local.tone, size: local.size }), local.class)}
    data-variant={local.variant ?? "outline"} data-tone={local.tone ?? "neutral"} data-size={local.size ?? "md"}
    data-sheen-shortcut={binding()?.displayKeys} disabled={local.disabled} aria-disabled={local.loading && !local.disabled ? "true" : others["aria-disabled"]} aria-busy={local.loading || undefined}>{local.children}</button>;
}
