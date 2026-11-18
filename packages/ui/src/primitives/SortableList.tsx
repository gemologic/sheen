import { For, Show, batch, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { useNumberFormatter } from "../theme/intl.ts";
import { cn } from "../utils/cn.ts";
import { closestEdge, dropIndex, edgeField, formatMessage, isRtl, keyIntent, moveId, resolveSortableMessages, scrollContainers, stringField, validateIds } from "./sortable-core.ts";
import type { SortableEdge, SortableItem, SortableMessages, SortableOrientation, SortableReorder } from "./sortable-core.ts";
import { bindDraggable, bindDropTarget, bindMonitor } from "./sortable-drag.ts";
import type { DragData } from "./sortable-drag.ts";
import { Glyph } from "./Glyph.tsx";

export type SortableListProps<Item extends SortableItem> = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "ref" | "onDrop"> & {
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  /** Owner-ordered items with stable, unique ids. Item nodes are keyed by id and survive refreshes and reorders. */
  items: readonly Item[];
  children: (item: Accessor<Item>, index: Accessor<number>) => JSX.Element;
  /** Proposes a new order. The list is controlled: nothing moves until the owner passes reordered items back. */
  onReorder: (reorder: SortableReorder) => void;
  /** Accessible name for the list. */
  label: string;
  orientation?: SortableOrientation;
  /** Render a grip button that owns pointer and keyboard dragging. Without it the whole item drags and takes focus. */
  handle?: boolean;
  disabled?: boolean;
  messages?: Partial<SortableMessages>;
};

interface Lift { readonly id: string; readonly origin: number; readonly target: number }
interface DropIndicator { readonly id: string; readonly edge: SortableEdge }

function sameIndicator(first: DropIndicator | undefined, second: DropIndicator | undefined): boolean {
  return first?.id === second?.id && first?.edge === second?.edge;
}

/** A controlled reorderable list with pointer dragging, auto-scroll, and an announced keyboard model. */
export function SortableList<Item extends SortableItem>(props: SortableListProps<Item>): JSX.Element {
  const theme = useTheme();
  const formatter = useNumberFormatter();
  const generatedId = createUniqueId();
  const instance = Symbol("SortableList");
  const [local, others] = splitProps(props, ["ref", "class", "items", "children", "onReorder", "label", "orientation", "handle", "disabled", "messages", "aria-describedby"]);
  const messages = createMemo(() => resolveSortableMessages(theme.messages(), local.messages));
  const index = createMemo(() => {
    validateIds(local.items.map(item => item.id), "SortableList");
    return new Map(local.items.map(item => [item.id, item]));
  });
  const owned = createMemo(() => [...index().keys()]);
  const [lift, setLift] = createSignal<Lift>();
  const [indicator, setIndicator] = createSignal<DropIndicator>();
  const [dragging, setDragging] = createSignal<string>();
  const [announcement, setAnnouncement] = createSignal("");
  // A refresh that removes the lifted item ends the lift; the remaining order is the owner's.
  const activeLift = createMemo(() => {
    const current = lift();
    return current && index().has(current.id) ? current : undefined;
  });
  const ids = createMemo(() => {
    const current = activeLift();
    return current ? moveId(owned(), current.id, current.target) : owned();
  });
  const orientation = () => local.orientation ?? "vertical";
  const instructionsId = `${generatedId}-instructions`;
  let root: HTMLDivElement | undefined;
  let relocating = false;
  let disposed = false;
  onCleanup(() => { disposed = true; });

  const itemDisabled = (id: string) => Boolean(local.disabled || index().get(id)?.disabled);
  const accepts = (source: DragData) => source.sortableInstance === instance;
  const keyboardTarget = (id: string): HTMLElement | undefined => {
    const item = [...root?.querySelectorAll<HTMLElement>(".sheen-sortable-item") ?? []].find(element => element.dataset.sortableId === id);
    return local.handle ? item?.querySelector<HTMLElement>(".sheen-sortable-handle") ?? undefined : item;
  };
  const announce = (template: string, id: string, position: number) => {
    const values = { label: index().get(id)?.label ?? id, position: formatter().format(position + 1), count: formatter().format(ids().length) };
    setAnnouncement("");
    queueMicrotask(() => { if (!disposed) setAnnouncement(formatMessage(template, values)); });
  };
  // Reordering moves the focused node in the DOM, which blurs it; restore focus without treating that blur as leaving.
  const relocate = (id: string, update: () => void) => {
    relocating = true;
    try { update(); }
    finally {
      const target = keyboardTarget(id);
      if (target && target.ownerDocument.activeElement !== target) target.focus();
      relocating = false;
    }
  };
  const propose = (id: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0) return;
    local.onReorder({ id, fromIndex, toIndex, ids: moveId(owned(), id, toIndex) });
  };
  const cancel = () => {
    const current = activeLift();
    setLift(undefined);
    if (current) announce(messages().sortableCancelled, current.id, current.origin);
  };
  const onKeyDown = (id: string, event: KeyboardEvent, element: HTMLElement) => {
    if (event.target !== element || event.altKey || event.ctrlKey || event.metaKey) return;
    const intent = keyIntent(event.key, isRtl(element));
    const current = activeLift();
    if (!intent) return;
    if (!current) {
      if (intent.kind !== "toggle" || itemDisabled(id)) return;
      event.preventDefault();
      const origin = owned().indexOf(id);
      setLift({ id, origin, target: origin });
      announce(messages().sortableLifted, id, origin);
      return;
    }
    if (current.id !== id) return;
    event.preventDefault();
    if (intent.kind === "toggle") {
      relocate(id, () => batch(() => { propose(id, current.origin, current.target); setLift(undefined); }));
      announce(messages().sortableDropped, id, current.target);
      return;
    }
    if (intent.kind === "cancel") { relocate(id, cancel); return; }
    if (intent.kind === "step" && intent.axis !== orientation()) return;
    const last = ids().length - 1;
    const target = intent.kind === "edge" ? (intent.to === "start" ? 0 : last) : Math.max(0, Math.min(last, current.target + intent.delta));
    if (target === current.target) return;
    relocate(id, () => setLift({ ...current, target }));
    announce(messages().sortableMoved, id, target);
  };
  const onFocusOut = (id: string, event: FocusEvent, element: HTMLElement) => {
    if (relocating || activeLift()?.id !== id) return;
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    cancel();
  };
  const resolveDrop = (source: DragData, target: DragData | undefined) => {
    const sourceId = stringField(source, "sortableId");
    const targetId = target ? stringField(target, "sortableId") : undefined;
    const edge = target ? edgeField(target) : undefined;
    if (!sourceId || !targetId || !edge) return undefined;
    const from = ids().indexOf(sourceId);
    return { sourceId, targetId, edge, from, to: dropIndex(from, ids().indexOf(targetId), edge) };
  };

  onMount(() => {
    if (!root) return;
    const element = root;
    onCleanup(bindMonitor({
      accepts,
      scrollers: () => scrollContainers(element),
      onDrag: (source, target) => {
        const drop = resolveDrop(source, target);
        const next = drop && drop.to !== drop.from ? { id: drop.targetId, edge: drop.edge } : undefined;
        if (!sameIndicator(indicator(), next)) setIndicator(next);
      },
      onDrop: (source, target) => {
        setIndicator(undefined);
        const drop = resolveDrop(source, target);
        if (!drop || drop.to === drop.from) return;
        propose(drop.sourceId, drop.from, drop.to);
        announce(messages().sortableDropped, drop.sourceId, drop.to);
      },
    }));
  });

  return <div {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-sortable", local.class)}
    data-orientation={orientation()} data-disabled={local.disabled ? "" : undefined} data-active={activeLift() || dragging() ? "" : undefined}>
    <ul class="sheen-sortable-list" role="list" aria-label={local.label} aria-describedby={[instructionsId, local["aria-describedby"]].filter(Boolean).join(" ")}>
      <For each={ids()}>{(id, position) => {
        const initial = index().get(id);
        if (!initial) throw new Error(`SortableList: missing item ${JSON.stringify(id)}`);
        let last = initial;
        const item = () => { const value = index().get(id); if (value) last = value; return last; };
        const disabled = () => itemDisabled(id);
        const lifted = () => activeLift()?.id === id;
        const ownKeys = () => !local.handle;
        let element: HTMLLIElement | undefined;
        let handle: HTMLButtonElement | undefined;
        createEffect(() => {
          if (!element) return;
          const target = element;
          const dragHandle = local.handle ? handle : undefined;
          const release = [
            bindDraggable({
              element: target, handle: dragHandle, canDrag: () => !disabled() && !activeLift(),
              data: () => ({ sortableInstance: instance, sortableId: id }),
              onStart: () => setDragging(id), onEnd: () => setDragging(undefined),
            }),
            bindDropTarget({ element: target, accepts, data: input => ({ sortableId: id, edge: closestEdge(target, input, orientation()) }) }),
          ];
          onCleanup(() => { for (const cleanup of release) cleanup(); });
        });
        return <li ref={element} class="sheen-sortable-item" data-sortable-id={id}
          data-disabled={disabled() ? "" : undefined} data-lifted={lifted() ? "" : undefined} data-dragging={dragging() === id ? "" : undefined}
          data-drop-edge={indicator()?.id === id ? indicator()?.edge : undefined}
          tabindex={ownKeys() && !disabled() ? 0 : undefined} aria-describedby={ownKeys() ? instructionsId : undefined} aria-disabled={ownKeys() && disabled() ? "true" : undefined}
          onKeyDown={event => { if (ownKeys()) onKeyDown(id, event, event.currentTarget); }}
          onFocusOut={event => { if (ownKeys()) onFocusOut(id, event, event.currentTarget); }}>
          <Show when={local.handle}>
            <button ref={handle} type="button" class="sheen-sortable-handle" aria-label={formatMessage(messages().sortableHandle, { label: item().label })} aria-describedby={instructionsId}
              aria-pressed={lifted() ? "true" : "false"} disabled={disabled()}
              onKeyDown={event => onKeyDown(id, event, event.currentTarget)} onFocusOut={event => onFocusOut(id, event, event.currentTarget)}>
              <Glyph class="sheen-sortable-grip" name="grip" />
            </button>
          </Show>
          <div class="sheen-sortable-content">{local.children(item, position)}</div>
        </li>;
      }}</For>
    </ul>
    <span id={instructionsId} class="sheen-sortable-hidden">{messages().sortableInstructions}</span>
    <span class="sheen-sortable-hidden" role="status" aria-live="assertive" aria-atomic="true">{announcement()}</span>
  </div>;
}
