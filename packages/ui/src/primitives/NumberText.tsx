import { Index, Show, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface NumberTextProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  format?: Intl.NumberFormatOptions;
}

const quietParts = new Set<Intl.NumberFormatPartTypes>(["decimal", "fraction", "unit", "percentSign", "currency", "compact"]);

/** Keep locale ordering and punctuation intact while quieting fractional digits and units. */
export function NumberText(props: NumberTextProps): JSX.Element {
  const [local, others] = splitProps(props, ["value", "format", "class"]);
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  const formatter = createMemo(() => new Intl.NumberFormat(locale(), local.format));
  const parts = createMemo(() => {
    if (!Number.isFinite(local.value)) throw new Error("NumberText requires a finite value");
    return formatter().formatToParts(local.value);
  });
  return <span {...others} class={cn("sheen-number-text", local.class)}><Index each={parts()}>{part =>
    <Show when={quietParts.has(part().type)} fallback={part().value}>
      <span data-number-part={part().type}>{part().value}</span>
    </Show>
  }</Index></span>;
}
