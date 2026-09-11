import { Button, DropdownMenu, useTheme } from "@gemologic/sheen";
import type { MenuAction, MenuCheckbox, MenuItem } from "@gemologic/sheen";
import { For, Show, children, createEffect, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { fitToolbarGroups } from "./toolbar-layout.ts";

export type ToolbarItem = MenuAction | MenuCheckbox;
export interface ToolbarGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ToolbarItem[];
}
export interface ToolbarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  groups: readonly ToolbarGroup[];
  filter?: JSX.Element;
}

function GroupButtons(props: { group: ToolbarGroup }): JSX.Element {
  const items = createMemo(() => new Map(props.group.items.map(item => [item.id, item])));
  return <For each={[...items().keys()]}>{id => <Show when={items().get(id)}>{item =>
    <Button tabIndex={-1} disabled={item().disabled} aria-pressed={checked(item())}
      onClick={() => { const current = item(); if (current.disabled) return; if (current.kind === "action") current.onSelect(); else current.onCheckedChange(!current.checked); }}>{item().label}</Button>
  }</Show>}</For>;
}
function checked(item: ToolbarItem): boolean | undefined { return item.kind === "checkbox" ? item.checked : undefined; }

export function Toolbar(props: ToolbarProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["label", "groups", "filter", "class"]);
  const filter = children(() => local.filter);
  const groups = createMemo(() => {
    if (!local.label.trim()) throw new Error("Toolbar requires a nonempty label");
    const result = new Map<string, ToolbarGroup>();
    for (const group of local.groups) {
      if (!group.id.trim() || !group.label.trim() || result.has(group.id) || !group.items.length) throw new Error("Toolbar groups require unique IDs, nonempty labels, and items");
      const ids = new Set<string>();
      for (const item of group.items) {
        if (!item.id.trim() || !item.label.trim() || ids.has(item.id)) throw new Error("Toolbar items require unique group-local IDs and nonempty labels");
        ids.add(item.id);
      }
      result.set(group.id, group);
    }
    return result;
  });
  const [visible, setVisible] = createSignal(0);
  const [open, setOpen] = createSignal(false);
  const [closing, setClosing] = createSignal(false);
  let actions: HTMLDivElement | undefined;
  let overflow: HTMLDivElement | undefined;
  let frame: number | undefined;
  let disposed = false;
  let remembered: HTMLButtonElement | undefined;
  let focusedButton: HTMLButtonElement | undefined;
  let focusOrder: HTMLButtonElement[] = [];
  let structureChanged = false;
  let recoverEmptyOverflow = false;
  let resize: ResizeObserver | undefined;
  const observed = new Set<Element>();
  const hasOverflow = () => visible() < groups().size;
  const ownsMenuFocus = () => {
    const active = actions?.ownerDocument.activeElement;
    const trigger = overflow?.querySelector("button");
    return Boolean(trigger && active?.closest('[role="menu"]')?.getAttribute("aria-labelledby") === trigger.id);
  };
  const buttons = () => Array.from(actions?.querySelectorAll("button") ?? []).filter(button => !button.disabled && !button.closest("[inert]"));
  const syncFocus = () => {
    const entries = buttons();
    const active = entries.find(button => button === actions?.ownerDocument.activeElement) ?? (remembered && entries.includes(remembered) ? remembered : entries[0]);
    for (const button of actions?.querySelectorAll("button") ?? []) button.tabIndex = button === active ? 0 : -1;
    remembered = active;
  };
  const measure = () => {
    frame = undefined;
    if (!actions || !overflow || disposed) return;
    const elements = Array.from(actions.querySelectorAll<HTMLElement>(":scope > .sheen-toolbar-group"));
    const measured = elements.map(element => element.firstElementChild ?? element);
    const trigger = overflow.querySelector("button") ?? overflow;
    const targets = [actions, trigger, ...measured];
    for (const element of targets) if (!observed.has(element)) { resize?.observe(element); observed.add(element); }
    for (const element of observed) if (!targets.includes(element)) { resize?.unobserve(element); observed.delete(element); }
    if (open() || closing()) return;
    const previousFocus = focusedButton;
    const shouldRecover = previousFocus && (structureChanged || !previousFocus.isConnected || previousFocus.disabled) &&
      (actions.ownerDocument.activeElement === actions.ownerDocument.body || actions.ownerDocument.activeElement === previousFocus);
    structureChanged = false;
    const width = (element: Element) => Number.parseFloat(getComputedStyle(element).width) || 0;
    const style = getComputedStyle(actions);
    const available = Math.max(0, width(actions) - (Number.parseFloat(style.paddingInlineStart) || 0) - (Number.parseFloat(style.paddingInlineEnd) || 0));
    let count = fitToolbarGroups(measured.map(width), available, width(trigger), Number.parseFloat(style.columnGap) || 0).visibleCount;
    const focused = actions.ownerDocument.activeElement;
    if (overflow.contains(focused) && count > visible()) count = visible();
    const losingFocus = elements.some((element, index) => index >= count && element.contains(focused));
    setVisible(count);
    if (losingFocus) overflow.querySelector("button")?.focus({ preventScroll: true });
    else if (shouldRecover && previousFocus) {
      const entries = buttons();
      const index = focusOrder.indexOf(previousFocus);
      const next = entries.includes(previousFocus) ? previousFocus :
        [...focusOrder.slice(index + 1), ...focusOrder.slice(0, Math.max(0, index)).reverse()].find(button => entries.includes(button)) ?? entries[0];
      (next ?? actions).focus({ preventScroll: true });
    }
    syncFocus();
    if (focusedButton === actions.ownerDocument.activeElement) focusOrder = buttons();
  };
  const schedule = () => { if (!disposed && frame === undefined) frame = actions?.ownerDocument.defaultView?.requestAnimationFrame(measure); };
  createEffect(() => { groups(); open(); closing(); schedule(); });
  createEffect(() => {
    if (open() && !hasOverflow()) {
      recoverEmptyOverflow = ownsMenuFocus() || actions?.ownerDocument.activeElement === actions?.ownerDocument.body;
      setClosing(true);
      setOpen(false);
    }
  });
  onMount(() => {
    resize = new ResizeObserver(schedule);
    const document = actions?.ownerDocument;
    const trackFocus = () => {
      const active = document?.activeElement;
      if (active !== document?.body && !ownsMenuFocus()) recoverEmptyOverflow = false;
      if (active instanceof HTMLButtonElement && actions?.contains(active)) { focusedButton = active; focusOrder = buttons(); }
      else focusedButton = undefined;
    };
    const outsidePointer = (event: PointerEvent) => { if (event.target instanceof Node && !actions?.contains(event.target)) { focusedButton = undefined; recoverEmptyOverflow = false; } };
    document?.addEventListener("focusin", trackFocus);
    document?.addEventListener("pointerdown", outsidePointer, true);
    trackFocus();
    const mutations = new MutationObserver(records => {
      if (records.some(record => record.type === "childList" || record.attributeName === "disabled")) structureChanged = true;
      schedule();
    });
    if (actions) mutations.observe(actions, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "disabled"] });
    measure();
    onCleanup(() => { resize?.disconnect(); mutations.disconnect(); document?.removeEventListener("focusin", trackFocus); document?.removeEventListener("pointerdown", outsidePointer, true); });
  });
  onCleanup(() => { disposed = true; if (frame !== undefined) actions?.ownerDocument.defaultView?.cancelAnimationFrame(frame); });
  const menuItems = createMemo<MenuItem[]>(() => [...groups().values()].slice(visible()).flatMap((group, index) => [
    ...(index ? [{ kind: "separator", id: JSON.stringify(["separator", group.id]) } satisfies MenuItem] : []),
    ...group.items.map(item => ({ ...item, id: JSON.stringify(["item", group.id, item.id]) })),
  ]));
  const keydown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !(event.target instanceof HTMLButtonElement)) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const entries = buttons();
    const index = entries.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const direction = theme.state().direction === "rtl" ? -1 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : (index + (event.key === "ArrowRight" ? direction : -direction) + entries.length) % entries.length;
    entries[next]?.focus({ preventScroll: true });
  };
  return <div {...others} class={`sheen-toolbar ${local.class ?? ""}`}>
    <div ref={actions} role="toolbar" aria-label={local.label} tabIndex={-1} class="sheen-toolbar-actions" onKeyDown={keydown} onFocusIn={syncFocus} onFocusOut={schedule}>
      <For each={[...groups().keys()]}>{(id, index) => <Show when={groups().get(id)}>{group =>
        <div role="group" aria-label={group().label} class="sheen-toolbar-group" data-overflow={index() >= visible()} inert={index() >= visible()} aria-hidden={index() >= visible() || undefined}><div class="sheen-toolbar-group-content"><GroupButtons group={group()} /></div></div>
      }</Show>}</For>
      <div ref={overflow} class="sheen-toolbar-overflow" data-overflow={!hasOverflow()} inert={!hasOverflow()} aria-hidden={!hasOverflow() || undefined}>
        <DropdownMenu trigger={theme.messages().moreActions} items={menuItems()} open={open()}
          onOpenChange={next => { if (!next && open()) setClosing(true); setOpen(next); }}
          onCloseAutoFocus={event => {
            if (disposed) return;
            if (!hasOverflow()) {
              event.preventDefault();
              if (recoverEmptyOverflow && (ownsMenuFocus() || actions?.ownerDocument.activeElement === actions?.ownerDocument.body)) (buttons()[0] ?? actions)?.focus({ preventScroll: true });
            }
            recoverEmptyOverflow = false;
            setClosing(false);
          }} disabled={!hasOverflow()} />
      </div>
    </div>
    <Show when={filter()}><div class="sheen-toolbar-filter">{filter()}</div></Show>
  </div>;
}
