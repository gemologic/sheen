import { onCleanup, onMount } from "solid-js";

/** Retained sidebar panes outlive the desktop/modal containers that display them. */
export function createSidebarScrollRetention(restoreManagedPane: (pane: HTMLElement) => boolean): (container: HTMLElement) => void {
  const positions = new WeakMap<HTMLElement, { top: number; left: number }>();
  return container => {
    onMount(() => {
      for (const pane of container.querySelectorAll<HTMLElement>(".sheen-scroll-area")) {
        if (restoreManagedPane(pane)) continue;
        const position = positions.get(pane);
        if (position) {
          pane.scrollTop = position.top;
          pane.scrollLeft = position.left;
        }
        if (pane.getClientRects().length) positions.set(pane, { top: pane.scrollTop, left: pane.scrollLeft });
      }
      const save = (event: Event) => {
        const pane = event.target;
        // Hiding or detaching an ancestor can emit a zero-offset scroll event.
        if (!(pane instanceof HTMLElement) || !pane.matches(".sheen-scroll-area") || !pane.getClientRects().length) return;
        positions.set(pane, { top: pane.scrollTop, left: pane.scrollLeft });
      };
      container.addEventListener("scroll", save, true);
      onCleanup(() => container.removeEventListener("scroll", save, true));
    });
  };
}
