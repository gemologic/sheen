import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface SkeletonProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  shape?: "text" | "rectangle" | "circle";
}

export function Skeleton(props: SkeletonProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "shape"]);
  return <span {...others} class={cn("sheen-skeleton", local.class)} data-shape={local.shape ?? "text"} aria-hidden="true" inert />;
}
