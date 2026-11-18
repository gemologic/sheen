import { Show, children, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export type MessageFrom = "user" | "assistant" | "system";

export interface MessageProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "ref"> {
  ref?: HTMLElement | ((element: HTMLElement) => void);
  from: MessageFrom;
  author?: JSX.Element;
  avatar?: JSX.Element;
  timestamp?: string;
  timeLabel?: string;
  actions?: JSX.Element;
}

/** One conversation turn: optional avatar and author header, the content, and an actions row. */
export function Message(props: MessageProps): JSX.Element {
  const [local, others] = splitProps(props, ["ref", "from", "author", "avatar", "timestamp", "timeLabel", "actions", "class", "children"]);
  const authorId = createUniqueId();
  const avatar = children(() => local.avatar);
  const author = children(() => local.author);
  const actions = children(() => local.actions);
  const content = children(() => local.children);
  const hasAuthor = () => author.toArray().length > 0;
  return <article {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-message", local.class)} data-from={local.from}
    aria-labelledby={others["aria-labelledby"] ?? (hasAuthor() ? authorId : undefined)}>
    <Show when={avatar.toArray().length > 0}><div class="sheen-message-avatar">{avatar()}</div></Show>
    <div class="sheen-message-body">
      <Show when={hasAuthor() || local.timeLabel}>
        <header class="sheen-message-header">
          <Show when={hasAuthor()}><span class="sheen-message-author" id={authorId}>{author()}</span></Show>
          <Show when={local.timeLabel}>{label => <time class="sheen-message-time" dateTime={local.timestamp}>{label()}</time>}</Show>
        </header>
      </Show>
      <div class="sheen-message-content">{content()}</div>
      <Show when={actions.toArray().length > 0}><div class="sheen-message-actions">{actions()}</div></Show>
    </div>
  </article>;
}
