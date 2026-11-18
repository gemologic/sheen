import { Index, createEffect, createMemo, createSignal, on, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface StreamingTextProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "ref"> {
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  text: string;
  streaming?: boolean;
  completeLabel?: string;
}

/**
 * Plain text that grows while a response streams. Blank lines separate paragraphs; each paragraph keeps its element and text node,
 * so an append rewrites only the final paragraph's text. Assistive technology hears one polite completion instead of every token.
 */
export function StreamingText(props: StreamingTextProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["ref", "text", "streaming", "completeLabel", "class"]);
  const paragraphs = createMemo(() => local.text === "" ? [] : local.text.split(/\n{2,}/u));
  const streaming = () => local.streaming === true;
  const [announcement, setAnnouncement] = createSignal("");
  createEffect(on(streaming, (now, before) => {
    if (now) setAnnouncement("");
    else if (before) setAnnouncement(local.completeLabel ?? theme.messages().responseComplete);
  }, { defer: true }));
  return <div {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-streaming-text", local.class)}
    data-streaming={streaming() || undefined} aria-busy={streaming() || undefined}>
    <div class="sheen-streaming-text-content"><Index each={paragraphs()}>{paragraph => <p>{paragraph()}</p>}</Index></div>
    <span class="sheen-streaming-text-status" role="status">{announcement()}</span>
  </div>;
}
