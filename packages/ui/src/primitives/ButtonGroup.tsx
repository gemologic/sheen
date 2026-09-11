import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface ButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  orientation?: "horizontal" | "vertical";
}

/** Related actions, not a toolbar or a selection widget. */
export function ButtonGroup(props: ButtonGroupProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "orientation", "class", "children"]);
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("ButtonGroup requires a nonempty accessible label");
    return local.label;
  });
  return <div {...others} role="group" aria-label={label()} class={cn("sheen-button-group", local.class)} data-orientation={local.orientation ?? "horizontal"}>{local.children}</div>;
}
