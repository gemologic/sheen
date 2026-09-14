import { createContext, createEffect, onCleanup, onMount, useContext } from "solid-js";
import type { Accessor } from "solid-js";
import type { RouterAdapter } from "./router.ts";
import { createPanePositionCache } from "./pane-position-cache.ts";

export interface PaneRestorationOptions {
  /** False while route content is incomplete. Ready content settles at a clamped offset. Defaults to true. */
  readonly ready?: Accessor<boolean>;
}
export interface PaneRestoration {
  attach: (id: string, element: Accessor<HTMLElement | undefined>, options?: PaneRestorationOptions) => void;
}
export const PaneRestorationContext = createContext<PaneRestoration>();

export function createPaneRestoration(router: Accessor<RouterAdapter | undefined>): PaneRestoration & { project: (pane: HTMLElement) => boolean } {
  const positions = createPanePositionCache();
  const owners = new Set<string>();
  const projections = new WeakMap<HTMLElement, () => void>();
  return { project(pane) {
    const restore = projections.get(pane);
    if (!restore) return false;
    restore();
    return true;
  }, attach(id, element, options = {}) {
    if (!id.trim()) throw new Error("Scroll restoration requires a nonempty pane ID");
    if (owners.has(id)) throw new Error(`Duplicate scroll restoration pane: ${id}`);
    owners.add(id);
    onCleanup(() => owners.delete(id));
    onMount(() => {
      let first = true;
      createEffect(() => {
        const viewport = element();
        const adapter = router();
        if (!viewport || !adapter) return;
        const location = adapter.location();
        const document = viewport.ownerDocument;
        const isDocument = viewport === document.scrollingElement;
        const key = JSON.stringify([location.entryKey ?? null, location.pathname, location.search, location.hash, isDocument]);
        const view = viewport.ownerDocument.defaultView;
        if (!view) return;
        const saved = positions.get(key, id);
        const preserveInitial = first && saved === undefined;
        let target = saved ?? (first ? { top: viewport.scrollTop, left: viewport.scrollLeft } : { top: 0, left: 0 });
        first = false;
        let restoring = !preserveInitial;
        let frame: number | undefined;
        // Layout can clamp the old viewport before its media-query change callback runs.
        const visible = () => viewport.isConnected && viewport.getClientRects().length > 0;
        const save = () => { if (!restoring && element() === viewport && visible()) positions.set(key, id, { top: viewport.scrollTop, left: viewport.scrollLeft }); };
        if (preserveInitial) save();
        // Scroll events can trail a history attempt. Capture the still-current pane before routing.
        const unregister = adapter.block(save);
        const restore = () => {
          frame = undefined;
          if (!restoring || !visible()) return;
          viewport.scrollTop = target.top;
          viewport.scrollLeft = target.left;
          if (options.ready?.() !== false || (Math.abs(viewport.scrollTop - target.top) < 1 && Math.abs(viewport.scrollLeft - target.left) < 1)) {
            restoring = false;
            resize.disconnect();
            save();
          }
        };
        const schedule = () => { if (restoring && frame === undefined) frame = view.requestAnimationFrame(restore); };
        const interrupt = () => { restoring = false; resize.disconnect(); save(); };
        const keydown = (event: Event) => {
          if ("key" in event && typeof event.key === "string" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) interrupt();
        };
        const events = isDocument ? document : viewport;
        events.addEventListener("scroll", save);
        events.addEventListener("wheel", interrupt, { passive: true });
        events.addEventListener("pointerdown", interrupt);
        events.addEventListener("keydown", keydown);
        const resize = new ResizeObserver(schedule);
        const observe = () => {
          resize.observe(viewport);
          const content = isDocument ? document.body : viewport.firstElementChild;
          if (content) resize.observe(content);
        };
        if (restoring) {
          observe();
          schedule();
        }
        projections.set(viewport, () => {
          if (frame !== undefined) view.cancelAnimationFrame(frame);
          if (!restoring) target = positions.get(key, id) ?? target;
          restoring = true;
          observe();
          restore();
        });
        createEffect(() => { options.ready?.(); schedule(); });
        onCleanup(() => {
          // Capture late scroll events even when traversal omits the router's before-navigation notification.
          save();
          projections.delete(viewport);
          unregister();
          if (frame !== undefined) view.cancelAnimationFrame(frame);
          resize.disconnect();
          events.removeEventListener("scroll", save);
          events.removeEventListener("wheel", interrupt);
          events.removeEventListener("pointerdown", interrupt);
          events.removeEventListener("keydown", keydown);
        });
      });
    });
  } };
}

/** Register a stable pane ID beneath a persistent AppShell. Main content is registered automatically. */
export function usePaneScrollRestoration(id: string, element: Accessor<HTMLElement | undefined>, options?: PaneRestorationOptions): void {
  const context = useContext(PaneRestorationContext);
  if (!context) throw new Error("usePaneScrollRestoration requires AppShell");
  context.attach(id, element, options);
}
