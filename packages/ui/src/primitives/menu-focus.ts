import { createEffect, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

/** Restore only focus lost by mutations within this menu, never another layer's focus. */
export function createMenuFocusRecovery(root: Accessor<HTMLElement | undefined>, open: Accessor<boolean>): void {
  createEffect(() => {
    const element = root();
    if (!element || !open()) return;
    const document = element.ownerDocument;
    const items = () => Array.from(element.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'))
      .filter(item => item.closest('[role="menu"]') === element && item.getAttribute("aria-disabled") !== "true" && !item.closest("[inert]"));
    let focused: HTMLElement | undefined;
    let order: HTMLElement[] = [];
    const track = () => {
      const active = document.activeElement;
      const entries = items();
      if (active instanceof HTMLElement && entries.includes(active)) { focused = active; order = entries; }
      else if (!(active === element && focused && (!focused.isConnected || focused.getAttribute("aria-disabled") === "true"))) focused = undefined;
    };
    const outsidePointer = (event: PointerEvent) => { if (event.target instanceof Node && !element.contains(event.target)) focused = undefined; };
    document.addEventListener("focusin", track);
    document.addEventListener("pointerdown", outsidePointer, true);
    track();
    const observer = new MutationObserver(() => {
      if (!open() || !element.isConnected || !focused) return;
      const active = document.activeElement;
      if (active !== focused && active !== element && active !== document.body) return;
      const entries = items();
      const previous = focused;
      const index = order.indexOf(previous);
      const next = entries.includes(previous) ? previous :
        [...order.slice(index + 1), ...order.slice(0, Math.max(0, index)).reverse()].find(item => entries.includes(item)) ?? entries[0];
      (next ?? element).focus({ preventScroll: true });
      order = entries;
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-disabled", "disabled"] });
    onCleanup(() => {
      observer.disconnect();
      document.removeEventListener("focusin", track);
      document.removeEventListener("pointerdown", outsidePointer, true);
    });
  });
}
