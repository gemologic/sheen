import { Link, ScrollArea } from "@gemologic/sheen";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { usePaneScrollRestoration } from "./pane-restoration.ts";
import type { RouterAdapter, RouterLocation } from "./router.ts";

export interface ListDetailItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly match?: "exact" | "prefix";
  readonly description?: string;
  readonly leading?: JSX.Element;
  readonly trailing?: JSX.Element;
}

export interface ListDetailLayoutProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly router: RouterAdapter;
  readonly items: readonly ListDetailItem[];
  readonly listLabel: string;
  readonly detailLabel: string;
  readonly listHref: string;
  readonly backLabel: string;
  readonly detail: JSX.Element;
  readonly emptyDetail?: JSX.Element;
  readonly detailReady?: boolean;
  readonly detailPaneId?: string;
}

function path(value: string): string {
  return value.split(/[?#]/u, 1)[0]?.replace(/\/+$/u, "") || "/";
}

function localHref(value: string, label: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) throw new Error(`${label} must be a local absolute path`);
  return value;
}

export function resolveListDetailActive(items: readonly ListDetailItem[], location: RouterLocation): string | null {
  if (!Array.isArray(items)) throw new Error("ListDetailLayout items must be an array");
  const ids = new Set<string>();
  const current = path(location.pathname);
  const currentLocation = `${location.pathname}${location.search}${location.hash}`;
  let active: { readonly id: string; readonly length: number } | undefined;
  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new Error("ListDetailLayout items must be objects");
    if (!item.id.trim() || item.id !== item.id.trim() || ids.has(item.id)) throw new Error("ListDetailLayout item IDs must be unique nonempty trimmed strings");
    ids.add(item.id);
    if (!item.label.trim()) throw new Error(`ListDetailLayout item ${item.id} requires a nonempty label`);
    const href = localHref(item.href, `ListDetailLayout item ${item.id} href`);
    const target = path(href);
    if (item.match !== undefined && item.match !== "exact" && item.match !== "prefix") throw new Error(`ListDetailLayout item ${item.id} has an invalid match`);
    if (item.description !== undefined && !item.description.trim()) throw new Error(`ListDetailLayout item ${item.id} has an empty description`);
    const matches = item.match === "prefix"
      ? current === target || (target !== "/" && current.startsWith(`${target}/`))
      : /[?#]/u.test(href) ? currentLocation === href : current === target;
    if (matches && (!active || target.length > active.length)) active = { id: item.id, length: target.length };
  }
  return active?.id ?? null;
}

function plainNavigation(event: MouseEvent): boolean {
  const anchor = event.currentTarget;
  return !event.defaultPrevented && event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
    && anchor instanceof HTMLAnchorElement && (!anchor.target || anchor.target === "_self") && !anchor.hasAttribute("download");
}

export function ListDetailLayout(props: ListDetailLayoutProps): JSX.Element {
  const [local, others] = splitProps(props, ["router", "items", "listLabel", "detailLabel", "listHref", "backLabel", "detail", "emptyDetail", "detailReady", "detailPaneId", "class", "ref"]);
  const generatedPaneId = createUniqueId();
  const [detailPane, setDetailPane] = createSignal<HTMLDivElement>();
  const [listPane, setListPane] = createSignal<HTMLDivElement>();
  const itemLinks = new Map<string, HTMLAnchorElement>();
  const items = createMemo(() => {
    resolveListDetailActive(local.items, local.router.location());
    return new Map(local.items.map(item => [item.id, item]));
  });
  const itemIds = createMemo(() => [...items().keys()]);
  const activeId = createMemo(() => resolveListDetailActive(local.items, local.router.location()));
  const active = createMemo(() => {
    const id = activeId();
    return id === null ? undefined : items().get(id);
  });
  const [rovingId, setRovingId] = createSignal(activeId() ?? itemIds()[0]);
  const listLabel = createMemo(() => {
    if (!local.listLabel.trim()) throw new Error("ListDetailLayout requires a nonempty listLabel");
    return local.listLabel;
  });
  const detailLabel = createMemo(() => {
    if (!local.detailLabel.trim()) throw new Error("ListDetailLayout requires a nonempty detailLabel");
    return local.detailLabel;
  });
  const listHref = createMemo(() => localHref(local.listHref, "ListDetailLayout listHref"));
  const backLabel = createMemo(() => {
    if (!local.backLabel.trim()) throw new Error("ListDetailLayout requires a nonempty backLabel");
    return local.backLabel;
  });
  const paneId = createMemo(() => {
    const value = local.detailPaneId ?? `list-detail-${generatedPaneId}`;
    if (!value.trim()) throw new Error("ListDetailLayout detailPaneId must be nonempty");
    return value;
  });
  usePaneScrollRestoration(paneId(), detailPane, { ready: () => local.detailReady ?? true });

  let previousIds = itemIds();
  createEffect(() => {
    const nextIds = itemIds();
    const current = rovingId();
    if (current && nextIds.includes(current)) { previousIds = nextIds; return; }
    const oldIndex = current ? previousIds.indexOf(current) : 0;
    const next = nextIds[Math.max(0, Math.min(oldIndex, nextIds.length - 1))];
    const pane = listPane();
    const focused = pane?.ownerDocument.activeElement;
    const recover = Boolean(pane && focused instanceof Node && pane.contains(focused));
    setRovingId(next);
    if (recover && next) queueMicrotask(() => itemLinks.get(next)?.focus({ preventScroll: true }));
    previousIds = nextIds;
  });
  createEffect(() => {
    const selected = activeId();
    if (selected) setRovingId(selected);
  });

  let activationOrigin: string | undefined;
  onMount(() => {
    const document = detailPane()?.ownerDocument ?? listPane()?.ownerDocument;
    const view = document?.defaultView;
    if (!document || !view) return;
    const media = view.matchMedia("(max-width: 767px)");
    let previous = activeId();
    let focusFrame: number | undefined;
    const schedule = (element: HTMLElement | undefined) => {
      if (!element) return;
      if (focusFrame !== undefined) view.cancelAnimationFrame(focusFrame);
      focusFrame = view.requestAnimationFrame(() => { focusFrame = undefined; element.focus({ preventScroll: true }); });
    };
    createEffect(() => {
      const next = activeId();
      const ready = local.detailReady ?? true;
      if (!media.matches || next === previous) return;
      if (next && activationOrigin === next && ready) schedule(detailPane());
      if (!next && previous) schedule(itemLinks.get(activationOrigin ?? previous));
      previous = next;
    });
    onCleanup(() => { if (focusFrame !== undefined) view.cancelAnimationFrame(focusFrame); });
  });

  function navigate(event: MouseEvent, href: string, origin?: string): void {
    if (!plainNavigation(event)) return;
    event.preventDefault();
    activationOrigin = origin ?? activeId() ?? undefined;
    local.router.navigate(href, { scroll: false });
  }

  function moveFocus(event: KeyboardEvent, id: string): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const ids = itemIds();
    const index = ids.indexOf(id);
    const nextIndex = event.key === "ArrowDown" ? Math.min(ids.length - 1, index + 1)
      : event.key === "ArrowUp" ? Math.max(0, index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? ids.length - 1
      : null;
    if (nextIndex === null || nextIndex < 0) return;
    const next = ids[nextIndex];
    if (!next) return;
    event.preventDefault();
    setRovingId(next);
    const registered = itemLinks.get(next);
    const link = registered ?? [...(listPane()?.querySelectorAll<HTMLElement>("[data-list-detail-id]") ?? [])]
      .find(element => element.dataset.listDetailId === next);
    link?.focus({ preventScroll: true });
  }

  function ItemLink(itemProps: { readonly id: string }): JSX.Element {
    const item = () => items().get(itemProps.id);
    let element: HTMLAnchorElement | undefined;
    onCleanup(() => { if (element && itemLinks.get(itemProps.id) === element) itemLinks.delete(itemProps.id); });
    return <Show when={item()}>{value => <li class="sheen-list-detail-item">
      <a ref={node => { element = node; itemLinks.set(itemProps.id, node); }} class="sheen-list-detail-link" href={value().href} data-list-detail-id={itemProps.id}
        aria-current={activeId() === itemProps.id ? "page" : undefined} tabIndex={rovingId() === itemProps.id ? 0 : -1}
        onFocus={() => setRovingId(itemProps.id)} onKeyDown={event => moveFocus(event, itemProps.id)} onClick={event => navigate(event, value().href, itemProps.id)}>
        <Show when={value().leading}><span class="sheen-list-detail-leading" aria-hidden="true">{value().leading}</span></Show>
        <span class="sheen-list-detail-copy"><span class="sheen-list-detail-label">{value().label}</span><Show when={value().description}><span class="sheen-list-detail-description">{value().description}</span></Show></span>
        <Show when={value().trailing}><span class="sheen-list-detail-trailing">{value().trailing}</span></Show>
      </a>
    </li>}</Show>;
  }

  return <div {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={`sheen-list-detail ${local.class ?? ""}`} data-active-detail={active() ? "" : undefined} data-active-id={activeId() ?? undefined}>
    <div class="sheen-list-detail-list-pane">
      <ScrollArea ref={setListPane} class="sheen-list-detail-list" label={listLabel()}>
        <ul><For each={itemIds()}>{id => <ItemLink id={id} />}</For></ul>
      </ScrollArea>
    </div>
    <div class="sheen-list-detail-detail-pane">
      <ScrollArea ref={setDetailPane} class="sheen-list-detail-detail" label={detailLabel()} tabIndex={-1}>
        <Show when={active()} fallback={<div class="sheen-list-detail-empty">{local.emptyDetail}</div>}>
          <Link class="sheen-list-detail-back" href={listHref()} onClick={event => navigate(event, listHref())}>{backLabel()}</Link>
          <div class="sheen-list-detail-content">{local.detail}</div>
        </Show>
      </ScrollArea>
    </div>
  </div>;
}
