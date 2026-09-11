import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Tooltip } from "./Tooltip.tsx";
import type { TooltipProps } from "./Tooltip.tsx";
import { cn } from "../utils/cn.ts";

export interface IconButtonProps extends Omit<TooltipProps, "content" | "aria-label" | "aria-labelledby"> {
  label: string;
  children: JSX.Element;
}

/** A native icon-only action whose label also supplies its tooltip. */
export function IconButton(props: IconButtonProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "class", "children"]);
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("IconButton requires a nonempty accessible label");
    return local.label;
  });
  return <Tooltip {...others} content={label()} aria-label={label()} aria-labelledby={undefined} class={cn("sheen-icon-button", local.class)}>
    <span class="sheen-icon-button-glyph" aria-hidden="true">{local.children}</span>
  </Tooltip>;
}
