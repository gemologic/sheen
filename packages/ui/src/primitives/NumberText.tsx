import { Index, Show, createEffect, createMemo, createSignal, on, onCleanup, splitProps, useContext } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { NumberFormatContext } from "../theme/number-format-cache.ts";
import { flashChange, motionDuration } from "../utils/change-motion.ts";

export interface NumberTextProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  format?: Intl.NumberFormatOptions;
  /** Tint the number up or down when the value changes after the first render. */
  flash?: boolean;
  /** Count from the previous value to the next one when the value changes after the first render. */
  tween?: boolean;
}

const quietParts = new Set<Intl.NumberFormatPartTypes>(["decimal", "fraction", "unit", "percentSign", "currency", "compact"]);

/** Keep locale ordering and punctuation intact while quieting fractional digits and units. */
export function NumberText(props: NumberTextProps): JSX.Element {
  const [local, others] = splitProps(props, ["value", "format", "class", "flash", "tween", "ref"]);
  const theme = useTheme();
  const numberFormat = useContext(NumberFormatContext);
  const locale = createMemo(() => theme.state().locale);
  const formatter = createMemo(() => numberFormat ? numberFormat(locale(), local.format) : new Intl.NumberFormat(locale(), local.format));
  let host: HTMLSpanElement | undefined;
  let frame = 0;
  const [tweened, setTweened] = createSignal(local.value);
  const shown = (): number => local.tween ? tweened() : local.value;
  createEffect(on(() => local.value, (next, previous) => {
    if (frame) cancelAnimationFrame(frame);
    if (!host || previous === undefined || next === previous || !Number.isFinite(next)) { setTweened(next); return; }
    if (local.flash) flashChange(host, next > previous ? "up" : "down");
    const duration = local.tween ? motionDuration(host) * 2 : 0;
    if (duration === 0) { setTweened(next); return; }
    const from = tweened(), start = performance.now();
    const step = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      setTweened(progress === 1 ? next : from + (next - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }, { defer: true }));
  onCleanup(() => { if (frame) cancelAnimationFrame(frame); });
  const parts = createMemo(() => {
    if (!Number.isFinite(local.value)) throw new Error("NumberText requires a finite value");
    const rendered: Intl.NumberFormatPart[] = [];
    for (const part of formatter().formatToParts(shown())) {
      const previous = rendered.at(-1);
      if (!quietParts.has(part.type) && previous?.type === "literal") previous.value += part.value;
      else rendered.push(quietParts.has(part.type) ? part : { type: "literal", value: part.value });
    }
    return rendered;
  });
  return <span {...others} ref={element => {
    host = element;
    if (typeof local.ref === "function") local.ref(element);
  }} class={cn("sheen-number-text", local.class)}><Index each={parts()}>{part =>
    <Show when={quietParts.has(part().type)} fallback={part().value}>
      <span data-number-part={part().type}>{part().value}</span>
    </Show>
  }</Index></span>;
}
