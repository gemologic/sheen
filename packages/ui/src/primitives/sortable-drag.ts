import { autoScrollForElements, autoScrollWindowForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements, monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

/** The only module that touches the pointer drag engine. Components bind on mount, so server markup never depends on it. */

export type DragData = Readonly<Record<string | symbol, unknown>>;

export interface DraggableBinding {
  readonly element: HTMLElement;
  readonly handle?: HTMLElement | undefined;
  readonly data: () => Record<string, unknown>;
  readonly canDrag: () => boolean;
  readonly onStart: () => void;
  readonly onEnd: () => void;
}

export function bindDraggable(binding: DraggableBinding): () => void {
  return draggable({
    element: binding.element,
    ...(binding.handle ? { dragHandle: binding.handle } : {}),
    canDrag: () => binding.canDrag(),
    getInitialData: () => binding.data(),
    // The browser snapshots the source during dragstart, so the lifted look exists only for that capture.
    onGenerateDragPreview: () => { binding.element.dataset.dragPreview = ""; },
    onDragStart: () => { delete binding.element.dataset.dragPreview; binding.onStart(); },
    onDrop: () => { delete binding.element.dataset.dragPreview; binding.onEnd(); },
  });
}

export interface DropTargetBinding {
  readonly element: HTMLElement;
  readonly accepts: (source: DragData) => boolean;
  readonly data: (input: { readonly clientX: number; readonly clientY: number }, source: DragData) => Record<string, unknown>;
}

export function bindDropTarget(binding: DropTargetBinding): () => void {
  return dropTargetForElements({
    element: binding.element,
    canDrop: ({ source }) => binding.accepts(source.data),
    getData: ({ input, source }) => binding.data(input, source.data),
  });
}

export interface MonitorBinding {
  readonly accepts: (source: DragData) => boolean;
  /** Innermost accepting target, or undefined while the pointer is outside every target. */
  readonly onDrag: (source: DragData, target: DragData | undefined) => void;
  readonly onDrop: (source: DragData, target: DragData | undefined) => void;
  /** Scroll containers that follow the pointer near their edges, resolved when each drag starts. */
  readonly scrollers: () => Iterable<HTMLElement>;
}

export function bindMonitor(binding: MonitorBinding): () => void {
  let scrolling: (() => void) | undefined;
  const stopScrolling = () => { scrolling?.(); scrolling = undefined; };
  const cleanup = monitorForElements({
    canMonitor: ({ source }) => binding.accepts(source.data),
    onDragStart: ({ source, location }) => {
      stopScrolling();
      scrolling = combine(
        ...[...new Set(binding.scrollers())].map(element => autoScrollForElements({ element, getAllowedAxis: () => "all" })),
        autoScrollWindowForElements(),
      );
      binding.onDrag(source.data, location.current.dropTargets[0]?.data);
    },
    onDrag: ({ source, location }) => binding.onDrag(source.data, location.current.dropTargets[0]?.data),
    onDropTargetChange: ({ source, location }) => binding.onDrag(source.data, location.current.dropTargets[0]?.data),
    onDrop: ({ source, location }) => {
      stopScrolling();
      binding.onDrop(source.data, location.current.dropTargets[0]?.data);
    },
  });
  return () => { stopScrolling(); cleanup(); };
}
