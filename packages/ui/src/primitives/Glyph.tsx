import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

const paths = {
  "chevron-down": "M4 6l4 4 4-4",
  "chevron-up": "M4 10l4-4 4 4",
  "chevron-left": "M10 4 6 8l4 4",
  "chevron-right": "M6 4l4 4-4 4",
  "chevrons-left": "M8.5 4 4.5 8l4 4M12.5 4l-4 4 4 4",
  "chevrons-right": "M3.5 4l4 4-4 4M7.5 4l4 4-4 4",
  close: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  check: "M3.5 8.5l3 3 6-7",
  plus: "M8 3.5v9M3.5 8h9",
  minus: "M3.5 8h9",
  dot: "M8 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z",
  alert: "M8 4.5v4.25M8 11.25v.25",
  calendar: "M3 4.5h10v8.5H3zM3 7h10M5.5 3v3M10.5 3v3",
  search: "M7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM10 10l3 3",
  bell: "M4.5 11V7.5a3.5 3.5 0 0 1 7 0V11l1 1.25h-9zM6.75 13.5h2.5",
  "trend-up": "M3 11l3.5-3.5 2.5 2.5L13 6M10 6h3v3",
  "trend-down": "M3 5l3.5 3.5L9 6l4 4M10 10h3V7",
  "trend-flat": "M3 8h10M10 5l3 3-3 3",
  more: "M3.5 8h.01M8 8h.01M12.5 8h.01",
  grip: "M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01",
  "status-info": "M14.25 8A6.25 6.25 0 1 1 1.75 8a6.25 6.25 0 0 1 12.5 0zM8 7.25v3.5M8 5v.01",
  "status-success": "M14.25 8A6.25 6.25 0 1 1 1.75 8a6.25 6.25 0 0 1 12.5 0zM5.25 8.25l1.75 1.75 3.75-4",
  "status-warning": "M8 2.25 14.25 13.25H1.75zM8 6.25v3M8 11.25v.01",
  "status-danger": "M14.25 8A6.25 6.25 0 1 1 1.75 8a6.25 6.25 0 0 1 12.5 0zM8 4.75v3.75M8 11v.01",
} satisfies Record<string, string>;

export type GlyphName = keyof typeof paths;
export const glyphNames: readonly GlyphName[] = Object.freeze(Object.keys(paths).filter((name): name is GlyphName => Object.hasOwn(paths, name)));

/** Directional glyphs point toward the logical start or end, so they mirror in right-to-left scopes. */
const directional = new Set<GlyphName>(["chevron-left", "chevron-right", "chevrons-left", "chevrons-right", "trend-up", "trend-down", "trend-flat"]);
/** Glyphs drawn as filled marks rather than strokes. */
const filled = new Set<GlyphName>(["dot"]);

export interface GlyphProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "children"> {
  /** One of the closed set of component-chrome glyphs. */
  readonly name: GlyphName;
}

/**
 * Small decorative stroke glyphs for component chrome (chevrons, close, check, steppers, trends).
 * They inherit the current text color and are always hidden from assistive technology; name the
 * owning control instead. Applications use `@gemologic/sheen-icons` for content imagery.
 */
export function Glyph(props: GlyphProps): JSX.Element {
  const [local, others] = splitProps(props, ["name", "class"]);
  return <svg {...others} class={cn("sheen-glyph", local.class)} data-glyph={local.name} data-mirror={directional.has(local.name) || undefined} viewBox="0 0 16 16" aria-hidden="true">
    <path d={paths[local.name]} fill={filled.has(local.name) ? "currentColor" : "none"} stroke="currentColor" stroke-width={local.name === "more" || local.name === "grip" ? "2.25" : "1.5"} stroke-linecap="round" stroke-linejoin="round" />
  </svg>;
}
