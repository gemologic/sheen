import { createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useFocusShortcutScope } from "./ShortcutProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface ShortcutScopeProps extends JSX.HTMLAttributes<HTMLDivElement> {
  scope: string;
}

/** Non-focusable by default. Descendant keyboard events activate this view/pane scope. */
export function ShortcutScope(props: ShortcutScopeProps): JSX.Element {
  const [local, others] = splitProps(props, ["scope", "ref", "class", "children"]);
  const [element, setElement] = createSignal<HTMLDivElement>();
  useFocusShortcutScope(() => local.scope, element);
  return <div {...others} ref={node => { setElement(node); if (typeof local.ref === "function") local.ref(node); }}
    class={cn("sheen-shortcut-scope", local.class)} data-sheen-shortcut-scope={local.scope}>{local.children}</div>;
}
