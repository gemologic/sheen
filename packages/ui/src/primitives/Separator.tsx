import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface SeparatorProps extends JSX.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}
export function Separator(props: SeparatorProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "orientation", "decorative"]);
  const orientation = () => local.orientation ?? "horizontal";
  return <hr {...others} class={cn("sheen-separator", local.class)} data-orientation={orientation()} aria-orientation={orientation()} aria-hidden={local.decorative || undefined} />;
}
