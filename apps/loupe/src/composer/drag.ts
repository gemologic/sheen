import { autoScrollForElements, autoScrollWindowForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { ComposerDropMessage } from "./protocol.ts";
import { locationDestination } from "./protocol.ts";
import type { ComposerComponentName, ComposerDocument, ComposerRegionId } from "./model.ts";
import { composerComponentNames, composerRegionIds } from "./model.ts";
import { composerAllowedRegions } from "./catalog.ts";
import { findComposerNode, moveComposerNode } from "./editor.ts";

function sourceId(value: Readonly<Record<string | symbol, unknown>>): string | undefined {
  return typeof value.composerNodeId === "string" ? value.composerNodeId : undefined;
}

function nodeElements(root: HTMLElement): readonly HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-composer-node-id]")];
}

function componentName(value: Readonly<Record<string | symbol, unknown>>): ComposerComponentName | undefined {
  const name = value.composerComponent;
  return typeof name === "string" ? composerComponentNames.find(candidate => candidate === name) : undefined;
}

function regionId(value: string | undefined): ComposerRegionId | undefined {
  return value === undefined ? undefined : composerRegionIds.find(candidate => candidate === value);
}

function elementCanScroll(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(element);
  return style.overflowX === "auto" || style.overflowX === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll";
}

/** Lazy, preview-only pointer bindings. Keyboard and menu actions use editor.ts directly. */
export function bindComposerPreviewDrag(root: HTMLElement, document: () => ComposerDocument, onDrop: (message: ComposerDropMessage) => void): () => void {
  const registrations = new Map<HTMLElement, () => void>();
  const register = (element: HTMLElement): void => {
    if (registrations.has(element)) return;
    const id = element.dataset.composerNodeId;
    const handle = element.querySelector<HTMLElement>("[data-composer-drag-handle]");
    if (!id || !handle) return;
    element.dataset.composerDragReady = "true";
    const cleanup = combine(draggable({
      element,
      dragHandle: handle,
      getInitialData: () => ({ composerNodeId: id }),
      onDragStart: () => { element.dataset.dragging = "true"; },
      onDrop: () => { delete element.dataset.dragging; },
    }), dropTargetForElements({
      element,
      getData: () => ({ composerTargetId: id }),
      canDrop: ({ source }) => {
        const sourceNodeId = sourceId(source.data);
        const location = findComposerNode(document(), id);
        if (!sourceNodeId || !location || sourceNodeId === id) return false;
        try {
          moveComposerNode(document(), sourceNodeId, locationDestination(location));
          return true;
        } catch {
          return false;
        }
      },
      onDragEnter: () => { element.dataset.dragOver = "true"; },
      onDragLeave: () => { delete element.dataset.dragOver; },
      onDrop: event => {
        delete element.dataset.dragOver;
        if (event.location.current.dropTargets[0]?.element !== element) return;
        const sourceNodeId = sourceId(event.source.data);
        const location = findComposerNode(document(), id);
        if (!sourceNodeId || !location) return;
        onDrop({ kind: "sheen-composer-drop", sourceId: sourceNodeId, destination: locationDestination(location) });
      },
    }));
    registrations.set(element, cleanup);
  };
  const synchronize = (): void => {
    for (const [element, cleanup] of registrations) {
      if (element.isConnected && root.contains(element)) continue;
      cleanup();
      delete element.dataset.composerDragReady;
      registrations.delete(element);
    }
    for (const element of nodeElements(root)) register(element);
  };
  synchronize();
  const observer = new MutationObserver(synchronize);
  observer.observe(root, { childList: true, subtree: true });
  const scroller = root.querySelector<HTMLElement>(".sheen-shell-content.sheen-scroll-area") ?? root;
  const cleanupScroller = elementCanScroll(scroller)
    ? autoScrollForElements({ element: scroller, getAllowedAxis: () => "all" })
    : autoScrollWindowForElements({ getAllowedAxis: () => "all" });
  const cleanupMonitor = monitorForElements({ onDrop: () => {
    for (const element of nodeElements(root)) {
      delete element.dataset.dragOver;
      delete element.dataset.dragging;
    }
  } });
  return () => {
    observer.disconnect();
    cleanupScroller();
    cleanupMonitor();
    for (const [element, cleanup] of registrations) {
      cleanup();
      delete element.dataset.composerDragReady;
    }
    registrations.clear();
  };
}

export function bindComposerPaletteDrag(root: HTMLElement, targetsRoot: HTMLElement, onDrop: (component: ComposerComponentName, region: ComposerRegionId) => void, onActiveChange: (active: boolean) => void): () => void {
  const registrations = new Map<HTMLElement, () => void>();
  const registerPalette = (element: HTMLElement): void => {
    if (registrations.has(element)) return;
    const component = composerComponentNames.find(candidate => candidate === element.dataset.composerPaletteComponent);
    const handle = element.querySelector<HTMLElement>("[data-composer-palette-drag]");
    if (!component || !handle) return;
    element.dataset.composerDragReady = "true";
    registrations.set(element, draggable({
      element,
      dragHandle: handle,
      getInitialData: () => ({ composerComponent: component }),
      onDragStart: () => { element.dataset.dragging = "true"; onActiveChange(true); },
      onDrop: () => { delete element.dataset.dragging; onActiveChange(false); },
    }));
  };
  const registerTarget = (element: HTMLElement): void => {
    if (registrations.has(element)) return;
    const region = regionId(element.dataset.composerDropRegion);
    if (!region) return;
    registrations.set(element, dropTargetForElements({
      element,
      getData: () => ({ composerRegion: region }),
      canDrop: ({ source }) => {
        const component = componentName(source.data);
        return component !== undefined && composerAllowedRegions(component).includes(region);
      },
      onDragEnter: () => { element.dataset.dragOver = "true"; },
      onDragLeave: () => { delete element.dataset.dragOver; },
      onDrop: event => {
        delete element.dataset.dragOver;
        if (event.location.current.dropTargets[0]?.element !== element) return;
        const component = componentName(event.source.data);
        if (component) onDrop(component, region);
      },
    }));
  };
  const synchronize = (): void => {
    for (const [element, cleanup] of registrations) {
      if (element.isConnected && (root.contains(element) || targetsRoot.contains(element))) continue;
      cleanup();
      delete element.dataset.composerDragReady;
      registrations.delete(element);
    }
    for (const element of root.querySelectorAll<HTMLElement>("[data-composer-palette-component]")) registerPalette(element);
    for (const element of targetsRoot.querySelectorAll<HTMLElement>("[data-composer-drop-region]")) registerTarget(element);
  };
  synchronize();
  const paletteObserver = new MutationObserver(synchronize);
  paletteObserver.observe(root, { childList: true, subtree: true });
  const targetObserver = new MutationObserver(synchronize);
  targetObserver.observe(targetsRoot, { childList: true, subtree: true });
  const cleanupScroller = autoScrollWindowForElements({ getAllowedAxis: () => "vertical" });
  const cleanupMonitor = monitorForElements({ onDrop: () => {
    onActiveChange(false);
    for (const element of targetsRoot.querySelectorAll<HTMLElement>("[data-composer-drop-region]")) delete element.dataset.dragOver;
  } });
  return () => {
    paletteObserver.disconnect();
    targetObserver.disconnect();
    cleanupScroller();
    cleanupMonitor();
    for (const cleanup of registrations.values()) cleanup();
    for (const element of root.querySelectorAll<HTMLElement>("[data-composer-drag-ready]")) delete element.dataset.composerDragReady;
    registrations.clear();
  };
}
