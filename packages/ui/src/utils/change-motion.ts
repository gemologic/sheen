export type ChangeDirection = "up" | "down";

const flashId = "sheen-change-flash";

/** Milliseconds of `--sheen-duration-slow` on the element, which reduced motion zeroes. */
export function motionDuration(element: Element): number {
  const value = getComputedStyle(element).getPropertyValue("--sheen-duration-slow").trim();
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return value.endsWith("ms") ? amount : amount * 1000;
}

/**
 * Briefly tints an element with its market direction after a value change. Callers
 * skip the initial render; reduced motion turns this into a no-op.
 */
export function flashChange(element: HTMLElement, direction: ChangeDirection): void {
  const duration = motionDuration(element) * 4;
  if (duration === 0 || typeof element.animate !== "function") return;
  const tint = getComputedStyle(element).getPropertyValue(direction === "up" ? "--sheen-color-market-up" : "--sheen-color-market-down").trim();
  if (!tint) return;
  for (const animation of element.getAnimations()) if (animation.id === flashId) animation.cancel();
  const animation = element.animate([
    { boxShadow: `inset 0 0 0 100vmax color-mix(in srgb, ${tint} 22%, transparent)` },
    { boxShadow: "inset 0 0 0 100vmax transparent" },
  ], { duration, easing: "cubic-bezier(0, 0, 0, 1)" });
  animation.id = flashId;
}
