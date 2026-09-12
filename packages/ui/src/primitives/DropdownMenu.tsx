import * as Primitive from "#sheen-kobalte/dropdown-menu";
import { useMenuContext } from "#sheen-kobalte/menu";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { Kbd } from "./Typography.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { createMenuFocusRecovery } from "./menu-focus.ts";
import { useShortcutKeyboardOwner } from "./ShortcutProvider.tsx";

interface MenuLabel {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
  /** Lazy decorative visual displayed before the label. The text label remains the accessible name. */
  readonly icon?: () => JSX.Element;
}
export interface MenuAction extends MenuLabel {
  readonly kind: "action";
  readonly onSelect: () => void;
  readonly shortcut?: string;
}
export interface MenuCheckbox extends MenuLabel {
  readonly kind: "checkbox";
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  readonly shortcut?: string;
}
export type MenuRadioOption = MenuLabel;
export interface MenuRadioGroup {
  readonly kind: "radio";
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly MenuRadioOption[];
}
export interface MenuSubmenu extends MenuLabel {
  readonly kind: "submenu";
  readonly items: readonly MenuItem[];
}
export interface MenuSeparator {
  readonly kind: "separator";
  readonly id: string;
}
export type MenuItem = MenuAction | MenuCheckbox | MenuRadioGroup | MenuSubmenu | MenuSeparator;
export type DropdownMenuPlacement = "top-start" | "top-end" | "bottom-start" | "bottom-end";
export interface DropdownMenuProps {
  trigger: JSX.Element;
  triggerLabel?: string;
  items: readonly MenuItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  disabled?: boolean;
  placement?: DropdownMenuPlacement;
  /** Size the root menu to its trigger, capped by the available viewport width. */
  matchTriggerWidth?: boolean;
  class?: string;
}

function indexItems<T extends { readonly id: string }>(items: readonly T[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    if (!item.id.trim()) throw new Error("DropdownMenu: item IDs must be nonempty");
    if (result.has(item.id)) throw new Error(`DropdownMenu: duplicate sibling ID ${JSON.stringify(item.id)}`);
    result.set(item.id, item);
  }
  return result;
}

export function validateMenuTree(items: readonly MenuItem[], ancestors = new Set<readonly MenuItem[]>()): void {
  if (ancestors.has(items)) throw new Error("DropdownMenu: cyclic submenu tree");
  ancestors.add(items);
  indexItems(items);
  for (const item of items) {
    if (item.kind !== "separator" && !item.label.trim()) throw new Error("DropdownMenu: labels must be nonempty");
    if (item.kind !== "separator" && "description" in item && item.description !== undefined && !item.description.trim()) throw new Error("DropdownMenu: descriptions must be nonempty when supplied");
    if (item.kind === "submenu") validateMenuTree(item.items, ancestors);
    if (item.kind === "radio") {
      indexItems(item.options);
      for (const option of item.options) {
        if (!option.label.trim()) throw new Error("DropdownMenu: labels must be nonempty");
        if (option.description !== undefined && !option.description.trim()) throw new Error("DropdownMenu: descriptions must be nonempty when supplied");
      }
    }
  }
  ancestors.delete(items);
}

function RadioItems(props: { group: MenuRadioGroup }): JSX.Element {
  const options = createMemo(() => indexItems(props.group.options));
  return <Primitive.RadioGroup aria-label={props.group.label} value={props.group.value} onChange={value => props.group.onValueChange(value)}>
    <div class="sheen-menu-label" aria-hidden="true">{props.group.label}</div>
    <For each={[...options().keys()]}>{id => <Show when={options().get(id)}>{option =>
      <Primitive.RadioItem class="sheen-menu-item" value={id} textValue={option().label} disabled={option().disabled ?? false} closeOnSelect={false}
        aria-label={option().description ? `${option().label}, ${option().description}` : undefined}>
        <span class="sheen-menu-indicator" aria-hidden="true"><Primitive.ItemIndicator>●</Primitive.ItemIndicator></span>
        <MenuItemIcon icon={option().icon} />
        <Primitive.ItemLabel><span class="sheen-menu-item-copy"><span>{option().label}</span><Show when={option().description}>{description => <small>{description()}</small>}</Show></span></Primitive.ItemLabel>
      </Primitive.RadioItem>
    }</Show>}</For>
  </Primitive.RadioGroup>;
}

