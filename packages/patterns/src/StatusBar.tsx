import { useTheme } from "@gemologic/sheen";
import { For, Show, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export type ConnectionState = "connected" | "connecting" | "disconnected" | "degraded" | "unknown";
export interface StatusCount { label: string; value: number }
export interface StatusBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label?: string;
  connection?: ConnectionState;
  tasks?: number;
  counts?: readonly StatusCount[];
}

export function StatusBar(props: StatusBarProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["label", "connection", "tasks", "counts", "class", "children"]);
  const numbers = createMemo(() => new Intl.NumberFormat(theme.state().locale));
  const label = createMemo(() => {
    const value = local.label ?? theme.messages().statusBar;
    if (!value.trim()) throw new Error("StatusBar requires a nonempty label");
    return value;
  });
  const tasks = createMemo(() => {
    const value = local.tasks ?? 0;
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("StatusBar tasks must be a nonnegative safe integer");
    return value;
  });
  const counts = createMemo(() => {
    const values = local.counts ?? [];
    const labels = new Set<string>();
    for (const count of values) {
      if (!count.label.trim() || labels.has(count.label)) throw new Error("StatusBar counts require unique nonempty labels");
      if (!Number.isSafeInteger(count.value) || count.value < 0) throw new Error("StatusBar counts must be nonnegative safe integers");
      labels.add(count.label);
    }
    return values;
  });
  const connection = () => {
    const state = local.connection;
    if (!state) return undefined;
    const messages = theme.messages();
    return state === "unknown" ? messages.unknownConnection : messages[state];
  };
  return <div {...others} role="group" aria-label={label()} class={`sheen-status-bar ${local.class ?? ""}`}>
    <div role="status" aria-atomic="true" class="sheen-status-summary">
      <Show when={local.connection}><span class="sheen-status-connection" data-connection={local.connection}><span aria-hidden="true" class="sheen-status-dot" />{connection()}</span></Show>
      <Show when={local.tasks !== undefined}><span class="sheen-status-tasks" data-pending={tasks() > 0 || undefined} data-idle={tasks() === 0 || undefined}
        aria-hidden={tasks() === 0 || undefined}>{theme.messages().backgroundTasks}: {numbers().format(tasks())}</span></Show>
    </div>
    <Show when={counts().length > 0}><dl class="sheen-status-counts"><For each={counts()}>{count => <div><dt>{count.label}</dt><dd>{numbers().format(count.value)}</dd></div>}</For></dl></Show>
    {local.children}
  </div>;
}
