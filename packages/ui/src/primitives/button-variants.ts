import type { ClassValue } from "clsx";
import { cn } from "../utils/cn.ts";

/** Class-only composition for native controls; behavior belongs to the component. */
export interface ButtonVariantProps {
  readonly variant?: "solid" | "soft" | "outline" | "ghost" | "link" | undefined;
  readonly tone?: "neutral" | "accent" | "danger" | "success" | undefined;
  readonly size?: "xs" | "sm" | "md" | "lg" | undefined;
  readonly class?: ClassValue | undefined;
}

export function buttonVariants(options: ButtonVariantProps = {}): string {
  return cn(
    "sheen-button",
    `sheen-button-${options.variant ?? "ghost"}`,
    `sheen-button-${options.tone ?? "neutral"}`,
    `sheen-button-${options.size ?? "md"}`,
    options.class,
  );
}
