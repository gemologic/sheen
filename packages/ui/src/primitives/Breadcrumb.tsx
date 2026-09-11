import { For, Show, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { createLinkFocusRecovery } from "./link-focus.ts";

export interface BreadcrumbEntry {
  readonly id: string;
  readonly label: string;
  readonly href?: string;
}
export interface BreadcrumbProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  items: readonly BreadcrumbEntry[];
  label?: string;
}

export function Breadcrumb(props: BreadcrumbProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["items", "label", "class", "ref"]);
  let root: HTMLElement | undefined;
  createLinkFocusRecovery(() => root);
  const entries = createMemo(() => {
    const result = new Map<string, BreadcrumbEntry>();
    for (const [index, item] of local.items.entries()) {
      if (!item.id.trim() || !item.label.trim()) throw new Error("Breadcrumb requires nonempty item IDs and labels");
      if (result.has(item.id)) throw new Error(`Breadcrumb duplicate item ID: ${item.id}`);
      if (index < local.items.length - 1 && !item.href?.trim()) throw new Error(`Breadcrumb ancestor requires href: ${item.id}`);
      result.set(item.id, item);
    }
    if (!result.size) throw new Error("Breadcrumb requires at least the current page");
    return result;
  });
  const current = () => local.items.at(-1)?.id;
  return <nav aria-label={local.label ?? theme.messages().breadcrumb} {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} tabIndex={others.tabIndex ?? -1} class={cn("sheen-breadcrumb", local.class)}>
    <ol><For each={[...entries().keys()]}>{id => <li>
      <Show when={id !== current()} fallback={<span aria-current="page">{entries().get(id)?.label}</span>}>
        <a href={entries().get(id)?.href}>{entries().get(id)?.label}</a>
      </Show>
    </li>}</For></ol>
  </nav>;
}
