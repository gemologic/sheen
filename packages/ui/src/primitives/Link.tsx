import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { buttonVariants } from "./button-variants.ts";
import type { ButtonVariantProps } from "./button-variants.ts";

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** `quiet` drops the resting underline; use it only where position already marks links, such as table cells and lists. */
  variant?: "text" | "quiet" | "button";
  /** Button treatment when `variant="button"`; matches Button's `variant`. */
  appearance?: NonNullable<ButtonVariantProps["variant"]>;
  /** Button tone when `variant="button"`. */
  tone?: NonNullable<ButtonVariantProps["tone"]>;
  /** Button size when `variant="button"`. */
  size?: NonNullable<ButtonVariantProps["size"]>;
}

/** A destination, even when styled like an action. Browser navigation stays native. */
export function Link(props: LinkProps): JSX.Element {
  const [local, others] = splitProps(props, ["variant", "appearance", "tone", "size", "class", "children"]);
  const button = (): boolean => local.variant === "button";
  return <a {...others} class={cn("sheen-link", button() && buttonVariants({ variant: local.appearance, tone: local.tone, size: local.size }), local.class)}
    data-link-variant={local.variant ?? "text"}
    data-variant={button() ? local.appearance ?? "outline" : undefined}
    data-tone={button() ? local.tone ?? "neutral" : undefined}
    data-size={button() ? local.size ?? "md" : undefined}>{local.children}</a>;
}
