import { Show, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";

export type StatusTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger" | "market-up" | "market-down" | "market-flat";
export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
}
export function Badge(props: BadgeProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "tone", "variant", "size"]);
  return <span {...others} class={cn("sheen-badge", local.class)} data-tone={local.tone ?? "neutral"} data-variant={local.variant ?? "soft"} data-size={local.size ?? "sm"} />;
}

export interface TagProps extends BadgeProps {
  label: string;
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
}
export function Tag(props: TagProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["class", "label", "children", "onRemove", "removeLabel", "disabled"]);
  return <Badge {...others} class={cn("sheen-tag", local.class)} data-disabled={local.disabled || undefined}>
    <span>{local.children ?? local.label}</span>
    <Show when={local.onRemove}>
      <Button class="sheen-tag-remove" size="xs" disabled={local.disabled} aria-label={local.removeLabel ?? `${theme.messages().remove} ${local.label}`} onClick={() => local.onRemove?.()}>{theme.messages().remove}</Button>
    </Show>
  </Badge>;
}
