import { For, Show, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import type { Messages } from "../theme/messages.ts";
import { cn } from "../utils/cn.ts";

export type WorkflowState = "completed" | "current" | "upcoming" | "error";

export interface ActivityTimelineItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly actor?: string;
  readonly timestamp?: string;
  readonly timeLabel?: string;
  readonly state: WorkflowState;
}

export interface ActivityTimelineProps extends Omit<JSX.OlHTMLAttributes<HTMLOListElement>, "children" | "ref"> {
  ref?: HTMLOListElement | ((element: HTMLOListElement) => void);
  label: string;
  items: readonly ActivityTimelineItem[];
  density?: "compact" | "default";
  refreshing?: boolean;
}

function stateLabel(state: WorkflowState, messages: Messages): string {
  if (state === "completed") return messages.workflowCompleted;
  if (state === "current") return messages.workflowCurrent;
  if (state === "error") return messages.workflowError;
  return messages.workflowUpcoming;
}

function marker(state: WorkflowState): string {
  if (state === "completed") return "✓";
  if (state === "current") return "●";
  if (state === "error") return "!";
  return "○";
}

/** A stable-ID chronological activity list with explicit non-color state labels. */
export function ActivityTimeline(props: ActivityTimelineProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["ref", "class", "label", "items", "density", "refreshing", "aria-label"]);
  const byId = createMemo(() => {
    const result = new Map<string, ActivityTimelineItem>();
    for (const item of local.items) {
      if (!item.id.trim()) throw new Error("ActivityTimeline: item IDs must be nonempty");
      if (result.has(item.id)) throw new Error(`ActivityTimeline: duplicate item ID ${JSON.stringify(item.id)}`);
      if (!item.title.trim()) throw new Error(`ActivityTimeline: title must be nonempty for ${JSON.stringify(item.id)}`);
      if ((item.timestamp === undefined) !== (item.timeLabel === undefined) || (item.timestamp !== undefined && (!item.timestamp.trim() || !item.timeLabel?.trim()))) throw new Error(`ActivityTimeline: timestamp and timeLabel must be supplied together for ${JSON.stringify(item.id)}`);
      result.set(item.id, item);
    }
    return result;
  });
  const ids = createMemo(() => [...byId().keys()]);
  return <ol {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-activity-timeline", local.class)} aria-label={local["aria-label"] ?? local.label}
    aria-busy={local.refreshing || undefined} data-density={local.density ?? "default"} data-refreshing={local.refreshing || undefined}>
    <For each={ids()}>{id => {
      const item = () => byId().get(id);
      return <Show when={item()}>{current => <li class="sheen-activity-timeline-item" data-activity-id={id} data-state={current().state} aria-current={current().state === "current" ? "true" : undefined}>
        <span class="sheen-workflow-marker" data-state={current().state} aria-hidden="true">{marker(current().state)}</span>
        <article class="sheen-activity-timeline-content">
          <header><strong>{current().title}</strong><span class="sheen-workflow-state">{stateLabel(current().state, theme.messages())}</span></header>
          <Show when={current().description}>{description => <p>{description()}</p>}</Show>
          <Show when={current().actor}>{actor => <span class="sheen-activity-timeline-actor">{actor()}</span>}</Show>
          <Show when={current().timestamp && current().timeLabel}><time dateTime={current().timestamp}>{current().timeLabel}</time></Show>
        </article>
      </li>}</Show>;
    }}</For>
  </ol>;
}
