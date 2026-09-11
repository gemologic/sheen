import { Show, children, createContext, createMemo, splitProps, useContext } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { createLinkFocusRecovery } from "./link-focus.ts";
import { LinkTooltip } from "./LinkTooltip.tsx";

export interface NavListProps extends JSX.HTMLAttributes<HTMLElement> {
  label: string;
}
export interface NavItemProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "aria-current"> {
  href: string;
  label: string;
  current?: boolean;
  icon?: JSX.Element;
  badge?: JSX.Element;
  tooltip?: string;
  tooltipDisabled?: boolean;
  /** Optional sibling controls. Interactive content is never nested inside the destination link. */
  actions?: JSX.Element;
}

const NavOwner = createContext(false);

export function NavList(props: NavListProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "class", "children", "ref"]);
  let root: HTMLElement | undefined;
  createLinkFocusRecovery(() => root);
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("NavList requires a nonempty accessible label");
    return local.label;
  });
  return <nav {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} tabIndex={others.tabIndex ?? -1} aria-label={label()} class={cn("sheen-nav-list", local.class)}>
    <ul><NavOwner.Provider value={true}>{local.children}</NavOwner.Provider></ul>
  </nav>;
}

export function NavItem(props: NavItemProps): JSX.Element {
  if (!useContext(NavOwner)) throw new Error("NavItem requires a NavList owner");
  const [local, others] = splitProps(props, ["href", "label", "current", "class", "icon", "badge", "tooltip", "tooltipDisabled", "actions"]);
  const icon = children(() => local.icon);
  const badge = children(() => local.badge);
  const actions = children(() => local.actions);
  const href = createMemo(() => {
    if (!local.href.trim() || !local.label.trim()) throw new Error("NavItem requires nonempty href and label");
    return local.href;
  });
  const content = children(() => <>
    <Show when={icon()}><span class="sheen-nav-item-icon" aria-hidden="true">{icon()}</span></Show>
    <span class="sheen-nav-item-label">{local.label}</span>
    <Show when={badge()}><span class="sheen-nav-item-badge">{badge()}</span></Show>
  </>);
  return <li class="sheen-nav-item-row" data-current={local.current || undefined} data-has-actions={actions() != null || undefined}>
    <Show when={local.tooltip !== undefined} fallback={<a {...others} href={href()} aria-current={local.current ? "page" : undefined} class={cn("sheen-nav-item", local.class)}>{content()}</a>}>
      <LinkTooltip {...others} href={href()} content={local.tooltip ?? ""} tooltipDisabled={local.tooltipDisabled ?? false} aria-current={local.current ? "page" : undefined} class={cn("sheen-nav-item", local.class)}>{content()}</LinkTooltip>
    </Show>
    <Show when={actions() != null}><span class="sheen-nav-item-actions">{actions()}</span></Show>
  </li>;
}
