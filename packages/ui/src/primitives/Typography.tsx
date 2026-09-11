import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "../utils/cn.ts";

export interface TextProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  size?: "caption" | "ui-sm" | "ui" | "body";
  tone?: "default" | "muted";
  numeric?: boolean;
}

export function Text(props: TextProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "size", "tone", "numeric"]);
  return <span {...others} class={cn("sheen-text", local.class)} data-size={local.size ?? "ui"} data-tone={local.tone ?? "default"} data-numeric={local.numeric || undefined} />;
}

export interface HeadingProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  size?: "h1" | "h2" | "h3" | "h4";
}
const headingElements = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } satisfies Record<HeadingProps["level"], keyof JSX.IntrinsicElements>;
const headingSizes = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h4", 6: "h4" };

export function Heading(props: HeadingProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "level", "size"]);
  return <Dynamic component={headingElements[local.level]} {...others} class={cn("sheen-heading", local.class)} data-size={local.size ?? headingSizes[local.level]} />;
}

export type CodeProps = JSX.HTMLAttributes<HTMLElement>;
export function Code(props: CodeProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <code {...others} class={cn("sheen-code", local.class)} />;
}

export type KbdProps = JSX.HTMLAttributes<HTMLElement>;
export function Kbd(props: KbdProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <kbd {...others} class={cn("sheen-kbd", local.class)} />;
}
