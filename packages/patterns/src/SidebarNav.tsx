import { Collapsible, DropdownMenu, Heading, NavItem, NavList } from "@gemologic/sheen";
import { For, Show, children, createEffect, createMemo, createSignal, on, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { MenuItem } from "@gemologic/sheen";
import { createSidebarFocusRecovery } from "./sidebar-focus.ts";

export interface SidebarNavActions {
  readonly label: string;
  readonly items: readonly MenuItem[];
}

export interface SidebarNavLink {
  readonly kind: "link";
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly match?: "exact" | "prefix";
  readonly icon?: JSX.Element;
  readonly badge?: JSX.Element;
  readonly actions?: SidebarNavActions;
}
export interface SidebarNavGroup {
  readonly kind: "group";
  readonly id: string;
  readonly label: string;
  readonly items: readonly SidebarNavEntry[];
}
export type SidebarNavEntry = SidebarNavLink | SidebarNavGroup;
export interface SidebarNavSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly SidebarNavEntry[];
}
export interface SidebarNavProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  sections: readonly SidebarNavSection[];
  pathname: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  collapsed?: boolean;
  header?: JSX.Element;
  footer?: JSX.Element;
}

/** Validate identities once per data revision and select one most-specific local destination. */
export function resolveSidebarNavigation(sections: readonly SidebarNavSection[], pathname: string) {
  const ids = new Set<string>();
  let active: { id: string; length: number; ancestors: readonly string[] } | undefined;
  const path = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
  const validate = (id: string, label: string) => {
    if (!id.trim() || !label.trim()) throw new Error("SidebarNav requires nonempty IDs and labels");
    if (ids.has(id)) throw new Error(`Duplicate SidebarNav ID: ${id}`);
    ids.add(id);
  };
  const visit = (entries: readonly SidebarNavEntry[], ancestors: readonly string[]) => {
    for (const entry of entries) {
      validate(entry.id, entry.label);
      if (entry.kind === "group") { visit(entry.items, [...ancestors, entry.id]); continue; }
      if (!entry.href.trim()) throw new Error(`SidebarNav requires a destination for ${entry.id}`);
      if (entry.actions !== undefined && (!entry.actions.label.trim() || entry.actions.items.length === 0)) {
        throw new Error(`SidebarNav requires a named, nonempty action menu for ${entry.id}`);
      }
      if (!entry.href.startsWith("/") || entry.href.startsWith("//")) continue;
      const target = entry.href.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
      const matches = path === target || (entry.match === "prefix" && target !== "/" && path.startsWith(`${target}/`));
      if (matches && (!active || target.length > active.length)) active = { id: entry.id, length: target.length, ancestors };
    }
  };
  for (const section of sections) { validate(section.id, section.label); visit(section.items, []); }
  return active;
}

function Entries(props: { items: readonly SidebarNavEntry[]; activeId: string | undefined; ancestors: readonly string[]; collapsed: boolean }): JSX.Element {
  const entries = createMemo(() => new Map(props.items.map(entry => [entry.id, entry])));
  return <For each={[...entries().keys()]}>{id => {
    const link = createMemo(() => { const entry = entries().get(id); return entry?.kind === "link" ? entry : undefined; });
    const group = createMemo(() => { const entry = entries().get(id); return entry?.kind === "group" ? entry : undefined; });
    return <>
      <Show when={link()}>{entry => <NavItem href={entry().href} label={entry().label} current={props.activeId === id} icon={entry().icon ?? <span>{Array.from(entry().label)[0]}</span>} badge={entry().badge} tooltip={entry().label} tooltipDisabled={!props.collapsed}
        actions={<Show when={entry().actions}>{actions => <DropdownMenu triggerLabel={actions().label} items={actions().items} placement="bottom-end" class="sheen-sidebar-item-menu"
          trigger={<span class="sheen-sidebar-item-more" aria-hidden="true" />} />}</Show>} />}</Show>
      <Show when={group()}>{entry => <li><Group group={entry()} activeId={props.activeId} ancestors={props.ancestors} collapsed={props.collapsed} /></li>}</Show>
    </>;
  }}</For>;
}
function Group(props: { group: SidebarNavGroup; activeId: string | undefined; ancestors: readonly string[]; collapsed: boolean }): JSX.Element {
  const containsActive = createMemo(() => props.ancestors.includes(props.group.id));
  const activeId = createMemo(() => props.activeId);
  const [open, setOpen] = createSignal(containsActive());
  createEffect(on([activeId, containsActive], () => { if (containsActive()) setOpen(true); }));
  return <Collapsible label={props.group.label} open={props.collapsed || open()} onOpenChange={setOpen} class="sheen-sidebar-group">
    <NavList label={props.group.label}><Entries items={props.group.items} activeId={props.activeId} ancestors={props.ancestors} collapsed={props.collapsed} /></NavList>
  </Collapsible>;
}

export function SidebarNav(props: SidebarNavProps): JSX.Element {
  const [local, others] = splitProps(props, ["sections", "pathname", "headingLevel", "class", "ref", "collapsed", "header", "footer"]);
  let root: HTMLDivElement | undefined;
  createSidebarFocusRecovery(() => root);
  const header = children(() => local.header);
  const footer = children(() => local.footer);
  const active = createMemo(() => resolveSidebarNavigation(local.sections, local.pathname));
  const sections = createMemo(() => new Map(local.sections.map(section => [section.id, section])));
  return <div {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} tabIndex={others.tabIndex ?? -1} data-collapsed={local.collapsed ?? false} class={`sheen-sidebar-nav ${local.class ?? ""}`}>
    <Show when={header()}>{content => <header class="sheen-sidebar-header">{content()}</header>}</Show>
    <div class="sheen-sidebar-navigation"><For each={[...sections().keys()]}>{id => <Show when={sections().get(id)}>{section => <section>
      <Heading level={local.headingLevel ?? 3} size="h4">{section().label}</Heading>
      <NavList label={section().label}><Entries items={section().items} activeId={active()?.id} ancestors={active()?.ancestors ?? []} collapsed={local.collapsed ?? false} /></NavList>
    </section>}</Show>}</For></div>
    <Show when={footer()}>{content => <footer class="sheen-sidebar-footer">{content()}</footer>}</Show>
  </div>;
}
