import { For, Show, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface ConversationItem {
  readonly id: string;
}

export type ConversationProps<Item extends ConversationItem> = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "ref" | "role"> & {
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  items: readonly Item[];
  children: (item: Accessor<Item>) => JSX.Element;
  label?: string;
  stickToBottom?: boolean;
  jumpLabel?: string;
};

// Distance from the end, in CSS pixels, still treated as "at the bottom" so subpixel layout cannot unstick the thread.
const bottomTolerance = 4;
// Later members of one appended batch share the last stagger step instead of delaying indefinitely.
const maximumStagger = 6;

/**
 * A scrolling message log keyed by stable item IDs. Existing message nodes survive appends and content updates.
 * While the reader is at the end, growth keeps the newest content in view; scrolling away stops that until they return.
 */
export function Conversation<Item extends ConversationItem>(props: ConversationProps<Item>): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["ref", "items", "children", "label", "stickToBottom", "jumpLabel", "class"]);
  const index = createMemo(() => {
    const map = new Map<string, Item>();
    for (const item of local.items) {
      if (!item.id) throw new Error("Conversation: item ids must be nonempty");
      if (map.has(item.id)) throw new Error(`Conversation: duplicate item id "${item.id}"`);
      map.set(item.id, item);
    }
    return map;
  });
  const ids = createMemo(() => [...index().keys()]);
  const [stuck, setStuck] = createSignal(true);
  const sticky = () => local.stickToBottom !== false;
  let scroller: HTMLDivElement | undefined;
  let content: HTMLDivElement | undefined;
  let mounted = false;
  let batch = 0;
  let batchReset = false;
  let lastTop = 0;
  const atBottom = (element: HTMLDivElement) => element.scrollHeight - element.scrollTop - element.clientHeight <= bottomTolerance;
  const scrollToEnd = () => {
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
    lastTop = scroller.scrollTop;
  };
  // Growth between a programmatic scroll and its event must not read as the reader leaving the end, so only upward movement unsticks.
  const onScroll = (element: HTMLDivElement) => {
    const top = element.scrollTop;
    if (top < lastTop - bottomTolerance) setStuck(false);
    else if (atBottom(element)) setStuck(true);
    lastTop = top;
  };
  onMount(() => {
    mounted = true;
    if (!scroller || !content) return;
    const element = scroller;
    if (sticky()) scrollToEnd();
    setStuck(atBottom(element));
    lastTop = element.scrollTop;
    // Content growth (appends, streaming text, late images) emits no scroll event; follow it only while stuck.
    const observer = new ResizeObserver(() => {
      if (sticky() && stuck()) scrollToEnd();
      else { lastTop = element.scrollTop; setStuck(atBottom(element)); }
    });
    observer.observe(content);
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  const entering = () => {
    if (!mounted) return undefined;
    if (!batchReset) {
      batchReset = true;
      queueMicrotask(() => { batch = 0; batchReset = false; });
    }
    return Math.min(batch++, maximumStagger);
  };
  return <div {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-conversation", local.class)} data-stuck={stuck() || undefined}>
    <div ref={scroller} class="sheen-conversation-scroller" role="log" aria-label={local.label ?? theme.messages().conversation} tabindex="0"
      onScroll={event => onScroll(event.currentTarget)} onWheel={event => { const element = event.currentTarget; if (event.deltaY < 0 && element.scrollTop > 0) setStuck(false); }}>
      <div ref={content} class="sheen-conversation-content">
        <For each={ids()}>{id => {
          const stagger = entering();
          const [animating, setAnimating] = createSignal(stagger !== undefined);
          return <Show when={index().get(id)}>{item =>
            <div class="sheen-conversation-item" data-id={id} data-entering={animating() || undefined}
              style={stagger === undefined ? undefined : { "--sheen-conversation-stagger": String(stagger) }}
              onAnimationEnd={event => { if (event.target === event.currentTarget) setAnimating(false); }}>{local.children(item)}</div>
          }</Show>;
        }}</For>
      </div>
    </div>
    <Show when={sticky() && !stuck()}>
      <Button class="sheen-conversation-jump" variant="outline" size="sm" onClick={() => { scrollToEnd(); setStuck(true); scroller?.focus({ preventScroll: true }); }}>
        {local.jumpLabel ?? theme.messages().jumpToLatest}
      </Button>
    </Show>
  </div>;
}
