import { Button, Link, cn } from "@gemologic/sheen";
import { For, Show, children, createMemo, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { requireText } from "./marketing-section.tsx";

export interface SiteHeaderLink {
  readonly href: string;
  readonly label: string;
  readonly current?: boolean;
}

export interface SiteHeaderProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  brand: JSX.Element;
  links: readonly SiteHeaderLink[];
  actions?: JSX.Element;
  navigationLabel?: string;
  menuLabel?: string;
  menuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  sticky?: boolean;
}

/** A public-site banner with brand, primary links, actions, and a CSS-collapsed phone disclosure menu. */
export function SiteHeader(props: SiteHeaderProps): JSX.Element {
  const [local, others] = splitProps(props, ["brand", "links", "actions", "navigationLabel", "menuLabel", "menuOpen", "defaultMenuOpen", "onMenuOpenChange", "sticky", "class"]);
  const menuId = `sheen-site-header-menu-${createUniqueId()}`;
  const [draft, setDraft] = createSignal(local.defaultMenuOpen ?? false);
  const open = () => local.menuOpen ?? draft();
  const links = createMemo(() => {
    const byHref = new Map<string, SiteHeaderLink>();
    for (const link of local.links) {
      requireText(link.label, "SiteHeader link labels must be nonempty");
      if (byHref.has(link.href)) throw new Error(`SiteHeader duplicate link href: ${link.href}`);
      byHref.set(link.href, link);
    }
    return byHref;
  });
  const hrefs = createMemo(() => [...links().keys()]);
  const brand = children(() => local.brand);
  const actions = children(() => local.actions);
  let toggle: HTMLButtonElement | undefined;
  const change = (next: boolean): void => {
    if (next === open()) return;
    if (local.menuOpen === undefined) setDraft(next);
    local.onMenuOpenChange?.(next);
  };
  const dismiss = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !open()) return;
    event.preventDefault();
    change(false);
    toggle?.focus({ preventScroll: true });
  };
  const closeAfterNavigation = (event: MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest("a[href]")) change(false);
  };
  return <header {...others} class={cn("sheen-site-header", local.class)} data-menu-open={open()} data-sticky={local.sticky ?? false}>
    <div class="sheen-site-header-bar sheen-marketing-container">
      <div class="sheen-site-header-brand">{brand()}</div>
      <Button ref={toggle} class="sheen-site-header-toggle" variant="ghost" aria-expanded={open()} aria-controls={menuId} onClick={() => change(!open())} onKeyDown={dismiss}>
        <span class="sheen-site-header-toggle-glyph" aria-hidden="true" />{local.menuLabel ?? "Menu"}
      </Button>
      <div id={menuId} class="sheen-site-header-menu" onKeyDown={dismiss} onClick={closeAfterNavigation}>
        <nav class="sheen-site-header-nav" aria-label={local.navigationLabel ?? "Main"}>
          <ul>
            <For each={hrefs()}>{href => <Show when={links().get(href)}>{link => <li>
              <Link href={href} variant="quiet" class="sheen-site-header-link" aria-current={link().current ? "page" : undefined}>{link().label}</Link>
            </li>}</Show>}</For>
          </ul>
        </nav>
        <Show when={actions()}><div class="sheen-site-header-actions">{actions()}</div></Show>
      </div>
    </div>
  </header>;
}
