import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { buttonVariants } from "./button-variants.ts";

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: "text" | "button";
}

/** A destination, even when styled like an action. Browser navigation stays native. */
export function Link(props: LinkProps): JSX.Element {
  const [local, others] = splitProps(props, ["variant", "class", "children"]);
  return <a {...others} class={cn("sheen-link", local.variant === "button" && buttonVariants(), local.class)}
    data-link-variant={local.variant ?? "text"}
    data-variant={local.variant === "button" ? "ghost" : undefined}
    data-tone={local.variant === "button" ? "neutral" : undefined}
    data-size={local.variant === "button" ? "md" : undefined}>{local.children}</a>;
}
