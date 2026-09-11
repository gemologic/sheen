import { For, Show, createEffect, createMemo, createSignal, on, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "@gemologic/sheen";
import { adminNavigationLinks, resolveAdminNavigation } from "./admin-config.ts";
import type { AdminNavigationLink, AdminNavigationModel } from "./admin-config.ts";

export interface TopNavProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  readonly navigation: AdminNavigationModel;
  readonly pathname: string;
  readonly compact?: boolean;
}

export function TopNav(props: TopNavProps): JSX.Element {
  const theme = useTheme();
  const [local, rest] = splitProps(props, ["navigation", "pathname", "compact", "class", "ref"]);
  const active = createMemo(() => resolveAdminNavigation(local.navigation, local.pathname));
  const links = createMemo(() => adminNavigationLinks(local.navigation));
  const index = createMemo(() => new Map(links().map(link => [link.id, link])));
  const ids = createMemo(() => [...index().keys()]);
  const [roving, setRoving] = createSignal<string>();
  const tabStop = createMemo(() => {
    const current = roving();
    if (current && index().has(current)) return current;
    return active()?.id ?? ids()[0];
  });
  const elements = new Map<string, HTMLAnchorElement>();
  createEffect(on(ids, current => {
    const focused = roving();
    if (focused && !current.includes(focused)) setRoving(active()?.id ?? current[0]);
  }, { defer: true }));
  const move = (event: KeyboardEvent, id: string): void => {
    const current = ids();
    const at = current.indexOf(id);
    if (at < 0 || current.length === 0) return;
    const rtl = theme.state().direction === "rtl";
    const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const backward = event.key === (rtl ? "ArrowRight" : "ArrowLeft");
    let next: number | undefined;
    if (forward) next = (at + 1) % current.length;
    else if (backward) next = (at - 1 + current.length) % current.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = current.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    const nextId = current[next];
    if (!nextId) return;
    setRoving(nextId);
    const target = elements.get(nextId);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  return <nav {...rest} ref={local.ref} aria-label={local.navigation.label} class={`sheen-admin-top-nav ${local.class ?? ""}`} data-compact={local.compact ?? true}>
    <ul><For each={ids()}>{id => <Show when={index().get(id)}>{item => <TopNavLink item={item()} current={active()?.id === id} tabStop={tabStop() === id}
      ref={element => { elements.set(id, element); }} onFocus={() => setRoving(id)} onKeyDown={event => move(event, id)} />}</Show>}</For></ul>
  </nav>;
}

function TopNavLink(props: {
  readonly item: AdminNavigationLink;
  readonly current: boolean;
  readonly tabStop: boolean;
  readonly ref: (element: HTMLAnchorElement) => void;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}): JSX.Element {
  return <li><a ref={props.ref} href={props.item.href} aria-current={props.current ? "page" : undefined} tabIndex={props.tabStop ? 0 : -1}
    onFocus={props.onFocus} onKeyDown={props.onKeyDown} class="sheen-admin-top-nav-link">
    <Show when={props.item.icon}><span class="sheen-admin-nav-icon" aria-hidden="true">{props.item.icon}</span></Show>
    <span>{props.item.label}</span>
    <Show when={props.item.badge}><span class="sheen-admin-nav-badge">{props.item.badge}</span></Show>
  </a></li>;
}
