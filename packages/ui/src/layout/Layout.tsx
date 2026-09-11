import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export type Spacing = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type Alignment = "start" | "center" | "end" | "stretch";
export type Justification = "start" | "center" | "end" | "between";
export interface StackProps extends JSX.HTMLAttributes<HTMLDivElement> { gap?: Spacing; align?: Alignment; justify?: Justification }
export interface RowProps extends StackProps { wrap?: boolean }
export interface GridProps extends JSX.HTMLAttributes<HTMLDivElement> { columns?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; gap?: Spacing; align?: Alignment }
export interface ContainerProps extends JSX.HTMLAttributes<HTMLDivElement> { padding?: Spacing }
export type CenterProps = JSX.HTMLAttributes<HTMLDivElement>;
export type SpacerProps = JSX.HTMLAttributes<HTMLDivElement>;

export function Stack(props: StackProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "gap", "align", "justify"]);
  return <div {...others} class={cn("sheen-layout sheen-stack", local.class)} data-gap={local.gap ?? "md"} data-align={local.align ?? "stretch"} data-justify={local.justify ?? "start"} />;
}

export function Row(props: RowProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "gap", "align", "justify", "wrap"]);
  return <div {...others} class={cn("sheen-layout sheen-row", local.class)} data-gap={local.gap ?? "md"} data-align={local.align ?? "center"} data-justify={local.justify ?? "start"} data-wrap={local.wrap ?? true} />;
}

export function Grid(props: GridProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "columns", "gap", "align"]);
  return <div {...others} class={cn("sheen-layout sheen-grid", local.class)} data-columns={local.columns ?? 1} data-gap={local.gap ?? "md"} data-align={local.align ?? "stretch"} />;
}

export function Container(props: ContainerProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "padding"]);
  return <div {...others} class={cn("sheen-layout sheen-container", local.class)} data-gap={local.padding ?? "md"} />;
}

export function Center(props: CenterProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <div {...others} class={cn("sheen-layout sheen-center", local.class)} />;
}

export function Spacer(props: SpacerProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <div {...others} class={cn("sheen-layout sheen-spacer", local.class)} aria-hidden="true" />;
}
