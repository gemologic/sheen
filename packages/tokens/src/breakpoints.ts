/**
 * Viewport breakpoints in rem. Media-query rem follows the user's default font size, not the root element,
 * so layouts switch at the same reading width when people enlarge text.
 */
export const breakpoints = Object.freeze({ xs: "22.5rem", sm: "40rem", md: "48rem", lg: "64rem", xl: "80rem" });
export type BreakpointName = keyof typeof breakpoints;
export const breakpointNames: readonly BreakpointName[] = Object.freeze(["xs", "sm", "md", "lg", "xl"]);

/**
 * Canonical media query for a breakpoint. `up` matches at and above the width, `down` strictly below it,
 * so `up` and `down` of the same breakpoint never overlap or leave a gap.
 */
export function breakpointQuery(name: BreakpointName, direction: "up" | "down" = "up"): string {
  return `(width ${direction === "up" ? ">=" : "<"} ${breakpoints[name]})`;
}
