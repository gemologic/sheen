import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface DescriptionListProps extends JSX.HTMLAttributes<HTMLDListElement> {
  layout?: "stacked" | "columns";
}
export type DescriptionTermProps = JSX.HTMLAttributes<HTMLElement>;
export interface DescriptionDetailsProps extends JSX.HTMLAttributes<HTMLElement> {
  numeric?: boolean;
}

export function DescriptionList(props: DescriptionListProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "layout"]);
  return <dl {...others} class={cn("sheen-description-list", local.class)} data-layout={local.layout ?? "stacked"} />;
}

export function DescriptionTerm(props: DescriptionTermProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <dt {...others} class={cn("sheen-description-term", local.class)} />;
}

export function DescriptionDetails(props: DescriptionDetailsProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "numeric"]);
  return <dd {...others} class={cn("sheen-description-details", local.class)} data-numeric={local.numeric || undefined} />;
}