function MenuItemIcon(props: { readonly icon: (() => JSX.Element) | undefined }): JSX.Element {
  return <Show when={props.icon}>{render => <span class="sheen-menu-item-icon" aria-hidden="true">{render()()}</span>}</Show>;
}

function Submenu(props: { item: MenuSubmenu }): JSX.Element {
  const theme = useTheme();
  const id = createUniqueId();
  const [open, setOpen] = createSignal(false);
  const [content, setContent] = createSignal<HTMLElement>();
  useShortcutKeyboardOwner(content, open);
  createMenuFocusRecovery(content, open);
  let trigger: HTMLDivElement | undefined;
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(id) : previous ?? 100);
  return <Primitive.Sub open={open()} onOpenChange={setOpen} gutter={4}>
    <Primitive.SubTrigger ref={trigger} class="sheen-menu-item" disabled={props.item.disabled ?? false} textValue={props.item.label}>
      <span class="sheen-menu-indicator" aria-hidden="true"><MenuItemIcon icon={props.item.icon} /></span>{props.item.label}<span class="sheen-menu-sub-arrow" dir="ltr" data-direction={theme.state().direction} aria-hidden="true">›</span>
    </Primitive.SubTrigger>
    <Show when={theme.portal()}>{target => <Primitive.Portal mount={target()}>
      <Primitive.SubContent ref={setContent} class="sheen-menu" data-kb-top-layer="true" aria-hidden={!open() || undefined} inert={!open()} style={{ "z-index": layer() }}
        onKeyDown={event => {
          if (!event.defaultPrevented && event.key === "Escape" && open() && theme.layers.isTop(id)) {
            event.preventDefault();
            trigger?.focus({ preventScroll: true });
            setOpen(false);
          }
        }}
        onEscapeKeyDown={event => {
          if (event.defaultPrevented) return;
          const top = theme.layers.isTop(id);
          event.preventDefault();
          if (top) { trigger?.focus({ preventScroll: true }); setOpen(false); }
        }}>
        <MenuItems items={props.item.items} />
      </Primitive.SubContent>
    </Primitive.Portal>}</Show>
  </Primitive.Sub>;
}

export function MenuItems(props: { items: readonly MenuItem[] }): JSX.Element {
  const items = createMemo(() => indexItems(props.items));
  return <For each={[...items().keys()]}>{id => {
    const action = () => { const item = items().get(id); return item?.kind === "action" ? item : undefined; };
    const checkbox = () => { const item = items().get(id); return item?.kind === "checkbox" ? item : undefined; };
    const radio = () => { const item = items().get(id); return item?.kind === "radio" ? item : undefined; };
    const submenu = () => { const item = items().get(id); return item?.kind === "submenu" ? item : undefined; };
    return <>
      <Show when={action()}>{item => <Primitive.Item class="sheen-menu-item" textValue={item().label} disabled={item().disabled ?? false} onSelect={() => item().onSelect()}>
        <span class="sheen-menu-indicator" aria-hidden="true"><MenuItemIcon icon={item().icon} /></span><Primitive.ItemLabel>{item().label}</Primitive.ItemLabel>
        <Show when={item().shortcut}>{shortcut => <Kbd class="sheen-menu-shortcut" aria-hidden="true">{shortcut()}</Kbd>}</Show>
      </Primitive.Item>}</Show>
      <Show when={checkbox()}>{item => <Primitive.CheckboxItem class="sheen-menu-item" textValue={item().label} disabled={item().disabled ?? false} checked={item().checked} onChange={checked => item().onCheckedChange(checked)} closeOnSelect={false}>
        <span class="sheen-menu-indicator" aria-hidden="true"><Primitive.ItemIndicator>✓</Primitive.ItemIndicator></span><MenuItemIcon icon={item().icon} /><Primitive.ItemLabel>{item().label}</Primitive.ItemLabel>
        <Show when={item().shortcut}>{shortcut => <Kbd class="sheen-menu-shortcut" aria-hidden="true">{shortcut()}</Kbd>}</Show>
      </Primitive.CheckboxItem>}</Show>
      <Show when={radio()}>{item => <RadioItems group={item()} />}</Show>
      <Show when={submenu()}>{item => <Submenu item={item()} />}</Show>
      <Show when={items().get(id)?.kind === "separator"}><Primitive.Separator class="sheen-menu-separator" /></Show>
    </>;
  }}</For>;
}

