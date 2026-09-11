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
  const [local, others] = splitProps(props, ["class", "variant", "tone", "size", "loading", "disabled", "shortcut", "ref", "children"]);
  let element: HTMLButtonElement | undefined;
  const binding = useShortcutAction(() => local.shortcut, () => {
    if (!local.disabled && !local.loading) element?.click();
  });
  return <button {...others} ref={node => { element = node; if (typeof local.ref === "function") local.ref(node); }} type={others.type ?? "button"}
    class={cn(buttonVariants({ variant: local.variant, tone: local.tone, size: local.size }), local.class)}
    data-variant={local.variant ?? "ghost"} data-tone={local.tone ?? "neutral"} data-size={local.size ?? "md"}
    data-sheen-shortcut={binding()?.displayKeys} disabled={local.disabled || local.loading} aria-busy={local.loading || undefined}>{local.children}</button>;
}
