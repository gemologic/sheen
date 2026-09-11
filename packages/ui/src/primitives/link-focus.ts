import { onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";

export function createLinkFocusRecovery(root: Accessor<HTMLElement | undefined>): void {
  onMount(() => {
    const element = root();
    if (!element) return;
    const links = () => [...element.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(link => link.closest("nav") === element);
    let previous = links();
    let focused: HTMLAnchorElement | undefined;
    const recordFocus = () => {
      const active = element.ownerDocument.activeElement;
      focused = active instanceof HTMLAnchorElement && active.closest("nav") === element ? active : undefined;
    };
    recordFocus();
    element.ownerDocument.addEventListener("focusin", recordFocus);
    const observer = new MutationObserver(() => {
      const next = links();
      const active = element.ownerDocument.activeElement;
      if (element.isConnected && focused && active === element.ownerDocument.body) {
        const eligible = (link: HTMLAnchorElement) => link.isConnected && link.hasAttribute("href") && !link.closest("[inert], [hidden]") && link.getClientRects().length > 0;
        const retained = next.includes(focused) && eligible(focused) ? focused : undefined;
        const previousIndex = previous.indexOf(focused);
        if (previousIndex >= 0) {
          const index = Math.min(previousIndex, next.length);
          const nearest = next.slice(index).find(eligible) ?? next.slice(0, index).reverse().find(eligible);
          (retained ?? nearest ?? element).focus({ preventScroll: true });
        }
      }
      previous = next;
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "hidden", "inert"] });
    onCleanup(() => {
      observer.disconnect();
      element.ownerDocument.removeEventListener("focusin", recordFocus);
    });
  });
}
