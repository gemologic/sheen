import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import type { Spacing } from "../layout/Layout.tsx";

export interface SurfaceProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: "base" | "subtle" | "raised" | "inset";
  padding?: Spacing;
  bordered?: boolean;
  elevated?: boolean;
}
export function Surface(props: SurfaceProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "variant", "padding", "bordered", "elevated"]);
  return <div {...others} class={cn("sheen-layout sheen-surface", local.class)} data-surface={local.variant ?? "base"} data-gap={local.padding ?? "none"} data-bordered={local.bordered || undefined} data-elevated={local.elevated || undefined} />;
}

export type CardProps = SurfaceProps;
export function Card(props: CardProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "variant", "padding", "bordered"]);
  return <Surface {...others} class={cn("sheen-card", local.class)} variant={local.variant ?? "raised"} padding={local.padding ?? "lg"} bordered={local.bordered ?? true} />;
}
