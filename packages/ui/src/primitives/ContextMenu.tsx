import { MenuContent, MenuPortal, MenuRoot } from "#sheen-kobalte/menu";
import { Polymorphic } from "#sheen-kobalte/polymorphic";
import { Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { MenuItems, validateMenuTree } from "./DropdownMenu.tsx";
import type { MenuItem } from "./DropdownMenu.tsx";
import { createMenuFocusRecovery } from "./menu-focus.ts";
import { useShortcutKeyboardOwner } from "./ShortcutProvider.tsx";

interface ContextMenuOptions {
  /** Shared menu model. An empty collection leaves the native browser menu available. */
  readonly items: readonly MenuItem[];
  readonly disabled?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly menuClass?: string;
}

export interface ContextMenuProps extends ContextMenuOptions, JSX.HTMLAttributes<HTMLElement> {
  /** Supported native trigger semantics. */
  readonly as?: "div" | "tr" | "li";
}

function callHandler(handler: unknown, event: MouseEvent): void {
  if (typeof handler === "function") handler(event);
  else if (Array.isArray(handler) && typeof handler[0] === "function") handler[0](handler[1], event);
}

/** A pointer/keyboard context menu whose trigger stays the requested native element. */
export function ContextMenu(props: ContextMenuProps): JSX.Element {
  const theme = useTheme();
  const id = createUniqueId();
  const [local, triggerProps] = splitProps(props, ["as", "items", "disabled", "onOpenChange", "menuClass", "children"]);
  const items = createMemo(() => {
    validateMenuTree(local.items);
    return local.items;
  });
  const unavailable = () => local.disabled === true || items().length === 0;
  const [open, setOpen] = createSignal(false);
  const [anchor, setAnchor] = createSignal({ x: 0, y: 0 });
  const change = (next: boolean): void => {
    if (next === open() || (next && unavailable())) return;
    setOpen(next);
    local.onOpenChange?.(next);
  };
  const [content, setContent] = createSignal<HTMLElement>();
  useShortcutKeyboardOwner(content, open);
  createMenuFocusRecovery(content, open);
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(id) : previous ?? 100);
  const triggerId = () => triggerProps.id ?? `${id}-trigger`;
  function restoreTriggerFocus(): void {
    queueMicrotask(() => {
      const trigger = document.getElementById(triggerId());
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    });
  }
  createEffect(() => {
    if (!open()) return;
    const listener = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && theme.layers.isTop(id)) restoreTriggerFocus();
    };
    document.addEventListener("keydown", listener, true);
    onCleanup(() => document.removeEventListener("keydown", listener, true));
  });
  return <MenuRoot id={id} open={open()} onOpenChange={change} getAnchorRect={anchor} modal={false} gutter={2} shift={2} placement={theme.state().direction === "rtl" ? "left-start" : "right-start"}>
    <Polymorphic as={local.as ?? "div"} {...triggerProps} id={triggerId()} aria-haspopup={unavailable() ? undefined : "menu"} aria-expanded={local.as === "tr" || unavailable() ? undefined : open()}
      onContextMenu={(event: MouseEvent) => {
        callHandler(triggerProps.onContextMenu, event);
        if (event.defaultPrevented || unavailable()) return;
        event.preventDefault();
        event.stopPropagation();
        const current = event.currentTarget;
        const bounds = current instanceof Element ? current.getBoundingClientRect() : undefined;
        setAnchor(event.clientX || event.clientY || !bounds ? { x: event.clientX, y: event.clientY } : { x: bounds.x, y: bounds.bottom });
        change(true);
      }}>{local.children}</Polymorphic>
    <Show when={unavailable() ? undefined : theme.portal()}>{target => <MenuPortal mount={target()}>
      <MenuContent ref={setContent} class={cn("sheen-menu", local.menuClass)} data-kb-top-layer="true" aria-hidden={!open() || undefined} inert={!open()} style={{ "z-index": layer() }}
        onCloseAutoFocus={() => queueMicrotask(() => {
          const trigger = document.getElementById(triggerId());
          const active = document.activeElement;
          if (trigger instanceof HTMLElement && trigger.isConnected && (active === document.body || active === null || (content()?.contains(active) ?? false))) trigger.focus({ preventScroll: true });
        })}
        onKeyDown={event => {
          if (!event.defaultPrevented && event.key === "Escape" && open() && theme.layers.isTop(id)) {
            event.preventDefault();
            change(false);
          }
        }}
        onEscapeKeyDown={event => {
          if (!theme.layers.isTop(id)) event.preventDefault();
          else restoreTriggerFocus();
        }}>
        <MenuItems items={items()} />
      </MenuContent>
    </MenuPortal>}</Show>
  </MenuRoot>;
}