function MenuTrigger(props: { children: JSX.Element; label: string | undefined; disabled: boolean; setTrigger: (element: HTMLButtonElement) => void }): JSX.Element {
  const menu = useMenuContext();
  return <Primitive.Trigger ref={props.setTrigger} as={Button} variant="outline" disabled={props.disabled} aria-label={props.label} data-sheen-menu-trigger=""
    onClick={event => {
      if (!props.disabled && (!event.currentTarget.dataset.pointerType || event.detail === 0)) {
        if (menu.isOpen()) menu.close();
        else menu.open("first");
      }
    }}>{props.children}</Primitive.Trigger>;
}

export function DropdownMenu(props: DropdownMenuProps): JSX.Element {
  const theme = useTheme();
  const id = createUniqueId();
  const items = createMemo(() => { validateMenuTree(props.items); return props.items; });
  const [draft, setDraft] = createSignal(props.defaultOpen ?? false);
  const open = () => props.open === undefined ? draft() : props.open;
  const [content, setContent] = createSignal<HTMLElement>();
  let trigger: HTMLButtonElement | undefined;
  useShortcutKeyboardOwner(content, open);
  createMenuFocusRecovery(content, open);
  const change = (next: boolean) => {
    if (next === open() || (next && props.disabled)) return;
    if (props.open === undefined) setDraft(next);
    props.onOpenChange?.(next);
  };
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(id) : previous ?? 100);
  const closeAutoFocus = (event: Event) => {
    props.onCloseAutoFocus?.(event);
    if (event.defaultPrevented) return;
    const active = trigger?.ownerDocument.activeElement;
    const body = trigger?.ownerDocument.body;
    const root = trigger?.ownerDocument.documentElement;
    if (active && active !== body && active !== root && active !== trigger && !content()?.contains(active)) event.preventDefault();
  };
  return <Primitive.Root open={open()} onOpenChange={change} modal={false} gutter={6} placement={props.placement ?? "bottom-start"}>
    <MenuTrigger label={props.triggerLabel} disabled={props.disabled ?? false} setTrigger={element => { trigger = element; }}>{props.trigger}</MenuTrigger>
    <Show when={theme.portal()}>{target => <Primitive.Portal mount={target()}>
      <Primitive.Content ref={setContent} class={cn("sheen-menu", props.class)} data-kb-top-layer="true" data-match-trigger-width={props.matchTriggerWidth || undefined} aria-hidden={!open() || undefined} inert={!open()} style={{ "z-index": layer() }}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={closeAutoFocus}
        onKeyDown={event => {
          if (!event.defaultPrevented && event.key === "Escape" && open() && theme.layers.isTop(id)) { event.preventDefault(); trigger?.focus({ preventScroll: true }); change(false); }
        }}
        onEscapeKeyDown={event => { if (!theme.layers.isTop(id)) event.preventDefault(); }}>
        <MenuItems items={items()} />
      </Primitive.Content>
    </Primitive.Portal>}</Show>
  </Primitive.Root>;
}
