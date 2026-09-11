import { onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";

/** Survives removal of an entire nested NavList, whose local recovery owner is disposed. */
export function createSidebarFocusRecovery(root: Accessor<HTMLElement | undefined>): void {
  onMount(() => {
    const element = root();
    if (!element) return;
    const controls = () => [...element.querySelectorAll<HTMLElement>("a[href], button")];
    const eligible = (control: HTMLElement) => control.isConnected && !control.closest("[inert], [hidden]") && !control.hasAttribute("disabled") && control.getClientRects().length > 0;
    let previous = controls();
    let focused: HTMLElement | undefined;
    const record = () => {
      const active = element.ownerDocument.activeElement;
      focused = active instanceof HTMLElement && controls().includes(active) ? active : undefined;
    };
    record();
    element.ownerDocument.addEventListener("focusin", record);
    const observer = new MutationObserver(() => {
      const next = controls();
      const active = element.ownerDocument.activeElement;
      if (element.isConnected && focused && (active === element.ownerDocument.body || (active === focused && !eligible(focused)))) {
        const index = previous.indexOf(focused);
        const survives = (control: HTMLElement) => next.includes(control) && eligible(control);
        const target = survives(focused) ? focused : previous.slice(index + 1).find(survives)
          ?? previous.slice(0, index).reverse().find(survives) ?? next.find(eligible) ?? element;
        target.focus({ preventScroll: true });
      }
      previous = next;
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "disabled", "inert", "hidden", "data-collapsed"] });
    onCleanup(() => { observer.disconnect(); element.ownerDocument.removeEventListener("focusin", record); });
  });
}
